"""Sessões de inscrição (QR) e endpoint público `/join`."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from telaflow_cloud_api.access import assert_event_in_org
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.ids import new_public_token
from telaflow_cloud_api.persistence.repository import Repository
from telaflow_cloud_api.tenancy import get_organization_id

router = APIRouter(tags=["registration"])


class RegistrationSessionCreate(BaseModel):
    join_base_url: str | None = Field(
        default=None,
        max_length=512,
        description="URL base da Cloud Web para a página /join (ex.: https://app.telaflow.ia.br).",
    )
    opens_at: datetime | None = None
    closes_at: datetime | None = None


class JoinBody(BaseModel):
    display_name: str | None = Field(default=None, max_length=256)


@router.post(
    "/events/{event_id}/draw-configs/{draw_config_id}/registration-sessions",
    status_code=201,
)
def create_registration_session(
    event_id: str,
    draw_config_id: str,
    body: RegistrationSessionCreate,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    if repo.get_draw_config(event_id, draw_config_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    token = new_public_token()
    row = repo.create_registration_session(
        event_id=event_id,
        draw_config_id=draw_config_id,
        public_token=token,
        join_base_url=body.join_base_url,
        opens_at=body.opens_at,
        closes_at=body.closes_at,
    )
    base = (body.join_base_url or "").rstrip("/")
    join_url = f"{base}/join/{token}" if base else f"/join/{token}"
    return {
        "ok": True,
        "session_id": row.id,
        "public_token": token,
        "join_url": join_url,
    }


@router.post("/join/{public_token}", status_code=201)
def join_draw(
    public_token: str,
    body: JoinBody,
    db: Session = Depends(get_session),
) -> dict:
    repo = Repository(db)
    sess = repo.get_registration_session_by_token(public_token)
    if sess is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "registration_session_not_found"},
        )
    now = datetime.now(timezone.utc)
    if sess.opens_at is not None and now < sess.opens_at:
        raise HTTPException(status_code=403, detail={"error": "registration_not_open_yet"})
    if sess.closes_at is not None and now > sess.closes_at:
        raise HTTPException(status_code=410, detail={"error": "registration_closed"})

    regs = repo.list_registrations(sess.id)
    next_n = max((r.assigned_number or 0 for r in regs), default=0) + 1
    reg = repo.add_registration(
        sess.id,
        display_name=body.display_name,
        assigned_number=next_n,
        created_at=now,
    )
    return {
        "ok": True,
        "registration_id": reg.id,
        "assigned_number": next_n,
        "draw_config_id": sess.draw_config_id,
        "event_id": sess.event_id,
    }
