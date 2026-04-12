"""Login JWT e perfil mínimo do operador."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from telaflow_cloud_api.auth.jwt_utils import decode_access_token, mint_access_token
from telaflow_cloud_api.auth.passwords import verify_password
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.repository import Repository

router = APIRouter(tags=["auth"])


class LoginBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    password: str = Field(..., min_length=1, max_length=256)


def _jwt_secret() -> str:
    return os.environ.get("TELAFLOW_JWT_SECRET", "").strip()


@router.post("/auth/login")
def login(body: LoginBody, db: Session = Depends(get_session)) -> dict:
    secret = _jwt_secret()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "jwt_not_configured",
                "message": "Defina TELAFLOW_JWT_SECRET no servidor para ativar login.",
            },
        )
    repo = Repository(db)
    user = repo.get_user_by_email(body.email)
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "invalid_credentials",
                "message": "E-mail ou senha incorretos.",
            },
        )
    orgs = repo.list_organization_ids_for_user(user["user_id"])
    if not orgs:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "no_organization_membership",
                "message": "Usuário sem organização atribuída.",
            },
        )
    organization_id = orgs[0]
    token = mint_access_token(
        secret=secret,
        user_id=user["user_id"],
        organization_id=organization_id,
        email=user["email"],
    )
    return {
        "ok": True,
        "access_token": token,
        "token_type": "bearer",
        "organization_id": organization_id,
        "user_id": user["user_id"],
        "email": user["email"],
    }


@router.get("/auth/me")
def me(authorization: str | None = Header(None)) -> dict:
    """Aceita `Authorization: Bearer` quando JWT está configurado."""
    secret = _jwt_secret()
    if not secret:
        return {"authenticated": False, "mode": "header_only_tenant"}
    if not authorization or not authorization.lower().startswith("bearer "):
        return {"authenticated": False, "mode": "jwt_required"}
    token = authorization[7:].strip()
    try:
        payload = decode_access_token(token, secret)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "invalid_token",
                "message": "Token inválido ou expirado.",
            },
        ) from None
    return {
        "authenticated": True,
        "user_id": str(payload["sub"]),
        "email": str(payload.get("email", "")),
        "organization_id": str(payload["organization_id"]),
    }
