"""Organization management with RBAC."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from telaflow_cloud_api.auth.rbac import (
    RequireAdmin,
    RequireOrgCreate,
    RequireOrgInvite,
    RequireOrgRead,
    RequireOrgUpdate,
    get_current_user_context,
)
from telaflow_cloud_api.persistence.database import get_session
from telaflow_cloud_api.persistence.ids import new_organization_id
from telaflow_cloud_api.persistence.repository import Repository

router = APIRouter(tags=["organizations"])


class CreateOrganizationBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)


class UpdateOrganizationBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)


class InviteUserBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    role: str = Field(..., pattern="^(admin|operator|viewer)$")


@router.get("/organizations")
def list_organizations(
    user_context: dict = Depends(RequireOrgRead),
    db: Session = Depends(get_session),
) -> dict:
    """List all organizations (admin only) or user's organizations."""
    repo = Repository(db)
    
    if user_context["role"].value == "admin":
        # Admin can see all organizations
        organizations = repo.list_organizations()
    else:
        # Non-admin can only see their own organizations
        org_ids = repo.list_organization_ids_for_user(user_context["user_id"])
        organizations = []
        for org_id in org_ids:
            org = repo.get_organization(org_id)
            if org:
                organizations.append(org)
    
    return {
        "ok": True,
        "organizations": organizations,
    }


@router.post("/organizations")
def create_organization(
    body: CreateOrganizationBody,
    user_context: dict = Depends(RequireOrgCreate),
    db: Session = Depends(get_session),
) -> dict:
    """Create a new organization."""
    repo = Repository(db)
    
    org_id = new_organization_id()
    organization = repo.create_organization(org_id, body.name)
    
    # Add creator as admin
    repo.create_membership(
        user_id=user_context["user_id"],
        organization_id=org_id,
        role="admin",
    )
    
    return {
        "ok": True,
        "organization": organization,
    }


@router.get("/organizations/{organization_id}")
def get_organization(
    organization_id: str,
    user_context: dict = Depends(RequireOrgRead),
    db: Session = Depends(get_session),
) -> dict:
    """Get organization details."""
    repo = Repository(db)
    
    # Check if user has access to this organization
    membership = repo.get_membership(user_context["user_id"], organization_id)
    if not membership and user_context["role"].value != "admin":
        raise ValueError("Access denied to organization")
    
    organization = repo.get_organization(organization_id)
    if not organization:
        raise ValueError("Organization not found")
    
    return {
        "ok": True,
        "organization": organization,
    }


@router.patch("/organizations/{organization_id}")
def update_organization(
    organization_id: str,
    body: UpdateOrganizationBody,
    user_context: dict = Depends(RequireOrgUpdate),
    db: Session = Depends(get_session),
) -> dict:
    """Update organization details."""
    repo = Repository(db)
    
    # Check if user is admin of this organization
    membership = repo.get_membership(user_context["user_id"], organization_id)
    if not membership or membership["role"] != "admin":
        raise ValueError("Must be organization admin")
    
    organization = repo.update_organization(organization_id, body.name)
    
    return {
        "ok": True,
        "organization": organization,
    }


@router.post("/organizations/{organization_id}/invite")
def invite_user(
    organization_id: str,
    body: InviteUserBody,
    user_context: dict = Depends(RequireOrgInvite),
    db: Session = Depends(get_session),
) -> dict:
    """Invite a user to the organization."""
    repo = Repository(db)
    
    # Check if user is admin of this organization
    membership = repo.get_membership(user_context["user_id"], organization_id)
    if not membership or membership["role"] != "admin":
        raise ValueError("Must be organization admin")
    
    # Check if user exists
    user = repo.get_user_by_email(body.email)
    if not user:
        raise ValueError("User not found")
    
    # Create or update membership
    existing_membership = repo.get_membership(user["user_id"], organization_id)
    if existing_membership:
        # Update role
        membership = repo.update_membership_role(user["user_id"], organization_id, body.role)
    else:
        # Create new membership
        membership = repo.create_membership(user["user_id"], organization_id, body.role)
    
    return {
        "ok": True,
        "membership": membership,
    }


@router.get("/organizations/{organization_id}/members")
def list_members(
    organization_id: str,
    user_context: dict = Depends(RequireOrgRead),
    db: Session = Depends(get_session),
) -> dict:
    """List organization members."""
    repo = Repository(db)
    
    # Check if user has access to this organization
    membership = repo.get_membership(user_context["user_id"], organization_id)
    if not membership and user_context["role"].value != "admin":
        raise ValueError("Access denied to organization")
    
    members = repo.list_organization_members(organization_id)
    
    return {
        "ok": True,
        "members": members,
    }


@router.delete("/organizations/{organization_id}/members/{user_id}")
def remove_member(
    organization_id: str,
    user_id: str,
    current_user_context: dict = Depends(RequireAdmin),
    db: Session = Depends(get_session),
) -> dict:
    """Remove a member from the organization."""
    repo = Repository(db)
    
    # Cannot remove yourself
    if user_id == current_user_context["user_id"]:
        raise ValueError("Cannot remove yourself from organization")
    
    # Check if target membership exists
    membership = repo.get_membership(user_id, organization_id)
    if not membership:
        raise ValueError("User is not a member of this organization")
    
    # Remove membership
    repo.delete_membership(user_id, organization_id)
    
    return {
        "ok": True,
        "message": "Member removed successfully",
    }
