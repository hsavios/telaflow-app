"""Fixtures — SQLite :memory: + seed antes de cada teste."""

from __future__ import annotations

import os
from pathlib import Path

if not os.environ.get("DATABASE_URL", "").strip():
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def cliente() -> TestClient:
    """
    Cada teste obtém base vazia + showcase e um TestClient com cabeçalho de org.
    O reset corre antes do import de `app` para o engine apanhar a URL certa.
    """
    from telaflow_cloud_api.main import app
    from telaflow_cloud_api.persistence.database import (
        _get_session_factory,
        create_all_tables,
        dispose_engine,
        get_engine,
    )
    from telaflow_cloud_api.persistence.models import Base
    from telaflow_cloud_api.seed import seed_showcase_event_if_absent

    dispose_engine()
    engine = get_engine()
    Base.metadata.drop_all(bind=engine)
    create_all_tables()
    s = _get_session_factory()()
    try:
        seed_showcase_event_if_absent(s)
        s.commit()
    finally:
        s.close()

    with TestClient(
        app,
        headers={"X-Telaflow-Organization-Id": "org_telaflow_d1"},
    ) as c:
        yield c


@pytest.fixture()
def diretorio_schemas_contratos() -> Path:
    """
    JSON Schemas gerados pelo pacote @telaflow/shared-contracts (Zod → dist/schema).
    """
    monorepo = Path(__file__).resolve().parents[3]
    d = monorepo / "packages" / "shared-contracts" / "dist" / "schema"
    if not d.is_dir():
        pytest.fail(
            "Pasta de schemas inexistente. Na raiz do monorepo execute: "
            "`npm run build -w @telaflow/shared-contracts` "
            "(gera packages/shared-contracts/dist/schema)."
        )
    return d
