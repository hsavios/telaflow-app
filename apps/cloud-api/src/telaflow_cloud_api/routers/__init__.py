"""Routers HTTP FastAPI."""

from telaflow_cloud_api.routers.auth import router as auth_router
from telaflow_cloud_api.routers.draw_configs import router as draw_configs_router
from telaflow_cloud_api.routers.events import router as events_router
from telaflow_cloud_api.routers.export import router as export_router
from telaflow_cloud_api.routers.media_requirements import router as media_requirements_router
from telaflow_cloud_api.routers.registration import router as join_router
from telaflow_cloud_api.routers.scenes import router as scenes_router

__all__ = [
    "auth_router",
    "draw_configs_router",
    "events_router",
    "export_router",
    "join_router",
    "media_requirements_router",
    "scenes_router",
]
