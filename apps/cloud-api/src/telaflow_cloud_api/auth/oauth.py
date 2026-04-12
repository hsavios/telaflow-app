"""OAuth integration for Google and GitHub providers."""

from __future__ import annotations

import os
from typing import Any

from authlib.integrations.starlette_client import OAuth
from fastapi import Request
from sqlalchemy.orm import Session

from telaflow_cloud_api.persistence.repository import Repository


def get_oauth() -> OAuth:
    """Initialize OAuth with configured providers."""
    oauth = OAuth()
    
    # Google OAuth
    google_client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
    google_client_secret = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")
    if google_client_id and google_client_secret:
        oauth.register(
            name="google",
            client_id=google_client_id,
            client_secret=google_client_secret,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )
    
    # GitHub OAuth
    github_client_id = os.environ.get("GITHUB_OAUTH_CLIENT_ID")
    github_client_secret = os.environ.get("GITHUB_OAUTH_CLIENT_SECRET")
    if github_client_id and github_client_secret:
        oauth.register(
            name="github",
            client_id=github_client_id,
            client_secret=github_client_secret,
            access_token_url="https://github.com/login/oauth/access_token",
            authorize_url="https://github.com/login/oauth/authorize",
            api_base_url="https://api.github.com/user",
            client_kwargs={"scope": "user:email"},
        )
    
    return oauth


async def oauth_login_or_register(
    provider: str,
    request: Request,
    db: Session,
) -> dict[str, Any]:
    """Handle OAuth login/registration flow."""
    oauth = get_oauth()
    
    # Get OAuth client for provider
    client = oauth.create_client(provider)
    if not client:
        raise ValueError(f"OAuth provider '{provider}' not configured")
    
    # Exchange code for token
    token = await client.authorize_access_token(request)
    
    # Get user info
    if provider == "google":
        user_info = token.get("userinfo")
        if not user_info:
            # Fallback to Google API
            resp = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", token=token)
            user_info = resp.json()
        
        email = user_info.get("email")
        name = user_info.get("name", "")
        picture = user_info.get("picture", "")
        
    elif provider == "github":
        resp = await client.get("user", token=token)
        user_info = resp.json()
        
        # Get primary email (GitHub may have multiple emails)
        resp = await client.get("user/emails", token=token)
        emails = resp.json()
        primary_email = next((e["email"] for e in emails if e["primary"] and e["verified"]), None)
        
        email = primary_email or user_info.get("email")
        name = user_info.get("name", "")
        picture = user_info.get("avatar_url", "")
        
    else:
        raise ValueError(f"Unsupported OAuth provider: {provider}")
    
    if not email:
        raise ValueError("Email not provided by OAuth provider")
    
    # Find or create user
    repo = Repository(db)
    user = repo.get_user_by_email(email)
    
    if not user:
        # Create new user
        from telaflow_cloud_api.auth.passwords import hash_password
        from telaflow_cloud_api.persistence.ids import new_user_id
        
        user_id = new_user_id()
        password_hash = hash_password("oauth-no-password")  # Placeholder
        
        user = repo.create_user(
            user_id=user_id,
            email=email,
            password_hash=password_hash,
            display_name=name,
        )
        
        # Create default organization if none exists
        orgs = repo.list_organizations()
        if not orgs:
            from telaflow_cloud_api.persistence.ids import new_organization_id
            
            org_id = new_organization_id()
            org = repo.create_organization(
                organization_id=org_id,
                name=f"{name or email}'s Organization",
            )
            
            # Add user as admin
            repo.create_membership(
                user_id=user_id,
                organization_id=org_id,
                role="admin",
            )
            
            organization_id = org_id
        else:
            # Add to first existing organization
            organization_id = orgs[0]["organization_id"]
            repo.create_membership(
                user_id=user_id,
                organization_id=organization_id,
                role="operator",  # Non-admin role for existing orgs
            )
    else:
        # Get user's organization
        orgs = repo.list_organization_ids_for_user(user["user_id"])
        if not orgs:
            raise ValueError("User has no organization membership")
        organization_id = orgs[0]
    
    # Create JWT token
    from telaflow_cloud_api.auth.jwt_utils import mint_access_token
    
    secret = os.environ.get("TELAFLOW_JWT_SECRET", "")
    if not secret:
        raise ValueError("JWT secret not configured")
    
    access_token = mint_access_token(
        secret=secret,
        user_id=user["user_id"],
        organization_id=organization_id,
        email=user["email"],
    )
    
    return {
        "ok": True,
        "access_token": access_token,
        "token_type": "bearer",
        "provider": provider,
        "user_id": user["user_id"],
        "email": user["email"],
        "organization_id": organization_id,
        "display_name": user.get("display_name", ""),
        "picture": picture,
    }
