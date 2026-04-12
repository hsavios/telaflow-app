"""Geradores de ids opacos (API / pack)."""

from __future__ import annotations

import secrets


def new_scene_id() -> str:
    return f"scn_{secrets.token_hex(6)}_{secrets.token_hex(4)}"


def new_draw_config_id() -> str:
    return f"dcf_{secrets.token_hex(6)}_{secrets.token_hex(4)}"


def new_media_id() -> str:
    return f"med_{secrets.token_hex(6)}_{secrets.token_hex(4)}"


def new_export_id() -> str:
    return f"exp_{secrets.token_hex(8)}_{secrets.token_hex(4)}"


def new_public_token() -> str:
    return f"tok_{secrets.token_urlsafe(24)}"
