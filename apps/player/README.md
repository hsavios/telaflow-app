# TelaFlow Player

Runtime local (**Tauri 2 + React + Vite**), alinhado a `docs/specs/ARCHITECTURE_SPEC.md` e `docs/specs/PLAYER_RUNTIME_FEATURE_SPEC.md`. O núcleo do show **não depende** da Cloud em tempo de execução.

## Pack Loader (MVP)

- Botão **Abrir pasta do pack**: diálogo nativo para escolher a pasta do export direto (subpasta `export_id` com os seis JSON).
- Comando nativo `load_pack_from_directory`: lê `manifest.json`, resolve caminhos dos artefatos por `role` (com validação contra `..` / path absoluto), lê `event.json`, `draw-configs.json`, `media-manifest.json`, `branding.json` e `license.json`.
- O **frontend** valida cada documento com **Zod** (`@telaflow/shared-contracts`) e aplica checagens mínimas de **coerência** entre `event_id`, `export_id` e `organization_id`.

## Licença (MVP)

- Após o pack estar válido, o **License Validator** avalia `license.json` (estrutura Zod, escopo `event_player_binding_mvp`, ids alinhados ao manifest, janela `valid_from` / `valid_until`).
- Estados expostos internamente: `valid`, `expired`, `not_yet_valid`, `invalid_scope`, `malformed_license`.
- Se a licença **não** estiver `valid`, o estado global passa a **`blocked`** (não abre workspace nem pre-flight útil até novo pack).

## Media Binder (MVP)

- Escolha de **pasta de workspace** local; listagem de todos os `media_id` do `media-manifest.json`.
- **Vincular** cada slot a um ficheiro (diálogo de ficheiro); o Rust calcula caminho **relativo** à raiz do workspace (`normalize_media_binding_relative`).
- Persistência em **`.telaflow/media-bindings.json`** (versão `telaflow_player_media_bindings.v1`), com `event_id` / `export_id` para invalidar bindings de outro export.
- Estado por linha: **nao_vinculado**, **vinculado**, **ausente** (ficheiro em falta).

## Pre-flight (MVP)

- Botão **Executar checagens**: motor em TypeScript (`runPreflightMvp`) com itens **bloqueante** / **aviso** / **ok** (grupos G1–G5 parciais, alinhados a `PRE_FLIGHT_FEATURE_SPEC.md` §6 em espírito).
- Cobre: pack carregado, licença, workspace, bindings e presença de ficheiros, referências mínimas no roteiro (cenas ativas).
- **Efeito na FSM:** com **≥1 bloqueante** → estado **`preflight_failed`**; com **zero bloqueantes** → **`ready`** (`kindAfterPreflight` em `src/runtime/operationalState.ts`).
- Painel com contagens e lista; **reexecutar** a partir de `pack_loaded`, `preflight_failed` ou `ready` (bloqueado durante `executing`).

## FSM operacional (estados de topo)

Conforme `PLAYER_RUNTIME_FEATURE_SPEC` / `ARCHITECTURE_SPEC` (subconjunto MVP):

| Estado | Significado |
|--------|-------------|
| **`idle`** | Sem sessão ativa. |
| **`blocked`** | Pack inválido, licença inválida ou erro fatal de I/O. |
| **`pack_loaded`** | Pack + licença OK; workspace/bindings a configurar; pre-flight ainda não passou ou foi invalidado. |
| **`preflight_failed`** | Último pre-flight com bloqueantes (detalhe em `lastPreflight`). |
| **`ready`** | Último pre-flight **sem** bloqueantes — **gate** para iniciar roteiro. |
| **`executing`** | Roteiro com **Runtime Visual MVP** + **Playback Engine MVP** (imagem/vídeo via bindings), sem sorteio visual real. |

Fluxo típico: `idle` → (abrir pack) → `pack_loaded` → (pre-flight) → `preflight_failed` **ou** `ready` → (**Iniciar roteiro**) → `executing` → (**Concluir execução**) → `ready`. Alterar workspace/bindings repõe `pack_loaded`.

Implementação: `src/pack/playerPackState.ts` + `src/App.tsx`.

## Scene Runtime (MVP)

- Fonte: `event.json` via `packData.event.scenes` — só cenas **`enabled`**, ordenadas por `sort_order` e `scene_id` (`enabledScenesSorted` em `src/runtime/sceneOrder.ts`).
- Em **`executing`**: layout em três zonas — **roteiro** (lista clicável), **área central** com o **Scene Presenter**, **painel Operação** (estado, anterior/seguinte, concluir execução). Código: `src/runtime/ExecutingRuntimeView.tsx` + `ScenePresenter.tsx`.

## Runtime Visual MVP

