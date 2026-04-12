"""Requisitos de mídia por evento."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from telaflow_cloud_api.access import assert_event_in_org
from telaflow_cloud_api.domain import MediaRequirement, MediaRequirementCreate, MediaRequirementUpdate
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.ids import new_media_id
from telaflow_cloud_api.persistence.repository import Repository, assert_scene_exists
from telaflow_cloud_api.tenancy import get_organization_id

router = APIRouter(tags=["media-requirements"])


@router.get("/events/{event_id}/media-requirements")
def list_media_requirements(
    event_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    rows = list(repo.list_media_requirements(event_id))
    rows.sort(key=lambda m: (m.get("label", ""), m.get("media_id", "")))
    return {"media_requirements": rows}


@router.post("/events/{event_id}/media-requirements", status_code=201)
def create_media_requirement(
    event_id: str,
    body: MediaRequirementCreate,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    if body.scene_id:
        assert_scene_exists(repo, event_id, body.scene_id)
    bucket = repo.list_media_requirements(event_id)
    media_id = new_media_id()
    for _ in range(8):
        if not any(m.get("media_id") == media_id for m in bucket):
            break
        media_id = new_media_id()
    else:
        raise HTTPException(
            status_code=500,
            detail={"error": "media_id_generation_failed"},
        )
    mr = MediaRequirement(
        media_id=media_id,
        event_id=event_id,
        label=body.label,
        media_type=body.media_type,
        required=body.required,
        scene_id=body.scene_id,
        allowed_extensions_hint=body.allowed_extensions_hint,
    )
    payload = mr.model_dump()
    repo.append_media_requirement(event_id, payload)
    return {"ok": True, "media_requirement": payload}


@router.get("/events/{event_id}/media-requirements/{media_id}")
def get_media_requirement(
    event_id: str,
    media_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    row = repo.get_media_requirement(event_id, media_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "media_requirement_not_found", "media_id": media_id},
        )
    return {"media_requirement": row}


@router.patch("/events/{event_id}/media-requirements/{media_id}")
def update_media_requirement(
    event_id: str,
    media_id: str,
    body: MediaRequirementUpdate,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    row = repo.get_media_requirement(event_id, media_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "media_requirement_not_found", "media_id": media_id},
        )
    patch = body.model_dump(exclude_unset=True)
    if patch.get("scene_id"):
        assert_scene_exists(repo, event_id, patch["scene_id"])
    merged = dict(row)
    merged.update(patch)
    try:
        validated = MediaRequirement.model_validate(merged)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"error": "validation_failed", "issues": ve.errors()},
        ) from ve
    out = validated.model_dump()
    repo.update_media_requirement(event_id, media_id, out)
    return {"ok": True, "media_requirement": out}


@router.delete("/events/{event_id}/media-requirements/{media_id}", status_code=200)
def delete_media_requirement(
    event_id: str,
    media_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    refs = repo.scenes_referencing_media(event_id, media_id)
    if refs:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "media_requirement_in_use",
                "scene_ids": refs,
                "message": "Remova o vínculo nas scenes antes de excluir este slot.",
            },
        )
    if not repo.delete_media_requirement(event_id, media_id):
        raise HTTPException(
            status_code=404,
            detail={"error": "media_requirement_not_found", "media_id": media_id},
        )
    return {"ok": True, "deleted_media_id": media_id}
