"""Cena — forma alinhada ao contrato TS (`SceneContractSchema`) + campos reservados para evolução."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"

SceneType = Literal["opening", "institutional", "sponsor", "draw", "break", "closing"]


class Scene(BaseModel):
    """
    Scene persistível na API.
    `sort_order` é único por evento (garantido pela API).
    `media_id` / `draw_config_id` opcionais: se preenchidos, a API exige que existam
    no mesmo evento (`MediaRequirement` / `DrawConfig`). Scene tipo `draw` exige `draw_config_id`.
    """

    scene_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    sort_order: int = Field(..., ge=0)
    type: SceneType
    name: str = Field(..., min_length=1, max_length=512)
    enabled: bool = True
    media_id: str | None = None
    draw_config_id: str | None = None


class SceneCreate(BaseModel):
    """Criação — `scene_id` e `event_id` definidos pela rota."""

    sort_order: int = Field(..., ge=0)
    type: SceneType
    name: str = Field(..., min_length=1, max_length=512)
    enabled: bool = True
    media_id: str | None = None
    draw_config_id: str | None = None


class SceneUpdate(BaseModel):
    """Atualização parcial (PATCH)."""

    model_config = ConfigDict(extra="forbid")

    sort_order: int | None = Field(default=None, ge=0)
    type: SceneType | None = None
    name: str | None = Field(default=None, min_length=1, max_length=512)
    enabled: bool | None = None
    media_id: str | None = None
    draw_config_id: str | None = None


class SceneReorderBody(BaseModel):
    """Nova ordem: lista completa de `scene_id` na sequência desejada (0 = primeiro)."""

    scene_ids: list[str] = Field(default_factory=list)
