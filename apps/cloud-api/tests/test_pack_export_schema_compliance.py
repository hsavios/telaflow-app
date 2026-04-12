"""
Conformidade estrutural do pack exportado (MVP) com @telaflow/shared-contracts.

Fluxo: POST /events → POST scene mínima → POST export → ler JSON do disco → jsonschema.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from schema_helpers import validador_para_arquivo, validar_instancia


def _criar_evento_pronto_para_export(cliente: TestClient, tmp_path: Path) -> str:
    """Evento com uma scene válida e export_readiness.ready == true."""
    event_id = "evt_packcompliance01"
    org_id = "org_packcompliance1"
    r = cliente.post(
        "/events",
        json={
            "event_id": event_id,
            "organization_id": org_id,
            "name": "Evento conformidade pack",
        },
    )
    assert r.status_code == 201, r.text
    r2 = cliente.post(
        f"/events/{event_id}/scenes",
        json={
            "sort_order": 0,
            "type": "opening",
            "name": "Abertura",
            "enabled": True,
        },
    )
    assert r2.status_code == 201, r2.text
    ready = cliente.get(f"/events/{event_id}/export-readiness")
    assert ready.status_code == 200
    body = ready.json()["export_readiness"]
    assert body["ready"] is True, body
    os.environ["TELAFLOW_PACK_EXPORT_DIR"] = str(tmp_path)
    return event_id


def test_export_grava_seis_jsons_validos_pelos_schemas(
    cliente: TestClient,
    diretorio_schemas_contratos: Path,
    tmp_path: Path,
) -> None:
    event_id = _criar_evento_pronto_para_export(cliente, tmp_path)
    resp = cliente.post(f"/events/{event_id}/export")
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    export_id = payload["export_id"]
    export_dir = Path(payload["export_directory"])
    assert export_dir.is_dir()
    assert export_dir.name == export_id

    nomes = [
        "manifest.json",
        "event.json",
        "draw-configs.json",
        "media-manifest.json",
        "branding.json",
        "license.json",
    ]
    mapeamento_schema = {
        "manifest.json": "pack-manifest-mvp.json",
        "event.json": "event-export-file.json",
        "draw-configs.json": "draw-configs-pack-file.json",
        "media-manifest.json": "media-manifest-pack-file.json",
        "branding.json": "branding-export-mvp.json",
        "license.json": "license-export-mvp.json",
    }

    for nome in nomes:
        alvo = export_dir / nome
        assert alvo.is_file(), f"falta {nome} em {export_dir}"
        instancia = json.loads(alvo.read_text(encoding="utf-8"))
        schema_file = diretorio_schemas_contratos / mapeamento_schema[nome]
        validator = validador_para_arquivo(schema_file)
        validar_instancia(validator, instancia)


def test_export_retorna_409_quando_nao_pronto(cliente: TestClient, tmp_path: Path) -> None:
    """Sem scenes, export_readiness.ready é false — não grava pack."""
    event_id = "evt_exportnaopronto1"
    cliente.post(
        "/events",
        json={
            "event_id": event_id,
            "organization_id": "org_exportnaopronto1",
            "name": "Sem cenas",
        },
    )
    os.environ["TELAFLOW_PACK_EXPORT_DIR"] = str(tmp_path)
    resp = cliente.post(f"/events/{event_id}/export")
    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert detail.get("error") == "export_not_ready"
    assert "export_readiness" in detail
    assert detail["export_readiness"].get("ready") is False
