"""FastAPI entry — skeleton funcional mínimo (PHASE_1_EXECUTION_SPEC)."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from telaflow_cloud_api.domain import Event

app = FastAPI(
    title="TelaFlow Cloud API",
    version="0.1.0",
    description="API da TelaFlow Cloud — fase inicial: governança e integração, sem persistência completa.",
)

# Armazenamento fake (Fase 1): event_id -> payload serializável
_events_store: dict[str, dict] = {}


@app.get("/health")
def health() -> dict[str, str]:
    """Healthcheck para runtime, load balancers e probes."""
    return {"status": "ok"}


@app.post("/events", status_code=201)
def create_event(body: Event) -> dict:
    """
    Cria evento em memória. Não é CRUD completo — apenas stub para integração inicial.
    """
    if body.event_id in _events_store:
        raise HTTPException(
            status_code=409,
            detail={"error": "event_id_already_exists", "event_id": body.event_id},
        )
    payload = body.model_dump()
    _events_store[body.event_id] = payload
    return {"ok": True, "event": payload}
