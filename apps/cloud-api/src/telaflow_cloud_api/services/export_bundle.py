"""Montagem de artefatos JSON de export (sem zip nem assinatura)."""

from __future__ import annotations

from datetime import datetime, timezone

from telaflow_cloud_api import memory


def _utc_iso_z() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def build_export_artifacts(
    event_id: str,
    *,
    export_id: str,
    generated_at: str,
) -> dict[str, object]:
    """
    Gera o conteúdo lógico dos arquivos do pack parcial (MVP sem zip).
    Alinhado a PACK_EXPORT_FEATURE_SPEC §6 — subset: event, draw-configs, media-manifest, manifest raiz.
    """
    ev = dict(memory._events_store[event_id])
    scenes = sorted(
        memory._scenes_list(event_id),
        key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")),
    )
    draws = sorted(
        memory._draw_configs_list(event_id),
        key=lambda d: (d.get("name", ""), d.get("draw_config_id", "")),
    )
    media = sorted(
        memory._media_req_list(event_id),
        key=lambda m: (m.get("label", ""), m.get("media_id", "")),
    )

    event_json: dict[str, object] = {
        "schema_version": "event_export.v1",
        "event_id": ev.get("event_id"),
        "organization_id": ev.get("organization_id"),
        "name": ev.get("name"),
        "scenes": [dict(s) for s in scenes],
    }

    draw_configs_json: object = [dict(d) for d in draws]

    media_manifest_json: dict[str, object] = {
        "schema_version": "media_manifest.v1",
        "event_id": event_id,
        "requirements": [dict(m) for m in media],
    }

    manifest_json: dict[str, object] = {
        "schema_version": "export_manifest.v1",
        "export_id": export_id,
        "generated_at": generated_at,
        "event_id": event_id,
        "organization_id": ev.get("organization_id"),
        "artifacts": [
            {"path": "event.json", "role": "event_snapshot"},
            {"path": "draw-configs.json", "role": "draw_configs"},
            {"path": "media-manifest.json", "role": "media_manifest"},
        ],
        "gate": {
            "export_readiness_schema": "export_readiness.v1",
        },
    }

    return {
        "manifest.json": manifest_json,
        "event.json": event_json,
        "draw-configs.json": draw_configs_json,
        "media-manifest.json": media_manifest_json,
    }


def new_export_id() -> str:
    return memory._new_export_id()


def utc_iso_z() -> str:
    return _utc_iso_z()
