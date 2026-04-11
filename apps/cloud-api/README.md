# TelaFlow Cloud API

FastAPI service — Fase 1 skeleton (`PHASE_1_EXECUTION_SPEC.md`). Requer Python **3.10+** (ver `pyproject.toml`).

- `GET /health` — liveness; resposta JSON: `{"status":"ok"}`
- `GET /events` — lista eventos em memória; resposta `{"events":[...]}`
- `POST /events` — cria evento em **memória** (stub; `409` se `event_id` repetido)
- CORS: variável `CLOUD_API_CORS_ORIGINS` (lista separada por vírgula). Padrão inclui `localhost:3000` e `https://app.telaflow.ia.br`.
- `domain/event.py`, `domain/scene.py` — modelos Pydantic alinhados aos contratos TS

## Run (dev)

```bash
cd apps/cloud-api
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn telaflow_cloud_api.main:app --reload --host 127.0.0.1 --port 8000
```

Contratos JSON do Pack: futuramente validados contra JSON Schema gerado a partir de `@telaflow/shared-contracts` (Zod).
