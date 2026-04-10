"""Evento — forma alinhada ao contrato TS (`EventContractSchema`)."""

from pydantic import BaseModel, Field


_ID_PATTERN = r"^[a-zA-Z0-9_-]+$"


class Event(BaseModel):
    """Ids opacos — alinhado a shared-contracts (charset e comprimento; formato final na persistência)."""

    event_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    organization_id: str = Field(..., min_length=12, max_length=64, pattern=_ID_PATTERN)
    name: str = Field(..., min_length=1, max_length=512)
