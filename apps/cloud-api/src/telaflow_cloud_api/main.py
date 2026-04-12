"""FastAPI entry — CORS, health e montagem dos routers."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from telaflow_cloud_api.routers import (
    draw_configs_router,
    events_router,
    export_router,
    media_requirements_router,
    scenes_router,
)

app = FastAPI(
    title="TelaFlow Cloud API",
    version="0.1.0",
    description="API da TelaFlow Cloud — fase inicial: governança e integração, sem persistência completa.",
)

_cors_raw = os.environ.get(
    "CLOUD_API_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://app.telaflow.ia.br",
)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(scenes_router)
app.include_router(draw_configs_router)
app.include_router(media_requirements_router)
app.include_router(export_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Healthcheck para runtime, load balancers e probes."""
    return {"status": "ok"}
