"""Slot de mídia declarado por evento — manifesto sem blob na Cloud (MVP)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"

MediaKind = Literal["video", "image", "audio", "other"]

MediaUsageRole = Literal["scene_primary", "supporting", "brand_mark", "ambient"]

MediaPresentation = Literal["default", "fullscreen", "contain", "background"]


class MediaRequirement(BaseModel):
    """
    Requisito de mídia com `media_id` estável.
    `scene_id` opcional: dica de cena principal que consome o slot (não exclusivo).
    """

    media_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    label: str = Field(..., min_length=1, max_length=256)
    media_type: MediaKind
    required: bool = False
    scene_id: str | None = None
    allowed_extensions_hint: str | None = Field(default=None, max_length=512)
    usage_role: MediaUsageRole | None = None
    presentation: MediaPresentation | None = None


class MediaRequirementCreate(BaseModel):
    """Criação — `media_id` gerado no servidor."""

    label: str = Field(..., min_length=1, max_length=256)
    media_type: MediaKind
    required: bool = False
    scene_id: str | None = None
    allowed_extensions_hint: str | None = Field(default=None, max_length=512)
    usage_role: MediaUsageRole | None = None
    presentation: MediaPresentation | None = None


class MediaRequirementUpdate(BaseModel):
    """Atualização parcial (PATCH)."""

    model_config = ConfigDict(extra="forbid")

    label: str | None = Field(default=None, min_length=1, max_length=256)
    media_type: MediaKind | None = None
    required: bool | None = None
    scene_id: str | None = None
    allowed_extensions_hint: str | None = Field(default=None, max_length=512)
    usage_role: MediaUsageRole | None = None
    presentation: MediaPresentation | None = None
