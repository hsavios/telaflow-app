"""Cálculo de export readiness (puro) — listas de dicts vindas do repositório."""

from __future__ import annotations


def _draw_config_by_id(draw_configs: list[dict], draw_config_id: str) -> dict | None:
    for d in draw_configs:
        if d.get("draw_config_id") == draw_config_id:
            return d
    return None


def _media_by_id(media_reqs: list[dict], media_id: str) -> dict | None:
    for m in media_reqs:
        if m.get("media_id") == media_id:
            return m
    return None


def _sort_order_invariant_ok(scenes_sorted: list[dict]) -> bool:
    n = len(scenes_sorted)
    if n == 0:
        return True
    orders = [s.get("sort_order") for s in scenes_sorted]
    return len(orders) == n and set(orders) == set(range(n))


def _scene_readiness_row(
    event_id: str,
    scene: dict,
    *,
    draw_configs: list[dict],
    media_reqs: list[dict],
) -> dict:
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

    if mid and _media_by_id(media_reqs, mid) is None:
        blocking_codes.append("scene_media_unknown")
    if did and _draw_config_by_id(draw_configs, did) is None:
        blocking_codes.append("scene_draw_unknown")
    if st == "draw" and not did:
        blocking_codes.append("draw_scene_missing_trigger")

    if st == "sponsor" and not mid:
        warning_codes.append("sponsor_scene_no_primary_media")

    if did:
        dc = _draw_config_by_id(draw_configs, did)
        if dc and dc.get("enabled") is False:
            warning_codes.append("draw_config_disabled_referenced")

    if mid:
        mr = _media_by_id(media_reqs, mid)
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


def compute_export_readiness(
    event_id: str,
    scenes: list[dict],
    draw_configs: list[dict],
    media_reqs: list[dict],
) -> dict:
    blocking: list[dict] = []
    warnings: list[dict] = []
    scenes = list(scenes)
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
        ev = _scene_readiness_row(event_id, s, draw_configs=draw_configs, media_reqs=media_reqs)
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

    for m in media_reqs:
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
    for d in draw_configs:
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
        "draw_config_count": len(draw_configs),
        "media_requirement_count": len(media_reqs),
    }
