"""Role-Based Access Control (RBAC) for TelaFlow."""

from __future__ import annotations

import os
from enum import Enum
from typing import Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from telaflow_cloud_api.auth.jwt_utils import decode_access_token
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.repository import Repository


class Role(str, Enum):
    """User roles in the system."""
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


class Permission(str, Enum):
    """System permissions."""
    # Organization management
    ORG_CREATE = "org:create"
    ORG_UPDATE = "org:update"
    ORG_DELETE = "org:delete"
    ORG_INVITE = "org:invite"
    
    # User management
    USER_INVITE = "user:invite"
    USER_UPDATE_ROLE = "user:update_role"
    USER_REMOVE = "user:remove"
    
    # Event management
    EVENT_CREATE = "event:create"
    EVENT_UPDATE = "event:update"
    EVENT_DELETE = "event:delete"
    EVENT_EXPORT = "event:export"
    
    # Scene management
    SCENE_CREATE = "scene:create"
    SCENE_UPDATE = "scene:update"
    SCENE_DELETE = "scene:delete"
    
    # Read permissions
    ORG_READ = "org:read"
    EVENT_READ = "event:read"
    SCENE_READ = "scene:read"


# Role to permissions mapping
ROLE_PERMISSIONS = {
    Role.ADMIN: [
        # Organization
        Permission.ORG_CREATE,
        Permission.ORG_UPDATE,
        Permission.ORG_DELETE,
        Permission.ORG_INVITE,
        Permission.ORG_READ,
        
        # User management
        Permission.USER_INVITE,
        Permission.USER_UPDATE_ROLE,
        Permission.USER_REMOVE,
        
        # Events
        Permission.EVENT_CREATE,
        Permission.EVENT_UPDATE,
        Permission.EVENT_DELETE,
        Permission.EVENT_EXPORT,
        Permission.EVENT_READ,
        
        # Scenes
        Permission.SCENE_CREATE,
        Permission.SCENE_UPDATE,
        Permission.SCENE_DELETE,
        Permission.SCENE_READ,
    ],
    
    Role.OPERATOR: [
        # Organization (read only)
        Permission.ORG_READ,
        
        # Events (full except delete)
        Permission.EVENT_CREATE,
        Permission.EVENT_UPDATE,
        Permission.EVENT_EXPORT,
        Permission.EVENT_READ,
        
        # Scenes (full except delete)
        Permission.SCENE_CREATE,
        Permission.SCENE_UPDATE,
        Permission.SCENE_READ,
    ],
    
    Role.VIEWER: [
        # Read only permissions
        Permission.ORG_READ,
        Permission.EVENT_READ,
        Permission.SCENE_READ,
    ],
}


def get_current_user_context(
    authorization: str | None = None,
    db: Session = Depends(get_session),
) -> dict:
    """Extract and validate user context from JWT token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    token = authorization[7:].strip()
    secret = os.environ.get("TELAFLOW_JWT_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT not configured",
        )
    
    try:
        payload = decode_access_token(token, secret)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    user_id = str(payload["sub"])
    organization_id = str(payload["organization_id"])
    email = str(payload.get("email", ""))
    
    # Get user's role in the organization
    repo = Repository(db)
    membership = repo.get_membership(user_id, organization_id)
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization membership",
        )
    
    role = Role(membership["role"])
    
    return {
        "user_id": user_id,
        "organization_id": organization_id,
        "email": email,
        "role": role,
        "permissions": ROLE_PERMISSIONS[role],
    }


def require_permission(permission: Permission) -> Callable:
    """Decorator to require specific permission."""
    def permission_dependency(
        user_context: dict = Depends(get_current_user_context),
    ) -> dict:
        if permission not in user_context["permissions"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}",
            )
        return user_context
    
    return permission_dependency


def require_role(role: Role) -> Callable:
    """Decorator to require specific role."""
    def role_dependency(
        user_context: dict = Depends(get_current_user_context),
    ) -> dict:
        if user_context["role"] != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role required: {role}",
            )
        return user_context
    
    return role_dependency


# Common dependencies
RequireAdmin = require_role(Role.ADMIN)
RequireOperator = require_role(Role.OPERATOR)
RequireViewer = require_role(Role.VIEWER)

# Permission dependencies
RequireOrgCreate = require_permission(Permission.ORG_CREATE)
RequireOrgUpdate = require_permission(Permission.ORG_UPDATE)
RequireOrgDelete = require_permission(Permission.ORG_DELETE)
RequireOrgInvite = require_permission(Permission.ORG_INVITE)
RequireOrgRead = require_permission(Permission.ORG_READ)

RequireEventCreate = require_permission(Permission.EVENT_CREATE)
RequireEventUpdate = require_permission(Permission.EVENT_UPDATE)
RequireEventDelete = require_permission(Permission.EVENT_DELETE)
RequireEventExport = require_permission(Permission.EVENT_EXPORT)

RequireSceneCreate = require_permission(Permission.SCENE_CREATE)
RequireSceneUpdate = require_permission(Permission.SCENE_UPDATE)
RequireSceneDelete = require_permission(Permission.SCENE_DELETE)


def check_permission(user_context: dict, permission: Permission) -> bool:
    """Check if user has specific permission."""
    return permission in user_context["permissions"]


def check_role(user_context: dict, role: Role) -> bool:
    """Check if user has specific role."""
    return user_context["role"] == role


def get_user_permissions(user_context: dict) -> list[Permission]:
    """Get all permissions for user."""
    return user_context["permissions"]
