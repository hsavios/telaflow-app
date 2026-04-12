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
- **Vincular** cada slot a um arquivo (diálogo de arquivo); o Rust calcula caminho **relativo** à raiz do workspace (`normalize_media_binding_relative`).
- Persistência em **`.telaflow/media-bindings.json`** (versão `telaflow_player_media_bindings.v1`), com `event_id` / `export_id` para invalidar bindings de outro export.
- Estado por linha: **nao_vinculado**, **vinculado**, **ausente** (arquivo ausente).

## Pre-flight (MVP)

- Botão **Executar checagens**: motor em TypeScript (`runPreflightMvp`) com itens **bloqueante** / **aviso** / **ok** (grupos G1–G5 parciais, alinhados a `PRE_FLIGHT_FEATURE_SPEC.md` §6 em espírito).
- Cobre: pack carregado, licença, workspace, bindings e presença de arquivos, referências mínimas no roteiro (cenas ativas).
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
| **`executing`** | Roteiro com **Runtime Visual MVP**, **Playback MVP**, **Draw Engine MVP** (`number_range`) e **saída pública** (pré-visualização na janela do operador e, opcionalmente, **janela pública dedicada** via Tauri — dual-screen real MVP), sem Cloud. |

Fluxo típico: `idle` → (abrir pack) → `pack_loaded` → (pre-flight) → `preflight_failed` **ou** `ready` → (**Iniciar roteiro**) → `executing` → (**Concluir execução**) → `ready`. Alterar workspace/bindings repõe `pack_loaded`.

Implementação: `src/pack/playerPackState.ts` + `src/App.tsx`.

## Scene Runtime (MVP)

- Fonte: `event.json` via `packData.event.scenes` — só cenas **`enabled`**, ordenadas por `sort_order` e `scene_id` (`enabledScenesSorted` em `src/runtime/sceneOrder.ts`).
- Em **`executing`**: **saída pública MVP** na janela principal (bloco escuro no topo) com **`PublicSceneView`** — só título, tipo amigável, mídia e espelho do sorteio; abaixo, a **visão do operador** em três zonas (`OperatorExecutingLayout`): **roteiro**, **ScenePresenter**, **painel Operação**. Código: `ExecutingRuntimeView.tsx` + `drawRuntimeContext.tsx` (estado do draw compartilhado na mesma webview). Para **segunda janela** (telão), ver secção **Dual-screen real (MVP)** abaixo.

## Runtime Visual MVP

- **Scene Presenter** (`src/runtime/ScenePresenter.tsx`): cartão operacional da cena ativa (metadados, tipo `SceneType` em pt-BR). Delega **mídia** ao **Scene Media Renderer** e **sorteio** ao **DrawScenePanel** (cenas `draw`).
- **Scene Media Renderer** (`src/runtime/SceneMediaRenderer.tsx`): zona de mídia da cena (placeholder, fallback ou playback). Prop opcional **`presentation="public"`** para textos neutros e **sem** eventos de log a partir da janela pública.
- **Public Scene View** (`src/runtime/PublicSceneView.tsx`): apenas conteúdo orientado à audiência (sem roteiro, logs nem controles operacionais).
- Tipos de cena (`SceneType`): **`opening`**, **`institutional`**, **`sponsor`**, **`draw`**, **`break`**, **`closing`**.

## Playback Engine (MVP)

- Tipos de **slot** suportados para arquivo real: **`image`** e **`video`** (`media_type` no `media-manifest`).
- **Imagem:** `<img>` com URL via `convertFileSrc` sobre o caminho absoluto canônico devolvido por `resolve_workspace_file_path` (Rust; valida caminho relativo seguro).
- **Vídeo:** `<video>` com `controls`, **`muted`** e **`autoPlay`** + `playsInline` (MVP operacional).
- **`audio`** / **`other`**: sem playback de arquivo — mensagem + registro `media_failed` (motivo).
- **`media_id`** sem linha no manifest: não há tipo declarado — placeholder + `media_failed`.
- Estados derivados **sem** arquivo pronto (`media_missing_binding`, `media_file_missing`): mantém-se o **placeholder / cartão de fallback** (sem tentar carregar URL).
- **Tauri:** `app.security.assetProtocol` + CSP com `asset:` / `http://asset.localhost` para o WebView carregar arquivos locais; escopo amplo `**` no MVP (workspace escolhido pelo operador).

## Draw Engine (MVP)

- Contrato **`DrawConfig`** em `@telaflow/shared-contracts`: `draw_type` (MVP: **`number_range`**), `number_range` opcional `{ min, max }`. Se `number_range` estiver ausente no pack, o Player usa intervalo padrão **1…1000** (`drawNumberRange.ts`).
- **`DrawScenePanel`** (`src/runtime/DrawScenePanel.tsx`), só em cenas **`draw`** em **`executing`**: resolve `draw_config_id` em `draw-configs.json` do pack; só **`draw_type === number_range`**. Estados internos: `idle` → `ready` / `error`; `ready` → **Iniciar sorteio** → `drawing` (breve atraso) → `result_generated` (número em destaque + **Confirmar resultado**) → `result_confirmed`. Resumo na UI: nome, `draw_config_id`, tipo, intervalo (**start_number** / **end_number** mapeados a `number_range.min` / `number_range.max` no contrato).
- Estado do sorteio compartilhado via **`DrawRuntimeProvider`** / **`drawRuntimeContext.tsx`** para o **`PublicSceneView`** espelhar fases (pronto, sorteando, resultado, confirmado).
- Sem animação de sorteio elaborada, sem múltiplos vencedores, sem exclusão persistente de números, sem Cloud em runtime.

