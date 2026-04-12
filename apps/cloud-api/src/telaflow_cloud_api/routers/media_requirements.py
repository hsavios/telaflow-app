"""MediaRequirement (manifesto por evento)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from telaflow_cloud_api.domain import MediaRequirement, MediaRequirementCreate, MediaRequirementUpdate
from telaflow_cloud_api import memory

router = APIRouter(tags=["media-requirements"])


@router.get("/events/{event_id}/media-requirements")
def list_media_requirements(event_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    rows = list(memory._media_req_list(event_id))
    rows.sort(key=lambda m: (m.get("label", ""), m.get("media_id", "")))
    return {"media_requirements": rows}


@router.post("/events/{event_id}/media-requirements", status_code=201)
def create_media_requirement(event_id: str, body: MediaRequirementCreate) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    if body.scene_id:
        memory._assert_scene_exists(event_id, body.scene_id)
    bucket = memory._media_req_list(event_id)
    media_id = memory._new_media_id()
    for _ in range(8):
        if not any(m.get("media_id") == media_id for m in bucket):
            break
        media_id = memory._new_media_id()
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
    bucket.append(payload)
    return {"ok": True, "media_requirement": payload}


@router.get("/events/{event_id}/media-requirements/{media_id}")
def get_media_requirement(event_id: str, media_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    row = memory._media_by_id(event_id, media_id)
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
) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._media_req_list(event_id)
    idx = next(
        (i for i, m in enumerate(bucket) if m.get("media_id") == media_id),
        None,
    )
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "media_requirement_not_found", "media_id": media_id},
        )
    patch = body.model_dump(exclude_unset=True)
    if "scene_id" in patch and patch["scene_id"] is not None:
        memory._assert_scene_exists(event_id, patch["scene_id"])
    row = dict(bucket[idx])
    row.update(patch)
    try:
        validated = MediaRequirement.model_validate(row)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"error": "validation_failed", "issues": ve.errors()},
        ) from ve
    out = validated.model_dump()
    bucket[idx] = out
    return {"ok": True, "media_requirement": out}


@router.delete("/events/{event_id}/media-requirements/{media_id}", status_code=200)
def delete_media_requirement(event_id: str, media_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    refs = memory._scenes_referencing_media(event_id, media_id)
    if refs:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "media_requirement_in_use",
                "scene_ids": refs,
                "message": "Remova o media_id das scenes antes de excluir este requisito.",
            },
        )
    bucket = memory._media_req_list(event_id)
    idx = next(
        (i for i, m in enumerate(bucket) if m.get("media_id") == media_id),
        None,
    )
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "media_requirement_not_found", "media_id": media_id},
        )
    del bucket[idx]
    return {"ok": True, "deleted_media_id": media_id}
