"""Login JWT, OAuth e perfil do operador com RBAC."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from telaflow_cloud_api.auth.jwt_utils import decode_access_token, mint_access_token
from telaflow_cloud_api.auth.oauth import oauth_login_or_register
from telaflow_cloud_api.auth.passwords import verify_password
from telaflow_cloud_api.auth.rbac import get_current_user_context
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


@router.get("/auth/oauth/{provider}/login")
async def oauth_login(provider: str, request: Request):
    """Initiate OAuth login flow."""
    from telaflow_cloud_api.auth.oauth import get_oauth
    
    oauth = get_oauth()
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth provider '{provider}' not supported",
        )
    
    redirect_uri = f"{request.url.scheme}://{request.url.netloc}/auth/oauth/{provider}/callback"
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/auth/oauth/{provider}/callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_session)):
    """Handle OAuth callback and complete login."""
    try:
        result = await oauth_login_or_register(provider, request, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth login failed: {str(e)}",
        ) from e


@router.get("/auth/me/rbac")
def me_with_rbac(user_context: dict = Depends(get_current_user_context)) -> dict:
    """Get current user with role and permissions."""
    return {
        "authenticated": True,
        "user_id": user_context["user_id"],
        "email": user_context["email"],
        "organization_id": user_context["organization_id"],
        "role": user_context["role"],
        "permissions": [p.value for p in user_context["permissions"]],
    }
