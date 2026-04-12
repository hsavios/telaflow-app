"""Fixtures comuns — memória limpa por teste e cliente HTTP."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _limpar_memoria() -> None:
    """Isola testes que usam stores globais em memória."""
    from telaflow_cloud_api import memory

    memory._events_store.clear()
    memory._scenes_by_event.clear()
    memory._draw_configs_by_event.clear()
    memory._media_requirements_by_event.clear()
    # Evento demo completo (mesmo gate que produção após lifespan).
    memory.seed_showcase_event_if_absent()
    yield


@pytest.fixture()
def cliente() -> TestClient:
    from telaflow_cloud_api.main import app

    return TestClient(app)


@pytest.fixture()
def diretorio_schemas_contratos() -> Path:
    """
    JSON Schemas gerados pelo pacote @telaflow/shared-contracts (Zod → dist/schema).
    """
    # apps/cloud-api/tests/conftest.py → raiz do monorepo = parents[3]
    monorepo = Path(__file__).resolve().parents[3]
    d = monorepo / "packages" / "shared-contracts" / "dist" / "schema"
    if not d.is_dir():
        pytest.fail(
            "Pasta de schemas inexistente. Na raiz do monorepo execute: "
            "`npm run build -w @telaflow/shared-contracts` "
            "(gera packages/shared-contracts/dist/schema)."
        )
    return d
