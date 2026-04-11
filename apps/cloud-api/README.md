# TelaFlow Cloud API

FastAPI service — Fase 1 skeleton (`PHASE_1_EXECUTION_SPEC.md`). Requer Python **3.10+** (ver `pyproject.toml`).

- `GET /health` — liveness; resposta JSON: `{"status":"ok"}`
- `GET /events` — lista eventos em memória; resposta `{"events":[...]}`
- `GET /events/{event_id}` — detalhe do evento ou `404`
- `POST /events` — cria evento em **memória** (stub; `409` se `event_id` repetido)
- `GET /events/{event_id}/scenes` — lista scenes do evento (ordenadas por `sort_order`) ou `404` se o evento não existir
- `POST /events/{event_id}/scenes/reorder` — redefine ordem; corpo `{"scene_ids":[...]}` (todos os ids do evento, cada um uma vez, na nova ordem; `sort_order` 0..n-1)
- `POST /events/{event_id}/scenes` — cria scene (`scene_id` gerado no servidor); corpo: `sort_order` **único por evento**, `type` (enum), `name`, `enabled` (default true), opcionais `media_id` / `draw_config_id`
- `GET /events/{event_id}/scenes/{scene_id}` — detalhe da scene ou `404`
- `PATCH /events/{event_id}/scenes/{scene_id}` — atualização parcial (`SceneUpdate`)
- `DELETE /events/{event_id}/scenes/{scene_id}` — remove e recompacta `sort_order`; limpa `scene_id` em `MediaRequirement` que apontavam para essa scene
- Validação de scene: `media_id` / `draw_config_id` precisam existir no evento; tipo `draw` exige `draw_config_id` (`422` `draw_scene_requires_draw_config` se faltar)
- `GET /events/{event_id}/export-readiness` — checagens mínimas para futuro pack (`blocking` / `warnings`, flag `ready`)
- **DrawConfig** (sorteio por evento): `GET/POST /events/{event_id}/draw-configs`, `GET/PATCH/DELETE …/draw-configs/{draw_config_id}` — `409` `draw_config_in_use` se alguma scene referencia
- **MediaRequirement** (manifesto por evento, sem upload): `GET/POST …/media-requirements`, `GET/PATCH/DELETE …/media-requirements/{media_id}` — `media_id` gerado no servidor; `409` `media_requirement_in_use` se scene usa o slot
- `409` em criação/atualização de scene se `sort_order` duplicado no mesmo evento (`sort_order_conflict`)
- CORS: variável `CLOUD_API_CORS_ORIGINS`; métodos `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`
- `domain/` — `event`, `scene`, `draw_config`, `media_requirement` (Pydantic)

## Run (dev)

```bash
cd apps/cloud-api
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn telaflow_cloud_api.main:app --reload --host 127.0.0.1 --port 8000
```

Contratos de domínio (Scene, DrawConfig, MediaRequirement, export readiness): **JSON Schema** em `packages/shared-contracts/dist/schema/` após `pnpm run build` no pacote `@telaflow/shared-contracts` (Zod → JSON Schema). Os modelos Pydantic em `domain/` seguem os mesmos campos e ids opacos.

OpenAPI desta API (rotas HTTP):

```bash
python scripts/export_openapi.py
```

Saída: `openapi/openapi.json` (diff em PR, codegen de cliente, gate em CI).
