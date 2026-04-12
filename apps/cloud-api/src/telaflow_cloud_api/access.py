"""Verificações de acesso por organização."""

from __future__ import annotations

from fastapi import HTTPException

from telaflow_cloud_api.persistence.repository import Repository


def assert_event_in_org(repo: Repository, event_id: str, organization_id: str) -> None:
    row = repo.get_event(event_id)
    if row is None or row["organization_id"] != organization_id:
        raise HTTPException(
            status_code=404,
            detail={"error": "event_not_found", "event_id": event_id},
        )
