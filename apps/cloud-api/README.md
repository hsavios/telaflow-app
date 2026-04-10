# TelaFlow Cloud API

FastAPI service — Fase 1 skeleton (`PHASE_1_EXECUTION_SPEC.md`). Requer Python **3.10+** (ver `pyproject.toml`).

- `GET /health` — liveness
- `POST /events` — cria evento em **memória** (stub; `409` se `event_id` repetido)
- `domain/event.py`, `domain/scene.py` — modelos Pydantic alinhados aos contratos TS

## Run (dev)

```bash
cd apps/cloud-api
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn telaflow_cloud_api.main:app --reload --host 127.0.0.1 --port 8000
```

Contratos JSON do Pack: futuramente validados contra JSON Schema gerado a partir de `@telaflow/shared-contracts` (Zod).
