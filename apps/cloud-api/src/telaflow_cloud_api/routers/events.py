"""Rotas de eventos (lista, detalhe, criação)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from telaflow_cloud_api.domain import Event
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.repository import Repository
from telaflow_cloud_api.tenancy import get_organization_id

router = APIRouter(tags=["events"])


@router.get("/events")
def list_events(
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    """Lista eventos da organização (cabeçalho multi-tenant)."""
    repo = Repository(db)
    events = repo.list_events(organization_id=organization_id)
    return {"events": events}


@router.get("/events/{event_id}")
def get_event(
    event_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    """Retorna um evento por id ou 404."""
    repo = Repository(db)
    row = repo.get_event(event_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    if row["organization_id"] != organization_id:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    return {"event": row}


@router.post("/events", status_code=201)
def create_event(
    body: Event,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    """Cria evento persistido em PostgreSQL/SQLite (testes)."""
    if body.organization_id != organization_id:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "organization_mismatch",
                "message": "organization_id do corpo deve coincidir com X-Telaflow-Organization-Id.",
            },
        )
    repo = Repository(db)
    if repo.event_exists(body.event_id):
        raise HTTPException(
            status_code=409,
            detail={"error": "event_id_already_exists", "event_id": body.event_id},
        )
    repo.ensure_organization(body.organization_id, body.organization_id)
    payload = body.model_dump()
    repo.create_event(payload)
    return {"ok": True, "event": payload}
