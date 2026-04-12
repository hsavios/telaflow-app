"""Sorteio no âmbito do evento — parâmetros mínimos para MVP (sem lógica de Player)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"


class NumberRange(BaseModel):
    """Intervalo inclusivo para `draw_type=number_range` (alinhado a shared-contracts)."""

    model_config = ConfigDict(extra="forbid")

    min: int
    max: int


class DrawConfig(BaseModel):
    """DrawConfig pertence ao evento; a scene só referencia opcionalmente."""

    draw_config_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    name: str = Field(..., min_length=1, max_length=256)
    max_winners: int = Field(default=1, ge=1, le=999)
    notes: str | None = Field(default=None, max_length=2000)
    enabled: bool = True
    draw_type: Literal["number_range"] = "number_range"
    number_range: NumberRange | None = None

    @model_validator(mode="after")
    def _number_range_bounds(self) -> DrawConfig:
        if self.number_range is not None and self.number_range.max < self.number_range.min:
            raise ValueError("number_range.max must be >= number_range.min")
        return self


class DrawConfigCreate(BaseModel):
    """Criação — `draw_config_id` e `event_id` definidos pela rota."""

    name: str = Field(..., min_length=1, max_length=256)
    max_winners: int = Field(default=1, ge=1, le=999)
    notes: str | None = Field(default=None, max_length=2000)
    enabled: bool = True
    draw_type: Literal["number_range"] = "number_range"
    number_range: NumberRange | None = None


class DrawConfigUpdate(BaseModel):
    """Atualização parcial (PATCH)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    max_winners: int | None = Field(default=None, ge=1, le=999)
    notes: str | None = None
    enabled: bool | None = None
    draw_type: Literal["number_range"] | None = None
    number_range: NumberRange | None = None
