"""Cena — forma alinhada ao contrato TS (`SceneContractSchema`)."""

from pydantic import BaseModel, Field

_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"


class Scene(BaseModel):
    """sort_order: unicidade por evento é responsabilidade da persistência / export."""

    scene_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    sort_order: int = Field(..., ge=0)
    type: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=512)
    enabled: bool = True
