"""Export readiness e geração de pack."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from telaflow_cloud_api.access import assert_event_in_org
from telaflow_cloud_api.export_readiness import compute_export_readiness
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.repository import Repository
from telaflow_cloud_api.services import pack_export
from telaflow_cloud_api.tenancy import get_organization_id

router = APIRouter(tags=["export"])


@router.get("/events/{event_id}/export-readiness")
def get_export_readiness(
    event_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
) -> dict:
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    body = compute_export_readiness(
        event_id,
        repo.list_scenes(event_id),
        repo.list_draw_configs(event_id),
        repo.list_media_requirements(event_id),
    )
    return {"export_readiness": body}


@router.post("/events/{event_id}/export", status_code=200)
def run_export(
    event_id: str,
    db: Session = Depends(get_session),
    organization_id: str = Depends(get_organization_id),
    archive: str | None = Query(None, description="Use `zip` para gerar arquivo .zip do pack."),
) -> dict:
    """
    Gera pack mínimo em diretório dedicado ao export_id.

    Exige export_readiness.ready == true; caso contrário 409 estruturado.
    `?archive=zip` também grava `{export_id}.zip` junto à pasta do export.
    """
    repo = Repository(db)
    assert_event_in_org(repo, event_id, organization_id)
    readiness = compute_export_readiness(
        event_id,
        repo.list_scenes(event_id),
        repo.list_draw_configs(event_id),
        repo.list_media_requirements(event_id),
    )
    if not readiness.get("ready"):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "export_not_ready",
                "message": "Corrija os bloqueantes antes de exportar.",
                "export_readiness": readiness,
            },
        )
    draw_attendees = _build_draw_attendees_document(repo, event_id)
    write_zip = (archive or "").lower() == "zip"
    result = pack_export.run_pack_export_for_ready_event(
        repo,
        event_id,
        draw_attendees_document=draw_attendees,
        write_zip=write_zip,
    )
    return {
        "ok": True,
        "export_id": result["export_id"],
        "generated_at": result["generated_at"],
        "export_directory": result["export_directory"],
        "files_written": result["files_written"],
        "artifacts": result["artifacts"],
        "zip_path": result.get("zip_path"),
        "zip_checksum_sha256": result.get("zip_checksum_sha256"),
    }


def _build_draw_attendees_document(repo: Repository, event_id: str) -> dict[str, object] | None:
    """Agrega inscrições por draw_config (para `draw-attendees.json` no pack)."""
    sessions = repo.list_registration_sessions(event_id)
    if not sessions:
        return None
    by_draw: dict[str, list[dict]] = {}
    for sess in sessions:
        regs = repo.list_registrations(sess.id)
        entries = [
            {
                "registration_id": r.id,
                "display_name": r.display_name,
                "assigned_number": r.assigned_number,
            }
            for r in regs
        ]
        by_draw.setdefault(sess.draw_config_id, []).extend(entries)
    if not any(by_draw.values()):
        return None
    return {
        "schema_version": "draw_attendees_pack.v1",
        "event_id": event_id,
        "entries_by_draw_config_id": by_draw,
    }
