"""FastAPI entry — skeleton funcional mínimo (PHASE_1_EXECUTION_SPEC)."""

from __future__ import annotations

import os
import secrets

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from telaflow_cloud_api.domain import Event, Scene, SceneCreate

app = FastAPI(
    title="TelaFlow Cloud API",
    version="0.1.0",
    description="API da TelaFlow Cloud — fase inicial: governança e integração, sem persistência completa.",
)

# Armazenamento fake (Fase 1): event_id -> payload serializável
_events_store: dict[str, dict] = {}
# event_id -> lista de scenes (dict serializável), ordenada por sort_order na leitura
_scenes_by_event: dict[str, list[dict]] = {}


def _new_scene_id() -> str:
    """ID opaco compatível com SceneId (mín. 12 caracteres, [a-zA-Z0-9_-])."""
    return f"scn_{secrets.token_hex(6)}_{secrets.token_hex(4)}"


def _scenes_list(event_id: str) -> list[dict]:
    if event_id not in _scenes_by_event:
        _scenes_by_event[event_id] = []
    return _scenes_by_event[event_id]

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


@app.get("/events/{event_id}")
def get_event(event_id: str) -> dict:
    """Retorna um evento por id ou 404."""
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    return {"event": _events_store[event_id]}


@app.get("/events/{event_id}/scenes")
def list_scenes(event_id: str) -> dict:
    """Lista scenes do evento, ordenadas por sort_order (empate preserva ordem de inserção)."""
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    rows = list(_scenes_list(event_id))
    rows.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    return {"scenes": rows}


@app.post("/events/{event_id}/scenes", status_code=201)
def create_scene(event_id: str, body: SceneCreate) -> dict:
    """Cria scene vinculada ao evento; `scene_id` gerado no servidor."""
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _scenes_list(event_id)
    scene_id = _new_scene_id()
    for _ in range(8):
        if not any(s.get("scene_id") == scene_id for s in bucket):
            break
        scene_id = _new_scene_id()
    else:
        raise HTTPException(
            status_code=500,
            detail={"error": "scene_id_generation_failed"},
        )
    scene = Scene(
        scene_id=scene_id,
        event_id=event_id,
        sort_order=body.sort_order,
        type=body.type,
        name=body.name,
        enabled=body.enabled,
    )
    payload = scene.model_dump()
    bucket.append(payload)
    return {"ok": True, "scene": payload}


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
