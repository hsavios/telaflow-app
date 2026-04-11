"""FastAPI entry — skeleton funcional mínimo (PHASE_1_EXECUTION_SPEC)."""

from __future__ import annotations

import os
import secrets

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from telaflow_cloud_api.domain import (
    DrawConfig,
    DrawConfigCreate,
    DrawConfigUpdate,
    Event,
    MediaRequirement,
    MediaRequirementCreate,
    MediaRequirementUpdate,
    Scene,
    SceneCreate,
    SceneReorderBody,
    SceneUpdate,
)

app = FastAPI(
    title="TelaFlow Cloud API",
    version="0.1.0",
    description="API da TelaFlow Cloud — fase inicial: governança e integração, sem persistência completa.",
)

# Armazenamento fake (Fase 1): event_id -> payload serializável
_events_store: dict[str, dict] = {}
# event_id -> lista de scenes (dict serializável)
_scenes_by_event: dict[str, list[dict]] = {}
# event_id -> DrawConfigs
_draw_configs_by_event: dict[str, list[dict]] = {}
# event_id -> MediaRequirements (manifesto por evento)
_media_requirements_by_event: dict[str, list[dict]] = {}


def _new_scene_id() -> str:
    """ID opaco compatível com SceneId (mín. 12 caracteres, [a-zA-Z0-9_-])."""
    return f"scn_{secrets.token_hex(6)}_{secrets.token_hex(4)}"


def _new_draw_config_id() -> str:
    return f"dcf_{secrets.token_hex(6)}_{secrets.token_hex(4)}"


def _new_media_id() -> str:
    return f"med_{secrets.token_hex(6)}_{secrets.token_hex(4)}"


def _scenes_list(event_id: str) -> list[dict]:
    if event_id not in _scenes_by_event:
        _scenes_by_event[event_id] = []
    return _scenes_by_event[event_id]


def _draw_configs_list(event_id: str) -> list[dict]:
    if event_id not in _draw_configs_by_event:
        _draw_configs_by_event[event_id] = []
    return _draw_configs_by_event[event_id]


def _media_req_list(event_id: str) -> list[dict]:
    if event_id not in _media_requirements_by_event:
        _media_requirements_by_event[event_id] = []
    return _media_requirements_by_event[event_id]


def _scene_index(bucket: list[dict], scene_id: str) -> int | None:
    for i, s in enumerate(bucket):
        if s.get("scene_id") == scene_id:
            return i
    return None


def _draw_config_by_id(event_id: str, draw_config_id: str) -> dict | None:
    for d in _draw_configs_list(event_id):
        if d.get("draw_config_id") == draw_config_id:
            return d
    return None


def _media_by_id(event_id: str, media_id: str) -> dict | None:
    for m in _media_req_list(event_id):
        if m.get("media_id") == media_id:
            return m
    return None


def _sort_order_used(bucket: list[dict], sort_order: int, exclude_scene_id: str | None) -> bool:
    for s in bucket:
        if exclude_scene_id and s.get("scene_id") == exclude_scene_id:
            continue
        if s.get("sort_order") == sort_order:
            return True
    return False


def _compact_sort_orders(bucket: list[dict]) -> None:
    """Renumera sort_order 0..n-1 pela ordem atual (sort_order, scene_id)."""
    bucket.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    for i, s in enumerate(bucket):
        s["sort_order"] = i


def _scenes_referencing_draw(event_id: str, draw_config_id: str) -> list[str]:
    return [s["scene_id"] for s in _scenes_list(event_id) if s.get("draw_config_id") == draw_config_id]


def _scenes_referencing_media(event_id: str, media_id: str) -> list[str]:
    return [s["scene_id"] for s in _scenes_list(event_id) if s.get("media_id") == media_id]


def _assert_scene_exists(event_id: str, scene_id: str) -> None:
    if _scene_index(_scenes_list(event_id), scene_id) is None:
        raise HTTPException(
            status_code=400,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )


def _validate_scene_links(
    event_id: str,
    scene_type: str,
    media_id: str | None,
    draw_config_id: str | None,
) -> None:
    if draw_config_id and _draw_config_by_id(event_id, draw_config_id) is None:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "draw_config_not_found",
                "draw_config_id": draw_config_id,
            },
        )
    if media_id and _media_by_id(event_id, media_id) is None:
        raise HTTPException(
            status_code=400,
            detail={"error": "media_id_not_found", "media_id": media_id},
        )
    if scene_type == "draw" and not draw_config_id:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "draw_scene_requires_draw_config",
                "message": "Scene do tipo draw exige draw_config_id do mesmo evento.",
            },
        )


