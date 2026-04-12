"""Sorteio no âmbito do evento — alinhado a shared-contracts (draw-config)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from telaflow_cloud_api.domain.draw_public_copy import DrawPublicCopy

_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"


class NumberRange(BaseModel):
    """Intervalo inclusivo para `draw_type=number_range` (e modo `subset`)."""

    model_config = ConfigDict(extra="forbid")

    min: int
    max: int


class DrawPresentationPartial(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sound_enabled: bool | None = None
    visual_profile: Literal["premium", "classic", "pulsing"] | None = None
    tick_count: int | None = Field(default=None, ge=10, le=120)
    total_duration_ms: int | None = Field(default=None, ge=500, le=60000)
    freeze_before_final_ms: int | None = Field(default=None, ge=0, le=5000)


class DrawRegistrationRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    join_url_template: str | None = Field(default=None, max_length=1024)
    public_token: str | None = Field(default=None, max_length=128)


class DrawConfig(BaseModel):
    """DrawConfig pertence ao evento; a scene só referencia opcionalmente."""

    draw_config_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    name: str = Field(..., min_length=1, max_length=256)
    max_winners: int = Field(default=1, ge=1, le=999)
    notes: str | None = Field(default=None, max_length=2000)
    enabled: bool = True
    draw_type: Literal["number_range", "attendee_pool"] = "number_range"
    number_range: NumberRange | None = None
    pool_mode: Literal["full_range", "subset"] = "full_range"
    eligible_numbers: list[int] | None = Field(default=None, max_length=50000)
    remove_winner_from_pool: bool = True
    prizes: list[str] | None = Field(default=None, max_length=99)
    public_copy: DrawPublicCopy | None = None
    draw_presentation: DrawPresentationPartial | None = None
    registration: DrawRegistrationRef | None = None

    @model_validator(mode="after")
    def _consistency(self) -> DrawConfig:
        if self.number_range is not None and self.number_range.max < self.number_range.min:
            raise ValueError("number_range.max must be >= number_range.min")
        if self.pool_mode == "subset" and (not self.eligible_numbers or len(self.eligible_numbers) == 0):
            raise ValueError("pool_mode subset requires eligible_numbers (non-empty)")
        return self


class DrawConfigCreate(BaseModel):
    """Criação — `draw_config_id` e `event_id` definidos pela rota."""

    name: str = Field(..., min_length=1, max_length=256)
    max_winners: int = Field(default=1, ge=1, le=999)
    notes: str | None = Field(default=None, max_length=2000)
    enabled: bool = True
    draw_type: Literal["number_range", "attendee_pool"] = "number_range"
    number_range: NumberRange | None = None
    pool_mode: Literal["full_range", "subset"] = "full_range"
    eligible_numbers: list[int] | None = Field(default=None, max_length=50000)
    remove_winner_from_pool: bool = True
    prizes: list[str] | None = Field(default=None, max_length=99)
    public_copy: DrawPublicCopy | None = None
    draw_presentation: DrawPresentationPartial | None = None
    registration: DrawRegistrationRef | None = None

    @model_validator(mode="after")
    def _create_consistency(self) -> DrawConfigCreate:
        if self.number_range is not None and self.number_range.max < self.number_range.min:
            raise ValueError("number_range.max must be >= number_range.min")
        if self.pool_mode == "subset" and (not self.eligible_numbers or len(self.eligible_numbers) == 0):
            raise ValueError("pool_mode subset requires eligible_numbers (non-empty)")
        return self


class DrawConfigUpdate(BaseModel):
    """Atualização parcial (PATCH)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    max_winners: int | None = Field(default=None, ge=1, le=999)
    notes: str | None = None
    enabled: bool | None = None
    draw_type: Literal["number_range", "attendee_pool"] | None = None
    number_range: NumberRange | None = None
    pool_mode: Literal["full_range", "subset"] | None = None
    eligible_numbers: list[int] | None = None
    remove_winner_from_pool: bool | None = None
    prizes: list[str] | None = None
    public_copy: DrawPublicCopy | None = None
    draw_presentation: DrawPresentationPartial | None = None
    registration: DrawRegistrationRef | None = None
