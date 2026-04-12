"""Codificação e decodificação de JWT de acesso (HS256)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt


def mint_access_token(
    *,
    secret: str,
    user_id: str,
    organization_id: str,
    email: str,
    ttl_hours: int = 168,
) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=ttl_hours)
    payload = {
        "sub": user_id,
        "organization_id": organization_id,
        "email": email,
        "iat": now,
        "exp": exp,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_access_token(token: str, secret: str) -> dict:
    return jwt.decode(token, secret, algorithms=["HS256"])
