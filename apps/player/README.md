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
| **`executing`** | Navegação mínima do roteiro (sem playback nem sorteio visual). |

Fluxo típico: `idle` → (abrir pack) → `pack_loaded` → (pre-flight) → `preflight_failed` **ou** `ready` → (**Iniciar roteiro**) → `executing` → (**Concluir execução**) → `ready`. Alterar workspace/bindings repõe `pack_loaded`.

Implementação: `src/pack/playerPackState.ts` + `src/App.tsx`.

## Scene Runtime (MVP)

- Fonte: `event.json` via `packData.event.scenes` — só cenas **`enabled`**, ordenadas por `sort_order` e `scene_id`.
- Lista numerada do roteiro; **cena atual** com `scene_id`, `name`, `type`, `sort_order`, `media_id`, `draw_config_id` (ou `—` se vazio).
- **Cena anterior / seguinte** — sem playback de mídia nem sorteio visual.
- Código: `src/runtime/sceneNavigator.tsx`.

## Registo de execução (MVP)

- O registo **inicia** ao entrar em **`executing`**: eventos **`execution_started`**, **`scene_activated`** (inclui índice 0 ao iniciar e cada mudança), **`execution_finished`** (botão **Concluir execução**, descarregar sessão ou alteração de workspace/bindings durante execução).
- **Persistência:** comando Tauri `append_execution_jsonl` — ficheiro **`.telaflow/execution-log.jsonl`** sob a raiz do **workspace** se existir; caso contrário sob a **pasta do pack** (append JSON por linha).
- Memória de sessão: `executionLog` + UI `ExecutionLogPanel` (visível em `executing`).

## Fora de escopo

- Playback de mídia, sorteio visual no palco, assinatura criptográfica da licença, cliente da Cloud em runtime, execução visual final do telão.

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
