"""
Export de pack mínimo (MVP): grava JSON no disco, sem ZIP nem assinatura.

Diretório base: variável de ambiente TELAFLOW_PACK_EXPORT_DIR
(padrão: <apps/cloud-api>/data/pack-exports).
Cada export cria subpasta nomeada pelo export_id.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from telaflow_cloud_api import memory


def _export_root() -> Path:
    raw = os.environ.get("TELAFLOW_PACK_EXPORT_DIR", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    # apps/cloud-api/data/pack-exports (relativo a este arquivo: services/ -> cloud-api/)
    return (Path(__file__).resolve().parents[2] / "data" / "pack-exports").resolve()


def _utc_iso_z() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _parse_iso_z(s: str) -> datetime:
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


def _add_days_iso_z(iso_z: str, days: int) -> str:
    dt = _parse_iso_z(iso_z).astimezone(timezone.utc) + timedelta(days=days)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def new_export_id() -> str:
    return memory._new_export_id()


def utc_iso_z() -> str:
    return _utc_iso_z()


def _canonical_json_bytes(obj: object) -> bytes:
    """UTF-8, LF, sem BOM — chaves ordenadas para diff estável."""
    text = json.dumps(
        obj,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return (text + "\n").encode("utf-8")


def _sorted_scenes(event_id: str) -> list[dict]:
    scenes = list(memory._scenes_list(event_id))
    scenes.sort(key=lambda s: (s.get("sort_order", 0), s.get("scene_id", "")))
    return scenes


def _referenced_draw_configs(event_id: str, scenes: list[dict]) -> list[dict]:
    ids: list[str] = []
    seen: set[str] = set()
    for s in scenes:
        did = s.get("draw_config_id")
        if did and did not in seen:
            seen.add(did)
            ids.append(did)
    out: list[dict] = []
    for did in ids:
        row = memory._draw_config_by_id(event_id, did)
        if row is not None:
            out.append(dict(row))
    return out


def _all_media_requirements(event_id: str) -> list[dict]:
    rows = list(memory._media_req_list(event_id))
    rows.sort(key=lambda m: (m.get("label", ""), m.get("media_id", "")))
    return [dict(m) for m in rows]


def _mvp_scene_type_presets() -> dict[str, dict[str, str]]:
    """
    Defaults por tipo de scene (Pack Authoring Semantics MVP).
    Alinhado a `BrandingSceneTypePresetsMvpSchema` — o Player pode usar quando a scene não traz `scene_behavior`.
    """
    return {
        "opening": {"default_behavior_mode": "standard"},
        "institutional": {"default_behavior_mode": "placard"},
        "sponsor": {"default_behavior_mode": "placard"},
        "draw": {"default_behavior_mode": "draw_operator_confirm"},
        "break": {"default_behavior_mode": "transition"},
        "closing": {"default_behavior_mode": "standard"},
    }


def build_pack_payloads(
    event_id: str,
    *,
    export_id: str,
    generated_at: str,
) -> dict[str, object]:
    """Monta os seis documentos JSON (antes de gravar no disco)."""
    ev = dict(memory._events_store[event_id])
    scenes = _sorted_scenes(event_id)
    draw_cfgs = _referenced_draw_configs(event_id, scenes)
    media_reqs = _all_media_requirements(event_id)

    event_json: dict[str, object] = {
        "schema_version": "event_export.v1",
        "event_id": ev.get("event_id"),
        "organization_id": ev.get("organization_id"),
        "name": ev.get("name"),
        "scenes": scenes,
    }

    draw_configs_json: dict[str, object] = {
        "schema_version": "draw_configs_pack.v1",
        "event_id": event_id,
        "export_id": export_id,
        "draw_configs": draw_cfgs,
    }

    media_manifest_json: dict[str, object] = {
        "schema_version": "media_manifest.v1",
        "event_id": event_id,
        "export_id": export_id,
        "requirements": media_reqs,
    }

    branding_json: dict[str, object] = {
        "schema_version": "branding_export.v1",
        "event_id": event_id,
        "organization_id": ev.get("organization_id"),
        "export_id": export_id,
        "resolved_at": generated_at,
        "source": "default_mvp",
        "tokens": {
            "primary_color": "#0a0a0a",
            "accent_color": "#2dd4bf",
            "font_family_sans": "system-ui, sans-serif",
        },
        "scene_type_presets": _mvp_scene_type_presets(),
    }

    valid_until = _add_days_iso_z(generated_at, 30)
    license_json: dict[str, object] = {
        "schema_version": "license_export.v1",
        "organization_id": ev.get("organization_id"),
        "event_id": event_id,
        "export_id": export_id,
        "issued_at": generated_at,
        "valid_from": generated_at,
        "valid_until": valid_until,
        "scope": "event_player_binding_mvp",
        "note": "Licença mínima para MVP de export; não substitui contrato comercial ou assinatura futura.",
    }

    manifest_json: dict[str, object] = {
        "schema_version": "pack_manifest.v1",
        "pack_format": "telaflow_direct_export_mvp",
        "export_id": export_id,
        "generated_at": generated_at,
        "event_id": event_id,
        "organization_id": ev.get("organization_id"),
        "artifacts": [
            {"path": "event.json", "role": "event_snapshot"},
            {"path": "draw-configs.json", "role": "draw_configs"},
            {"path": "media-manifest.json", "role": "media_manifest"},
            {"path": "branding.json", "role": "branding"},
            {"path": "license.json", "role": "license"},
        ],
        "gate": {"export_readiness_schema": "export_readiness.v1"},
    }

    return {
        "manifest.json": manifest_json,
        "event.json": event_json,
        "draw-configs.json": draw_configs_json,
        "media-manifest.json": media_manifest_json,
        "branding.json": branding_json,
        "license.json": license_json,
    }


def write_pack_to_directory(
    export_dir: Path,
    artifacts: dict[str, object],
) -> list[str]:
    """Grava arquivos; manifest.json por último (ponto de entrada do pack)."""
    export_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for name in (
        "event.json",
        "draw-configs.json",
        "media-manifest.json",
        "branding.json",
        "license.json",
        "manifest.json",
    ):
        payload = artifacts[name]
        target = export_dir / name
        target.write_bytes(_canonical_json_bytes(payload))
        written.append(name)
    return written


def run_pack_export_for_ready_event(event_id: str) -> dict[str, object]:
    """
    Gera pack completo no disco. O caller deve garantir export_readiness.ready == true.
    Retorna metadados + artefatos (dict) para a resposta HTTP.
    """
    export_id = new_export_id()
    generated_at = utc_iso_z()
    artifacts = build_pack_payloads(
        event_id,
        export_id=export_id,
        generated_at=generated_at,
    )
    root = _export_root()
    root.mkdir(parents=True, exist_ok=True)
    export_dir = root / export_id
    if export_dir.exists():
        # colisão extremamente improvável — tenta novo id uma vez
        export_id = new_export_id()
        generated_at = utc_iso_z()
        artifacts = build_pack_payloads(
            event_id,
            export_id=export_id,
            generated_at=generated_at,
        )
        export_dir = root / export_id
    files = write_pack_to_directory(export_dir, artifacts)
    return {
        "export_id": export_id,
        "generated_at": generated_at,
        "export_directory": str(export_dir),
        "files_written": files,
        "artifacts": artifacts,
    }
