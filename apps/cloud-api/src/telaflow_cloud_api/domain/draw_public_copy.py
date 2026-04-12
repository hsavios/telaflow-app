"""Textos públicos opcionais do sorteio — alinhado a `DrawPublicCopyMvpSchema`."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class DrawPublicCopy(BaseModel):
    """Copy para telas de audiência; conteúdo típico em pt-BR."""

    model_config = ConfigDict(extra="forbid")

    headline: str | None = Field(default=None, max_length=200)
    audience_instructions: str | None = Field(default=None, max_length=500)
    result_label: str | None = Field(default=None, max_length=120)
