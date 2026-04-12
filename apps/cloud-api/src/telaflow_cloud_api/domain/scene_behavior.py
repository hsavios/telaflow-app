"""Semântica operacional opcional da scene — alinhado a `SceneBehaviorMvpSchema` (shared-contracts)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

SceneBehaviorMode = Literal["standard", "draw_operator_confirm", "placard", "transition"]


class SceneBehavior(BaseModel):
    """Quando presente na scene, o Player pode preferir isto à inferência só pelo `type`."""

    model_config = ConfigDict(extra="forbid")

    mode: SceneBehaviorMode