## Saída pública (MVP)

- **Objetivo (janela principal):** pré-visualização do “telão” no **mesmo** ecrã que o operador; opcionalmente, abrir **janela pública dedicada** (Tauri) para o telão num segundo ecrã ou projector (sem escolha de monitor nem APIs avançadas).
- **`PublicSceneView`**: tipos de cena suportados (`opening`, `institutional`, `sponsor`, `draw`, `break`, `closing`) — título, rótulo amigável e bloco de mídia (sem detalhes técnicos quando `presentation="public"`).
- **Sorteio:** espelho do runtime (`ready` → “Pronto para sortear”; `drawing` → “Sorteando...”; resultado em destaque; “Sorteio confirmado” após confirmação do operador).
- **Operador:** `OperatorExecutingLayout` mantém roteiro, `ScenePresenter` e controles; a FSM de topo (`executing`, etc.) **não** muda.
- **Nota (MVP):** mídia com playback pode estar montada **duas vezes** (pré-visualização + janela pública, ou operador + público); evolução futura pode usar uma única instância compartilhada.

## Dual-screen real (MVP)

- **Janelas Tauri:** a janela principal tem etiqueta **`main`** (operador). O comando Rust **`public_window_open`** cria ou mostra a webview **`public`**, que carrega **`public-panel.html`** (entrada Vite separada de `index.html`).
- **Controlo:** em execução, o operador usa **“Abrir janela pública”** (`invoke("public_window_open")`). Navegação do roteiro, sorteio e execução permanecem **só** na janela principal.
- **Sincronização:** o componente **`PublicWindowSyncEmitter`** (dentro de `DrawRuntimeProvider`) emite o estado serializado para a janela `public` via **`emitTo("public", …)`** com o nome de evento **`telaflow-public-state`** (`PUBLIC_WINDOW_STATE_EVENT` em `publicWindowPayload.ts`). O payload inclui **cena ativa**, **estado derivado da mídia** e **snapshot do draw runtime** (`PublicWindowStatePayload`).
- **Janela pública:** `src/publicMain.tsx` escuta o evento, guarda o último payload e renderiza **`PublicSceneView`** com **`drawMirrorMode="remote"`** e **`remoteDrawSnapshot`** — apenas reflexo (sem roteiro nem botões de operação).
- **Limitações explícitas (MVP):** sem atribuição de monitor externo, sem multi-monitor avançado, sem motor de playback separado para o telão, sem Cloud em runtime. Permissões em `src-tauri/capabilities/default.json`: janelas **`main`** e **`public`**, mais **`core:event:default`** para o evento entre webviews.

## Logging de playback e sorteio

- **`media_started`**: após `onLoad` (imagem) ou `onLoadedData` (vídeo), uma vez por URL carregada.
- **`media_failed`**: vínculo ou arquivo ausente, falha na resolução de path, tipo não suportado, manifest ausente, ou erro de decode/elemento (`onError`).
- **`draw_started`**, **`draw_result_generated`**, **`draw_result_confirmed`**, **`draw_failed`**: ciclo do sorteio `number_range` no motor MVP (falhas de configuração ou execução).

## Resolução de mídia da cena atual

Função `resolveSceneMediaState` em `src/runtime/sceneMediaResolution.ts`, com base em `scene.media_id`, vínculos (`bindings`) e existência de arquivo no workspace (`file_exists_under_workspace`, cache alinhado ao painel de vínculos). O refresh de existência inclui **`media_id` referenciados por cenas ativas**, além dos requisitos do `media-manifest`.

| Estado derivado | Significado |
|-----------------|-------------|
| **`no_media_required`** | Cena sem `media_id` (não aplicável). |
| **`media_bound`** | `media_id` definido, vínculo presente e arquivo encontrado sob o workspace. |
| **`media_missing_binding`** | `media_id` definido mas sem caminho relativo em `bindings`. |
| **`media_file_missing`** | Vínculo definido mas arquivo ausente, ou workspace ausente com vínculo já salvo. |

Textos para operador: `describeSceneMediaDerivedStatePt`.

## Registro de execução (MVP)

- O registro **inicia** ao entrar em **`executing`**: eventos **`execution_started`**, **`scene_activated`**, **`execution_finished`**, **`media_started`** / **`media_failed`**, e **`draw_started`** / **`draw_result_generated`** / **`draw_result_confirmed`** / **`draw_failed`** quando aplicável.
- **Persistência:** comando Tauri `append_execution_jsonl` — arquivo **`.telaflow/execution-log.jsonl`** sob a raiz do **workspace** se existir; caso contrário sob a **pasta do pack** (append JSON por linha).
- Memória de sessão: `executionLog` + UI `ExecutionLogPanel` (visível em `executing`).

## Fora de escopo

- **Sorteio visual** avançado (animações elaboradas, modos múltiplos além do MVP `number_range`).
- **Dual-screen avançado:** escolha explícita de monitor, fullscreen dedicado por ecrã, ou uma única instância de mídia partilhada entre operador e telão (o MVP oferece **segunda janela** + evento de estado, sem essas otimizações).
- **Multi-monitor** / APIs de projeção além de abrir a janela `public` manualmente e arrastá-la para outro ecrã.
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
