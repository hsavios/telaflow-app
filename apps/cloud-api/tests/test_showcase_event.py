"""Evento de demonstração semeado na memória (roteiro completo)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from telaflow_cloud_api.memory import SHOWCASE_EVENT_ID


def test_showcase_event_export_readiness_ready(cliente: TestClient) -> None:
    r = cliente.get(f"/events/{SHOWCASE_EVENT_ID}/export-readiness")
    assert r.status_code == 200, r.text
    body = r.json()["export_readiness"]
    assert body["ready"] is True, body
    assert body["scene_count"] == 5
    assert body["sort_order_ok"] is True


def test_showcase_event_listado(cliente: TestClient) -> None:
    r = cliente.get("/events")
    assert r.status_code == 200
    ids = {e["event_id"] for e in r.json()["events"]}
    assert SHOWCASE_EVENT_ID in ids


def test_showcase_export_pack_200(
    cliente: TestClient,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TELAFLOW_PACK_EXPORT_DIR", str(tmp_path))
    r = cliente.post(f"/events/{SHOWCASE_EVENT_ID}/export")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("export_id")
    assert Path(body["export_directory"]).is_dir()
