"""FastAPI entry — skeleton funcional mínimo (PHASE_1_EXECUTION_SPEC)."""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from telaflow_cloud_api.domain import Event

app = FastAPI(
    title="TelaFlow Cloud API",
    version="0.1.0",
    description="API da TelaFlow Cloud — fase inicial: governança e integração, sem persistência completa.",
)

# Armazenamento fake (Fase 1): event_id -> payload serializável
_events_store: dict[str, dict] = {}

_cors_raw = os.environ.get(
    "CLOUD_API_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://app.telaflow.ia.br",
)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """Healthcheck para runtime, load balancers e probes."""
    return {"status": "ok"}


@app.get("/events")
def list_events() -> dict:
    """Lista eventos em memória (ordem de criação)."""
    events = list(_events_store.values())
    return {"events": events}


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