def _clear_media_req_scene_hints(event_id: str, scene_id: str) -> None:
    for m in _media_req_list(event_id):
        if m.get("scene_id") == scene_id:
            m["scene_id"] = None


def _sort_order_invariant_ok(scenes_sorted: list[dict]) -> bool:
    """§16.1 — ordem explícita 0..n-1 sem buracos nem duplicados."""
    n = len(scenes_sorted)
    if n == 0:
        return True
    orders = [s.get("sort_order") for s in scenes_sorted]
    return len(orders) == n and set(orders) == set(range(n))


def _scene_readiness_row(event_id: str, scene: dict) -> dict:
    """
    Por-scene: códigos §16.1 + lifecycle §16.3 (draft / blocked / warning / ready).
    """
    sid = scene.get("scene_id", "")
    name = (scene.get("name") or "").strip()
    st = scene.get("type")
    mid = scene.get("media_id")
    did = scene.get("draw_config_id")
    blocking_codes: list[str] = []
    warning_codes: list[str] = []

    if not name:
        blocking_codes.append("scene_name_empty")
    if not st:
        blocking_codes.append("scene_type_missing")

    if mid and _media_by_id(event_id, mid) is None:
        blocking_codes.append("scene_media_unknown")
    if did and _draw_config_by_id(event_id, did) is None:
        blocking_codes.append("scene_draw_unknown")
    if st == "draw" and not did:
        blocking_codes.append("draw_scene_missing_trigger")

    if st == "sponsor" and not mid:
        warning_codes.append("sponsor_scene_no_primary_media")

    if did:
        dc = _draw_config_by_id(event_id, did)
        if dc and dc.get("enabled") is False:
            warning_codes.append("draw_config_disabled_referenced")

    if mid:
        mr = _media_by_id(event_id, mid)
        if mr and mr.get("scene_id") and mr.get("scene_id") != sid:
            warning_codes.append("media_requirement_scene_hint_mismatch")

    if not name or not st:
        lifecycle = "draft"
    elif blocking_codes:
        lifecycle = "blocked"
    elif warning_codes:
        lifecycle = "warning"
    else:
        lifecycle = "ready"

    return {
        "scene_id": sid,
        "sort_order": int(scene.get("sort_order", 0)),
        "lifecycle": lifecycle,
        "blocking_codes": blocking_codes,
        "warning_codes": warning_codes,
    }


def _issue(
    severity: str,
    code: str,
    *,
    message: str | None = None,
    scene_id: str | None = None,
    media_id: str | None = None,
    draw_config_id: str | None = None,
    label: str | None = None,
    name: str | None = None,
) -> dict:
    row: dict = {"severity": severity, "code": code}
    if message is not None:
        row["message"] = message
    if scene_id is not None:
        row["scene_id"] = scene_id
    if media_id is not None:
        row["media_id"] = media_id
    if draw_config_id is not None:
        row["draw_config_id"] = draw_config_id
    if label is not None:
        row["label"] = label
    if name is not None:
        row["name"] = name
    return row


