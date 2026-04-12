"""Rotas de scenes por evento."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from telaflow_cloud_api.access import assert_event_in_org
from telaflow_cloud_api.domain import Scene, SceneCreate, SceneReorderBody, SceneUpdate
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.ids import new_scene_id
from telaflow_cloud_api.persistence.repository import Repository, assert_scene_exists, validate_scene_links
from telaflow_cloud_api.tenancy import get_organization_id

router = APIRouter(tags=["scenes"])


@router.get("/events/{event_id}/scenes")
def list_scenes(
    event_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    """Lista scenes do evento, ordenadas por sort_order."""
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    rows = list(repo.list_scenes(event_id))
    rows.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    return {"scenes": rows}


@router.post("/events/{event_id}/scenes/reorder", status_code=200)
def reorder_scenes(
    event_id: str,
    body: SceneReorderBody,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    bucket = repo.list_scenes(event_id)
    existing_ids = {s.get("scene_id") for s in bucket}
    if set(body.scene_ids) != existing_ids or len(body.scene_ids) != len(bucket):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "scene_ids_must_match_all_scenes",
                "expected": sorted(existing_ids),
                "got": body.scene_ids,
            },
        )
    id_to_row = {s["scene_id"]: dict(s) for s in bucket}
    new_bucket: list[dict] = []
    for i, sid in enumerate(body.scene_ids):
        row = id_to_row[sid]
        row["sort_order"] = i
        new_bucket.append(row)
    repo.set_scenes_for_event(event_id, new_bucket)
    return {"ok": True, "scenes": new_bucket}


@router.post("/events/{event_id}/scenes", status_code=201)
def create_scene(
    event_id: str,
    body: SceneCreate,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    bucket = repo.list_scenes(event_id)
    if repo.sort_order_used(event_id, body.sort_order, None):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "sort_order_conflict",
                "sort_order": body.sort_order,
                "event_id": event_id,
            },
        )
    validate_scene_links(repo, event_id, body.type, body.media_id, body.draw_config_id)
    scene_id = new_scene_id()
    for _ in range(8):
        if not any(s.get("scene_id") == scene_id for s in bucket):
            break
        scene_id = new_scene_id()
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
        media_id=body.media_id,
        draw_config_id=body.draw_config_id,
        scene_behavior=body.scene_behavior,
    )
    payload = scene.model_dump()
    repo.append_scene(event_id, payload)
    return {"ok": True, "scene": payload}


@router.get("/events/{event_id}/scenes/{scene_id}")
def get_scene(
    event_id: str,
    scene_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    idx = repo.scene_index(event_id, scene_id)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    bucket = repo.list_scenes(event_id)
    bucket.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    # align index after sort
    idx2 = next(i for i, s in enumerate(bucket) if s.get("scene_id") == scene_id)
    return {"scene": bucket[idx2]}


@router.patch("/events/{event_id}/scenes/{scene_id}")
def update_scene(
    event_id: str,
    scene_id: str,
    body: SceneUpdate,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    bucket = repo.list_scenes(event_id)
    bucket.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    idx = next((i for i, s in enumerate(bucket) if s.get("scene_id") == scene_id), None)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    patch = body.model_dump(exclude_unset=True)
    if "sort_order" in patch and repo.sort_order_used(event_id, patch["sort_order"], scene_id):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "sort_order_conflict",
                "sort_order": patch["sort_order"],
            },
        )
    row = dict(bucket[idx])
    row.setdefault("media_id", None)
    row.setdefault("draw_config_id", None)
    row.setdefault("scene_behavior", None)
    row.update(patch)
    validate_scene_links(repo, event_id, row["type"], row.get("media_id"), row.get("draw_config_id"))
    try:
        validated = Scene.model_validate(row)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"error": "validation_failed", "issues": ve.errors()},
        ) from ve
    out = validated.model_dump()
    repo.update_scene_at_index(event_id, idx, out)
    return {"ok": True, "scene": out}


@router.delete("/events/{event_id}/scenes/{scene_id}", status_code=200)
def delete_scene(
    event_id: str,
    scene_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    if repo.delete_scene(event_id, scene_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    repo.clear_media_scene_hints(event_id, scene_id)
    return {"ok": True, "deleted_scene_id": scene_id}
