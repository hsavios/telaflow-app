"""Export readiness e pack export (JSON no disco; sem ZIP / assinatura)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from telaflow_cloud_api import memory
from telaflow_cloud_api.services import pack_export

router = APIRouter(tags=["export"])


@router.get("/events/{event_id}/export-readiness")
def export_readiness(event_id: str) -> dict:
    """
    Checagens mínimas server-side para futuro ExportPackage.
    Não gera pack nem assinatura — só estrutura e consistência declarável.
    """
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    body = memory._compute_export_readiness(event_id)
    return {"ok": True, "export_readiness": body}


@router.post("/events/{event_id}/export", status_code=200)
def run_export(event_id: str) -> dict:
    """
    Gera pack mínimo (MVP) em diretório dedicado ao export_id.

    Exige export_readiness.ready == true; caso contrário 409 estruturado.
    Não inclui mídia binária, ZIP nem assinatura criptográfica.
    """
    if event_id not in memory._events_store:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
    readiness = memory._compute_export_readiness(event_id)
    if not readiness.get("ready"):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "export_not_ready",
                "message": "Corrija os bloqueantes antes de exportar.",
                "export_readiness": readiness,
            },
        )
    result = pack_export.run_pack_export_for_ready_event(event_id)
    return {
        "ok": True,
        "export_id": result["export_id"],
        "generated_at": result["generated_at"],
        "export_directory": result["export_directory"],
        "files_written": result["files_written"],
        "artifacts": result["artifacts"],
    }
