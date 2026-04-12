"""DrawConfig por evento."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from telaflow_cloud_api.access import assert_event_in_org
from telaflow_cloud_api.domain import DrawConfig, DrawConfigCreate, DrawConfigUpdate
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.ids import new_draw_config_id
from telaflow_cloud_api.persistence.repository import Repository
from telaflow_cloud_api.tenancy import get_organization_id

router = APIRouter(tags=["draw-configs"])


@router.get("/events/{event_id}/draw-configs")
def list_draw_configs(
    event_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    rows = list(repo.list_draw_configs(event_id))
    rows.sort(key=lambda d: (d.get("name", ""), d.get("draw_config_id", "")))
    return {"draw_configs": rows}


@router.post("/events/{event_id}/draw-configs", status_code=201)
def create_draw_config(
    event_id: str,
    body: DrawConfigCreate,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    bucket = repo.list_draw_configs(event_id)
    draw_config_id = new_draw_config_id()
    for _ in range(8):
        if not any(d.get("draw_config_id") == draw_config_id for d in bucket):
            break
        draw_config_id = new_draw_config_id()
    else:
        raise HTTPException(
            status_code=500,
            detail={"error": "draw_config_id_generation_failed"},
        )
    dc = DrawConfig(
        draw_config_id=draw_config_id,
        event_id=event_id,
        **body.model_dump(),
    )
    payload = dc.model_dump()
    repo.append_draw_config(event_id, payload)
    return {"ok": True, "draw_config": payload}


@router.get("/events/{event_id}/draw-configs/{draw_config_id}")
def get_draw_config(
    event_id: str,
    draw_config_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    row = repo.get_draw_config(event_id, draw_config_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    return {"draw_config": row}


@router.patch("/events/{event_id}/draw-configs/{draw_config_id}")
def update_draw_config(
    event_id: str,
    draw_config_id: str,
    body: DrawConfigUpdate,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    row = repo.get_draw_config(event_id, draw_config_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    merged = dict(row)
    merged.update(body.model_dump(exclude_unset=True))
    try:
        validated = DrawConfig.model_validate(merged)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"error": "validation_failed", "issues": ve.errors()},
        ) from ve
    out = validated.model_dump()
    repo.update_draw_config(event_id, draw_config_id, out)
    return {"ok": True, "draw_config": out}


@router.delete("/events/{event_id}/draw-configs/{draw_config_id}", status_code=200)
def delete_draw_config(
    event_id: str,
    draw_config_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    refs = repo.scenes_referencing_draw(event_id, draw_config_id)
    if refs:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "draw_config_in_use",
                "scene_ids": refs,
                "message": "Remova o vínculo nas scenes antes de excluir este sorteio.",
            },
        )
    if not repo.delete_draw_config(event_id, draw_config_id):
        raise HTTPException(
            status_code=404,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    return {"ok": True, "deleted_draw_config_id": draw_config_id}
