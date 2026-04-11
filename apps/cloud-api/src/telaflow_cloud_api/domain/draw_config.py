"""Sorteio no âmbito do evento — parâmetros mínimos para MVP (sem lógica de Player)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"


class DrawConfig(BaseModel):
    """DrawConfig pertence ao evento; a scene só referencia opcionalmente."""

    draw_config_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    name: str = Field(..., min_length=1, max_length=256)
    max_winners: int = Field(default=1, ge=1, le=999)
    notes: str | None = Field(default=None, max_length=2000)
    enabled: bool = True


class DrawConfigCreate(BaseModel):
    """Criação — `draw_config_id` e `event_id` definidos pela rota."""

    name: str = Field(..., min_length=1, max_length=256)
    max_winners: int = Field(default=1, ge=1, le=999)
    notes: str | None = Field(default=None, max_length=2000)
    enabled: bool = True


class DrawConfigUpdate(BaseModel):
    """Atualização parcial (PATCH)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    max_winners: int | None = Field(default=None, ge=1, le=999)
    notes: str | None = None
    enabled: bool | None = None