def _compute_export_readiness(event_id: str) -> dict:
    """
    Contrato alinhado a `ExportReadinessV1Schema` em @telaflow/shared-contracts
    (schema_version export_readiness.v1).
    """
    blocking: list[dict] = []
    warnings: list[dict] = []
    scenes = list(_scenes_list(event_id))
    scenes.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))

    sort_ok = _sort_order_invariant_ok(scenes)
    if scenes and not sort_ok:
        blocking.append(
            _issue(
                "blocking",
                "sort_order_invalid",
                message="sort_order deve ser 0..n-1 sem duplicados (uma sequência por evento).",
            ),
        )

    if not scenes:
        blocking.append(
            _issue(
                "blocking",
                "no_scenes",
                message="Cadastre pelo menos uma scene para exportar o roteiro.",
            ),
        )

    if scenes and all(s.get("enabled") is False for s in scenes):
        blocking.append(
            _issue(
                "blocking",
                "all_scenes_disabled",
                message="Habilite ao menos uma scene para o roteiro exportável.",
            ),
        )

    scene_evaluations: list[dict] = []
    lifecycle_counts = {"draft": 0, "blocked": 0, "warning": 0, "ready": 0}

    for s in scenes:
        ev = _scene_readiness_row(event_id, s)
        scene_evaluations.append(ev)
        lifecycle_counts[ev["lifecycle"]] = lifecycle_counts.get(ev["lifecycle"], 0) + 1
        sid = ev["scene_id"]
        for wcode in ev["warning_codes"]:
            if wcode == "sponsor_scene_no_primary_media":
                warnings.append(
                    _issue(
                        "warning",
                        wcode,
                        scene_id=sid,
                        message="Scene patrocinador sem mídia principal (aviso §16.1).",
                    ),
                )
            elif wcode == "draw_config_disabled_referenced":
                warnings.append(
                    _issue(
                        "warning",
                        wcode,
                        scene_id=sid,
                        message="Scene referencia sorteio desabilitado.",
                    ),
                )
            elif wcode == "media_requirement_scene_hint_mismatch":
                warnings.append(
                    _issue(
                        "warning",
                        wcode,
                        scene_id=sid,
                        message="Dica de scene no requisito de mídia difere da scene que usa o slot.",
                    ),
                )
            else:
                warnings.append(_issue("warning", wcode, scene_id=sid))
        for code in ev["blocking_codes"]:
            if code == "scene_name_empty":
                blocking.append(_issue("blocking", code, scene_id=sid))
            elif code == "scene_type_missing":
                blocking.append(_issue("blocking", code, scene_id=sid))
            elif code == "scene_media_unknown":
                blocking.append(
                    _issue(
                        "blocking",
                        code,
                        scene_id=sid,
                        media_id=s.get("media_id"),
                    ),
                )
            elif code == "scene_draw_unknown":
                blocking.append(
                    _issue(
                        "blocking",
                        code,
                        scene_id=sid,
                        draw_config_id=s.get("draw_config_id"),
                    ),
                )
            elif code == "draw_scene_missing_trigger":
                blocking.append(_issue("blocking", code, scene_id=sid))
            else:
                blocking.append(_issue("blocking", code, scene_id=sid))

    for m in _media_req_list(event_id):
        if m.get("required") and m.get("media_id"):
            mid = m["media_id"]
            if not any(sc.get("media_id") == mid for sc in scenes):
                warnings.append(
                    _issue(
                        "warning",
                        "required_media_not_linked",
                        media_id=mid,
                        label=m.get("label"),
                        message="Slot obrigatório sem nenhuma scene referenciando este media_id (§16.1 — aviso).",
                    ),
                )

    used_draws = {s.get("draw_config_id") for s in scenes if s.get("draw_config_id")}
    for d in _draw_configs_list(event_id):
        dcid = d.get("draw_config_id")
        if dcid and dcid not in used_draws:
            warnings.append(
                _issue(
                    "warning",
                    "draw_config_unused",
                    draw_config_id=dcid,
                    name=d.get("name"),
                    message="Sorteio cadastrado mas não referenciado em nenhuma scene.",
                ),
            )

    ready = len(blocking) == 0
    return {
        "schema_version": "export_readiness.v1",
        "ready": ready,
        "sort_order_ok": sort_ok,
        "blocking": blocking,
        "warnings": warnings,
        "lifecycle_counts": lifecycle_counts,
        "scene_evaluations": scene_evaluations,
        "scene_count": len(scenes),
        "draw_config_count": len(_draw_configs_list(event_id)),
        "media_requirement_count": len(_media_req_list(event_id)),
    }


_cors_raw = os.environ.get(
    "CLOUD_API_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://app.telaflow.ia.br",
)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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


@app.get("/events/{event_id}/export-readiness")
def export_readiness(event_id: str) -> dict:
    """
    Checagens mínimas server-side para futuro ExportPackage.
    Não gera pack nem assinatura — só estrutura e consistência declarável.
    """
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    body = _compute_export_readiness(event_id)
    return {"ok": True, "export_readiness": body}


@app.get("/events/{event_id}/scenes")
def list_scenes(event_id: str) -> dict:
    """Lista scenes do evento, ordenadas por sort_order."""
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    rows = list(_scenes_list(event_id))
    rows.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    return {"scenes": rows}


@app.post("/events/{event_id}/scenes/reorder", status_code=200)
def reorder_scenes(event_id: str, body: SceneReorderBody) -> dict:
    """
    Define a ordem das scenes: `scene_ids` deve listar todos os ids atuais do evento,
    cada um exatamente uma vez, na ordem desejada.
    Atribui `sort_order` de 0 a n-1 na ordem recebida.
    """
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _scenes_list(event_id)
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
    _scenes_by_event[event_id] = new_bucket
    return {"ok": True, "scenes": new_bucket}


@app.post("/events/{event_id}/scenes", status_code=201)
def create_scene(event_id: str, body: SceneCreate) -> dict:
    """Cria scene; `scene_id` gerado no servidor; `sort_order` único por evento."""
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _scenes_list(event_id)
    if _sort_order_used(bucket, body.sort_order, None):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "sort_order_conflict",
                "sort_order": body.sort_order,
                "event_id": event_id,
            },
        )
    _validate_scene_links(
        event_id,
        body.type,
        body.media_id,
        body.draw_config_id,
    )
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
        media_id=body.media_id,
        draw_config_id=body.draw_config_id,
    )
    payload = scene.model_dump()
    bucket.append(payload)
    return {"ok": True, "scene": payload}


