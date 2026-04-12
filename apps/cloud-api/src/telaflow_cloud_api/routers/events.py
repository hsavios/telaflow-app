"""Rotas de eventos (lista, detalhe, criação)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from telaflow_cloud_api.domain import Event
from telaflow_cloud_api import memory

router = APIRouter(tags=["events"])


@router.get("/events")
def list_events() -> dict:
    """Lista eventos em memória (ordem de criação)."""
    events = list(memory._events_store.values())
    return {"events": events}


@router.get("/events/{event_id}")
def get_event(event_id: str) -> dict:
    """Retorna um evento por id ou 404."""
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    return {"event": memory._events_store[event_id]}


@router.post("/events", status_code=201)
def create_event(body: Event) -> dict:
    """
    Cria evento em memória. Não é CRUD completo — apenas stub para integração inicial.
    """
    if body.event_id in memory._events_store:
        raise HTTPException(
            status_code=409,
            detail={"error": "event_id_already_exists", "event_id": body.event_id},
        )
    payload = body.model_dump()
    memory._events_store[body.event_id] = payload
    return {"ok": True, "event": payload}
