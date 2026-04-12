"""Export readiness e export JSON (sem zip / assinatura)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from telaflow_cloud_api import memory
from telaflow_cloud_api.services import export_bundle

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
    Gera snapshot JSON do evento (artefatos lógicos). Exige `export_readiness.ready == true`.
    Não gera ZIP nem assinatura (MVP incremental).
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
    export_id = export_bundle.new_export_id()
    generated_at = export_bundle.utc_iso_z()
    artifacts = export_bundle.build_export_artifacts(
        event_id,
        export_id=export_id,
        generated_at=generated_at,
    )
    return {
        "ok": True,
        "export_id": export_id,
        "generated_at": generated_at,
        "artifacts": artifacts,
    }
