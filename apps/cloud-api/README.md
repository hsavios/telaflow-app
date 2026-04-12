# TelaFlow Cloud API

FastAPI service — Fase 1 skeleton (`PHASE_1_EXECUTION_SPEC.md`). Requer Python **3.10+** (ver `pyproject.toml`).

- `GET /health` — liveness; resposta JSON: `{"status":"ok"}`
- `GET /events` — lista eventos em memória; resposta `{"events":[...]}`
- `GET /events/{event_id}` — detalhe do evento ou `404`
- `POST /events` — cria evento em **memória** (stub; `409` se `event_id` repetido)
- `GET /events/{event_id}/scenes` — lista scenes do evento (ordenadas por `sort_order`) ou `404` se o evento não existir
- `POST /events/{event_id}/scenes/reorder` — redefine ordem; corpo `{"scene_ids":[...]}` (todos os ids do evento, cada um uma vez, na nova ordem; `sort_order` 0..n-1)
- `POST /events/{event_id}/scenes` — cria scene (`scene_id` gerado no servidor); corpo: `sort_order` **único por evento**, `type` (enum), `name`, `enabled` (default true), opcionais `media_id` / `draw_config_id` / `scene_behavior` (`{ "mode": "…" }`, ver `docs/project/PACK_AUTHORING_SEMANTICS_MVP.md`)
- `GET /events/{event_id}/scenes/{scene_id}` — detalhe da scene ou `404`
- `PATCH /events/{event_id}/scenes/{scene_id}` — atualização parcial (`SceneUpdate`)
- `DELETE /events/{event_id}/scenes/{scene_id}` — remove e recompacta `sort_order`; limpa `scene_id` em `MediaRequirement` que apontavam para essa scene
- Validação de scene: `media_id` / `draw_config_id` precisam existir no evento; tipo `draw` exige `draw_config_id` (`422` `draw_scene_requires_draw_config` se faltar)
- `GET /events/{event_id}/export-readiness` — checagens mínimas para futuro pack (`blocking` / `warnings`, flag `ready`, `schema_version` `export_readiness.v1`)
- `POST /events/{event_id}/export` — **Pack export MVP (diretório em disco)**  
  - Sempre executa o mesmo gate que `export_readiness.v1`; se `ready == false` → **`409`** `export_not_ready` com `export_readiness` no `detail`.  
  - Cria pasta `{TELAFLOW_PACK_EXPORT_DIR}/{export_id}/` (padrão: `apps/cloud-api/data/pack-exports/{export_id}/`).  
  - Grava **seis** JSON em UTF-8, LF, sem BOM, chaves ordenadas: `manifest.json` (entrada do pack), `event.json` (evento + scenes ordenadas), `draw-configs.json` (**só** sorteios referenciados por alguma scene), `media-manifest.json` (todos os `MediaRequirement` do evento), `branding.json` (tokens `default_mvp` + `scene_type_presets` padrão MVP), `license.json` (janela **30 dias** a partir de `generated_at`, escopo `event_player_binding_mvp`).  
  - **Sem** mídia binária, **sem** ZIP, **sem** assinatura criptográfica.  
  - Resposta HTTP: `export_id`, `generated_at`, `export_directory`, `files_written`, `artifacts` (mesmo conteúdo gravado, útil para clientes que não leem o disco).
- **DrawConfig** (sorteio por evento): `GET/POST /events/{event_id}/draw-configs`, `GET/PATCH/DELETE …/draw-configs/{draw_config_id}` — `409` `draw_config_in_use` se alguma scene referencia; opcional `public_copy` (textos para audiência)
- **MediaRequirement** (manifesto por evento, sem upload): `GET/POST …/media-requirements`, `GET/PATCH/DELETE …/media-requirements/{media_id}` — `media_id` gerado no servidor; `409` `media_requirement_in_use` se scene usa o slot; opcionais `usage_role` e `presentation`
- `409` em criação/atualização de scene se `sort_order` duplicado no mesmo evento (`sort_order_conflict`)
- CORS: variável `CLOUD_API_CORS_ORIGINS`; métodos `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`
- `domain/` — `event`, `scene`, `scene_behavior`, `draw_config`, `draw_public_copy`, `media_requirement` (Pydantic)

## Layout do código

| Módulo | Função |
|--------|--------|
| `main.py` | App FastAPI, CORS, `GET /health`, `include_router` |
| `memory.py` | Stores em memória + helpers (`_compute_export_readiness`, etc.) |
| `routers/events.py` | CRUD mínimo de eventos |
| `routers/scenes.py` | Scenes + reorder |
| `routers/draw_configs.py` | DrawConfig |
| `routers/media_requirements.py` | MediaRequirement |
| `routers/export.py` | `export-readiness` + `POST …/export` |
| `services/pack_export.py` | Montagem e persistência dos artefatos do pack MVP |
| `tests/` | Pytest — conformidade estrutural do pack vs schemas Zod (dist) |

Variável de ambiente opcional: **`TELAFLOW_PACK_EXPORT_DIR`** — diretório absoluto onde cada `export_id` vira subpasta.

## Run (dev)

```bash
cd apps/cloud-api
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn telaflow_cloud_api.main:app --reload --host 127.0.0.1 --port 8000
```

## Testes (pytest)

Conformidade do **pack exportado** com os JSON Schemas de `@telaflow/shared-contracts` (`tests/test_pack_export_schema_compliance.py`): chama `POST /export`, lê os seis arquivos no disco e valida com **jsonschema**.

**Pré-requisito:** gerar schemas na raiz do monorepo:

```bash
npm run build -w @telaflow/shared-contracts
```

Na pasta `apps/cloud-api`:

```bash
pip install -e ".[dev]"
pytest
```

Na raiz do monorepo também existe `npm run test:cloud-api` (ver `package.json`).

Contratos em `@telaflow/shared-contracts`: **JSON Schema** em `packages/shared-contracts/dist/schema/` após `pnpm run build` (Zod → JSON Schema). Inclui domínio (Scene, DrawConfig, MediaRequirement), `export_readiness.v1` e **artefatos do pack MVP** (`pack-manifest-mvp`, `event-export-file`, `draw-configs-pack-file`, `media-manifest-pack-file`, `branding-export-mvp`, `license-export-mvp`). Os modelos Pydantic em `domain/` seguem os mesmos ids opacos.

OpenAPI desta API (rotas HTTP):

```bash
python scripts/export_openapi.py
```

Saída: `openapi/openapi.json` (diff em PR, codegen de cliente, gate em CI).
