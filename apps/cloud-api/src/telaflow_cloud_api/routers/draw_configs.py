"""DrawConfig por evento."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from telaflow_cloud_api.domain import DrawConfig, DrawConfigCreate, DrawConfigUpdate
from telaflow_cloud_api import memory

router = APIRouter(tags=["draw-configs"])


@router.get("/events/{event_id}/draw-configs")
def list_draw_configs(event_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    rows = list(memory._draw_configs_list(event_id))
    rows.sort(key=lambda d: (d.get("name", ""), d.get("draw_config_id", "")))
    return {"draw_configs": rows}


@router.post("/events/{event_id}/draw-configs", status_code=201)
def create_draw_config(event_id: str, body: DrawConfigCreate) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._draw_configs_list(event_id)
    draw_config_id = memory._new_draw_config_id()
    for _ in range(8):
        if not any(d.get("draw_config_id") == draw_config_id for d in bucket):
            break
        draw_config_id = memory._new_draw_config_id()
    else:
        raise HTTPException(
            status_code=500,
            detail={"error": "draw_config_id_generation_failed"},
        )
    dc = DrawConfig(
        draw_config_id=draw_config_id,
        event_id=event_id,
        name=body.name,
        max_winners=body.max_winners,
        notes=body.notes,
        enabled=body.enabled,
        draw_type=body.draw_type,
        number_range=body.number_range,
    )
    payload = dc.model_dump()
    bucket.append(payload)
    return {"ok": True, "draw_config": payload}


@router.get("/events/{event_id}/draw-configs/{draw_config_id}")
def get_draw_config(event_id: str, draw_config_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    row = memory._draw_config_by_id(event_id, draw_config_id)
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
) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._draw_configs_list(event_id)
    idx = next(
        (i for i, d in enumerate(bucket) if d.get("draw_config_id") == draw_config_id),
        None,
    )
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    row = dict(bucket[idx])
    row.update(body.model_dump(exclude_unset=True))
    try:
        validated = DrawConfig.model_validate(row)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"error": "validation_failed", "issues": ve.errors()},
        ) from ve
    out = validated.model_dump()
    bucket[idx] = out
    return {"ok": True, "draw_config": out}


@router.delete("/events/{event_id}/draw-configs/{draw_config_id}", status_code=200)
def delete_draw_config(event_id: str, draw_config_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    refs = memory._scenes_referencing_draw(event_id, draw_config_id)
    if refs:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "draw_config_in_use",
                "scene_ids": refs,
                "message": "Remova o vínculo nas scenes antes de excluir este sorteio.",
            },
        )
    bucket = memory._draw_configs_list(event_id)
    idx = next(
        (i for i, d in enumerate(bucket) if d.get("draw_config_id") == draw_config_id),
        None,
    )
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    del bucket[idx]
    return {"ok": True, "deleted_draw_config_id": draw_config_id}
