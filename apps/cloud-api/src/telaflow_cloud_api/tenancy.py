"""
Isolamento multi-tenant por cabeçalho HTTP.

MVP: `X-Telaflow-Organization-Id` em todas as rotas autenticadas na Cloud Web.
Produção futura: mapear utilizador autenticado (OIDC/sessão) → organizações permitidas
e rejeitar org_id não membro (hoje o servidor confia no cabeçalho para desenvolvimento).
"""

from __future__ import annotations

import os

from fastapi import Header

_DEFAULT = os.environ.get("TELAFLOW_DEFAULT_ORG_ID", "org_telaflow_d1")


def get_organization_id(
    x_telaflow_organization_id: str | None = Header(None, alias="X-Telaflow-Organization-Id"),
) -> str:
    raw = (x_telaflow_organization_id or _DEFAULT).strip()
    return raw or _DEFAULT