- **Scene Presenter** (`src/runtime/ScenePresenter.tsx`): cartão operacional da cena ativa (metadados, tipo `SceneType` em pt-BR, hints em `draw`). **Não** contém lógica de ficheiro/reprodução — delega mídia ao **Scene Media Renderer**.
- **Scene Media Renderer** (`src/runtime/SceneMediaRenderer.tsx`): zona de mídia da cena (placeholder, fallback ou playback).
- Tipos de cena (`SceneType`): **`opening`**, **`institutional`**, **`sponsor`**, **`draw`**, **`break`**, **`closing`**.
- Cenas **`draw`**: texto explícito de que não há sorteio visual; se existir `draw_config_id` no pack, mostra-se resumo da configuração (nome, `max_winners`).

## Playback Engine (MVP)

- Tipos de **slot** suportados para ficheiro real: **`image`** e **`video`** (`media_type` no `media-manifest`).
- **Imagem:** `<img>` com URL via `convertFileSrc` sobre o caminho absoluto canónico devolvido por `resolve_workspace_file_path` (Rust; valida caminho relativo seguro).
- **Vídeo:** `<video>` com `controls`, **`muted`** e **`autoPlay`** + `playsInline` (MVP operacional).
- **`audio`** / **`other`**: sem playback de ficheiro — mensagem + registo `media_failed` (motivo).
- **`media_id`** sem linha no manifest: não há tipo declarado — placeholder + `media_failed`.
- Estados derivados **sem** ficheiro pronto (`media_missing_binding`, `media_file_missing`): mantém-se o **placeholder / cartão de fallback** (sem tentar carregar URL).
- **Tauri:** `app.security.assetProtocol` + CSP com `asset:` / `http://asset.localhost` para o WebView carregar ficheiros locais; âmbito amplo `**` no MVP (workspace escolhido pelo operador).

## Logging de playback

- **`media_started`**: após `onLoad` (imagem) ou `onLoadedData` (vídeo), uma vez por URL carregada.
- **`media_failed`**: vínculo/ficheiro em falta, resolução de path, tipo não suportado, manifest em falta, ou erro de decode/elemento (`onError`).

## Resolução de mídia da cena atual

Função `resolveSceneMediaState` em `src/runtime/sceneMediaResolution.ts`, com base em `scene.media_id`, vínculos (`bindings`) e existência de ficheiro no workspace (`file_exists_under_workspace`, cache alinhado ao painel de vínculos). O refresh de existência inclui **`media_id` referenciados por cenas ativas**, além dos requisitos do `media-manifest`.

| Estado derivado | Significado |
|-----------------|-------------|
| **`no_media_required`** | Cena sem `media_id` (não aplicável). |
| **`media_bound`** | `media_id` definido, vínculo presente e ficheiro encontrado sob o workspace. |
| **`media_missing_binding`** | `media_id` definido mas sem caminho relativo em `bindings`. |
| **`media_file_missing`** | Vínculo definido mas ficheiro ausente, ou workspace em falta com vínculo já gravado. |

Textos para operador: `describeSceneMediaDerivedStatePt`.

## Registo de execução (MVP)

- O registo **inicia** ao entrar em **`executing`**: eventos **`execution_started`**, **`scene_activated`** (inclui índice 0 ao iniciar e cada mudança), **`execution_finished`** (botão **Concluir execução**, descarregar sessão ou alteração de workspace/bindings durante execução), mais **`media_started`** / **`media_failed`** durante o playback MVP.
- **Persistência:** comando Tauri `append_execution_jsonl` — ficheiro **`.telaflow/execution-log.jsonl`** sob a raiz do **workspace** se existir; caso contrário sob a **pasta do pack** (append JSON por linha).
- Memória de sessão: `executionLog` + UI `ExecutionLogPanel` (visível em `executing`).

## Fora de escopo

- **Sorteio visual** real (extração, animação, telão dedicado).
- **Multi-monitor** / projeção estendida.
- **Transições** avançadas entre cenas ou efeitos no telão.
- **Cloud** em runtime (o pack é local).
- **Assinatura criptográfica** da licença (validação estrutural/janela apenas).
- **Playback** além do MVP: áudio dedicado, streaming, DRM, playlists, etc.

## Desenvolvimento

Requisitos: **Node 20+**, **Rust** (stable) e dependências de sistema do [Tauri](https://v2.tauri.app/start/prerequisites/).

```bash
# na raiz do monorepo (workspaces)
npm install

cd apps/player
npm run dev          # só Vite (invoke Tauri falha sem shell Tauri)
npm run tauri dev    # app completo com diálogo de pastas
```

Typecheck:

```bash
npm run typecheck -w player
```

## Relação com o Pack

Use um pack gerado pela Cloud (`POST /events/{event_id}/export`) — mesmos contratos que o pacote `@telaflow/shared-contracts`.
