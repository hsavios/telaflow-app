"""Cena — forma alinhada ao contrato TS (`SceneContractSchema`)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"

SceneType = Literal["opening", "institutional", "sponsor", "draw", "break", "closing"]


class Scene(BaseModel):
    """sort_order: unicidade por evento na exportação; aqui apenas ordenação na listagem."""

    scene_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    sort_order: int = Field(..., ge=0)
    type: SceneType
    name: str = Field(..., min_length=1, max_length=512)
    enabled: bool = True


class SceneCreate(BaseModel):
    """Payload de criação — `scene_id` e `event_id` definidos pela API a partir da rota."""

    sort_order: int = Field(..., ge=0)
    type: SceneType
    name: str = Field(..., min_length=1, max_length=512)
    enabled: bool = True
