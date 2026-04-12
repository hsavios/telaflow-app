"""Rotas de scenes por evento."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from telaflow_cloud_api.domain import Scene, SceneCreate, SceneReorderBody, SceneUpdate
from telaflow_cloud_api import memory

router = APIRouter(tags=["scenes"])


@router.get("/events/{event_id}/scenes")
def list_scenes(event_id: str) -> dict:
    """Lista scenes do evento, ordenadas por sort_order."""
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    rows = list(memory._scenes_list(event_id))
    rows.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    return {"scenes": rows}


@router.post("/events/{event_id}/scenes/reorder", status_code=200)
def reorder_scenes(event_id: str, body: SceneReorderBody) -> dict:
    """
    Define a ordem das scenes: `scene_ids` deve listar todos os ids atuais do evento,
    cada um exatamente uma vez, na ordem desejada.
    Atribui `sort_order` de 0 a n-1 na ordem recebida.
    """
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._scenes_list(event_id)
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
    memory._scenes_by_event[event_id] = new_bucket
    return {"ok": True, "scenes": new_bucket}


@router.post("/events/{event_id}/scenes", status_code=201)
def create_scene(event_id: str, body: SceneCreate) -> dict:
    """Cria scene; `scene_id` gerado no servidor; `sort_order` único por evento."""
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._scenes_list(event_id)
    if memory._sort_order_used(bucket, body.sort_order, None):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "sort_order_conflict",
                "sort_order": body.sort_order,
                "event_id": event_id,
            },
        )
    memory._validate_scene_links(
        event_id,
        body.type,
        body.media_id,
        body.draw_config_id,
    )
    scene_id = memory._new_scene_id()
    for _ in range(8):
        if not any(s.get("scene_id") == scene_id for s in bucket):
            break
        scene_id = memory._new_scene_id()
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
    )
    payload = scene.model_dump()
    bucket.append(payload)
    return {"ok": True, "scene": payload}


@router.get("/events/{event_id}/scenes/{scene_id}")
def get_scene(event_id: str, scene_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._scenes_list(event_id)
    idx = memory._scene_index(bucket, scene_id)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    return {"scene": bucket[idx]}


@router.patch("/events/{event_id}/scenes/{scene_id}")
def update_scene(event_id: str, scene_id: str, body: SceneUpdate) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._scenes_list(event_id)
    idx = memory._scene_index(bucket, scene_id)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    patch = body.model_dump(exclude_unset=True)
    if "sort_order" in patch and memory._sort_order_used(
        bucket, patch["sort_order"], scene_id
    ):
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
    row.update(patch)
    memory._validate_scene_links(
        event_id,
        row["type"],
        row.get("media_id"),
        row.get("draw_config_id"),
    )
    try:
        validated = Scene.model_validate(row)
    except ValidationError as ve:
        raise HTTPException(
            status_code=422,
            detail={"error": "validation_failed", "issues": ve.errors()},
        ) from ve
    out = validated.model_dump()
    bucket[idx] = out
    return {"ok": True, "scene": out}


@router.delete("/events/{event_id}/scenes/{scene_id}", status_code=200)
def delete_scene(event_id: str, scene_id: str) -> dict:
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = memory._scenes_list(event_id)
    idx = memory._scene_index(bucket, scene_id)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    del bucket[idx]
    memory._compact_sort_orders(bucket)
    memory._clear_media_req_scene_hints(event_id, scene_id)
    return {"ok": True, "deleted_scene_id": scene_id}
