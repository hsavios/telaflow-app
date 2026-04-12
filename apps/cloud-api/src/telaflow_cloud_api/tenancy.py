"""
Tenant efetivo da Cloud API.

- Sem `TELAFLOW_JWT_SECRET`: modo desenvolvimento — `X-Telaflow-Organization-Id` define a org
  (comportamento anterior; não use em produção exposta à Internet).
- Com `TELAFLOW_JWT_SECRET`: o tenant vem **só** do JWT (`Authorization: Bearer`); o cabeçalho
  de organização é ignorado para isolamento real.
"""

from __future__ import annotations

import os

from fastapi import Header, HTTPException

from telaflow_cloud_api.auth.jwt_utils import decode_access_token

_DEFAULT = os.environ.get("TELAFLOW_DEFAULT_ORG_ID", "org_telaflow_d1")


def get_organization_id(
    authorization: str | None = Header(None),
    x_telaflow_organization_id: str | None = Header(None, alias="X-Telaflow-Organization-Id"),
) -> str:
    secret = os.environ.get("TELAFLOW_JWT_SECRET", "").strip()
    if not secret:
        raw = (x_telaflow_organization_id or _DEFAULT).strip()
        return raw or _DEFAULT

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "authentication_required",
                "message": "Envie Authorization: Bearer <access_token> (faça login em POST /auth/login).",
            },
        )
    token = authorization[7:].strip()
    try:
        payload = decode_access_token(token, secret)
        return str(payload["organization_id"])
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "invalid_token",
                "message": "Token inválido ou expirado.",
            },
        ) from None