@app.get("/events/{event_id}/scenes/{scene_id}")
def get_scene(event_id: str, scene_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _scenes_list(event_id)
    idx = _scene_index(bucket, scene_id)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    return {"scene": bucket[idx]}


@app.patch("/events/{event_id}/scenes/{scene_id}")
def update_scene(event_id: str, scene_id: str, body: SceneUpdate) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _scenes_list(event_id)
    idx = _scene_index(bucket, scene_id)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    patch = body.model_dump(exclude_unset=True)
    if "sort_order" in patch and _sort_order_used(
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
    _validate_scene_links(
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


@app.delete("/events/{event_id}/scenes/{scene_id}", status_code=200)
def delete_scene(event_id: str, scene_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _scenes_list(event_id)
    idx = _scene_index(bucket, scene_id)
    if idx is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "scene_not_found", "scene_id": scene_id},
        )
    del bucket[idx]
    _compact_sort_orders(bucket)
    _clear_media_req_scene_hints(event_id, scene_id)
    return {"ok": True, "deleted_scene_id": scene_id}


# --- DrawConfig (módulo do evento) ---


@app.get("/events/{event_id}/draw-configs")
def list_draw_configs(event_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    rows = list(_draw_configs_list(event_id))
    rows.sort(key=lambda d: (d.get("name", ""), d.get("draw_config_id", "")))
    return {"draw_configs": rows}


@app.post("/events/{event_id}/draw-configs", status_code=201)
def create_draw_config(event_id: str, body: DrawConfigCreate) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _draw_configs_list(event_id)
    draw_config_id = _new_draw_config_id()
    for _ in range(8):
        if not any(d.get("draw_config_id") == draw_config_id for d in bucket):
            break
        draw_config_id = _new_draw_config_id()
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
    )
    payload = dc.model_dump()
    bucket.append(payload)
    return {"ok": True, "draw_config": payload}


@app.get("/events/{event_id}/draw-configs/{draw_config_id}")
def get_draw_config(event_id: str, draw_config_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    row = _draw_config_by_id(event_id, draw_config_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "draw_config_not_found", "draw_config_id": draw_config_id},
        )
    return {"draw_config": row}


@app.patch("/events/{event_id}/draw-configs/{draw_config_id}")
def update_draw_config(
    event_id: str,
    draw_config_id: str,
    body: DrawConfigUpdate,
) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _draw_configs_list(event_id)
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


@app.delete("/events/{event_id}/draw-configs/{draw_config_id}", status_code=200)
def delete_draw_config(event_id: str, draw_config_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    refs = _scenes_referencing_draw(event_id, draw_config_id)
    if refs:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "draw_config_in_use",
                "scene_ids": refs,
                "message": "Remova o vínculo nas scenes antes de excluir este sorteio.",
            },
        )
    bucket = _draw_configs_list(event_id)
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


# --- MediaRequirement (manifesto por evento) ---


@app.get("/events/{event_id}/media-requirements")
def list_media_requirements(event_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    rows = list(_media_req_list(event_id))
    rows.sort(key=lambda m: (m.get("label", ""), m.get("media_id", "")))
    return {"media_requirements": rows}


@app.post("/events/{event_id}/media-requirements", status_code=201)
def create_media_requirement(event_id: str, body: MediaRequirementCreate) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    if body.scene_id:
        _assert_scene_exists(event_id, body.scene_id)
    bucket = _media_req_list(event_id)
    media_id = _new_media_id()
    for _ in range(8):
        if not any(m.get("media_id") == media_id for m in bucket):
            break
        media_id = _new_media_id()
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


@app.get("/events/{event_id}/media-requirements/{media_id}")
def get_media_requirement(event_id: str, media_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    row = _media_by_id(event_id, media_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "media_requirement_not_found", "media_id": media_id},
        )
    return {"media_requirement": row}


@app.patch("/events/{event_id}/media-requirements/{media_id}")
def update_media_requirement(
    event_id: str,
    media_id: str,
    body: MediaRequirementUpdate,
) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    bucket = _media_req_list(event_id)
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
        _assert_scene_exists(event_id, patch["scene_id"])
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


@app.delete("/events/{event_id}/media-requirements/{media_id}", status_code=200)
def delete_media_requirement(event_id: str, media_id: str) -> dict:
    if event_id not in _events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    refs = _scenes_referencing_media(event_id, media_id)
    if refs:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "media_requirement_in_use",
                "scene_ids": refs,
                "message": "Remova o media_id das scenes antes de excluir este requisito.",
            },
        )
    bucket = _media_req_list(event_id)
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
