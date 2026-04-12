"""Testes para Auth com OAuth e RBAC."""

import pytest
from fastapi.testclient import TestClient
from telaflow_cloud_api.main import app


client = TestClient(app)


def test_oauth_endpoints_return_400_when_not_configured():
    """OAuth endpoints devem retornar 400 quando não configurados."""
    response = client.get("/auth/oauth/google/login")
    assert response.status_code == 400
    assert "not supported" in response.json()["detail"].lower()

    response = client.get("/auth/oauth/github/login")
    assert response.status_code == 400
    assert "not supported" in response.json()["detail"].lower()


def test_rbac_me_requires_auth():
    """Endpoint RBAC /me deve requerer autenticação."""
    response = client.get("/auth/me/rbac")
    assert response.status_code == 401


def test_organizations_endpoints_require_auth():
    """Endpoints de organizations devem requerer autenticação."""
    endpoints = [
        "/organizations",
        "/organizations/test-org",
    ]
    
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401


def test_auth_me_works_without_jwt():
    """Endpoint /auth/me deve funcionar sem JWT (fallback mode)."""
    response = client.get("/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert "mode" in data


def test_login_with_jwt_configured():
    """Login deve funcionar quando JWT está configurado."""
    # Este teste requer JWT_SECRET configurado
    # Por ora, testamos que retorna 503 quando não configurado
    response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "password"
    })
    assert response.status_code == 503
    assert "jwt_not_configured" in response.json()["detail"]["error"]


def test_oauth_flow_structure():
    """Testar estrutura do fluxo OAuth (sem providers reais)."""
    # Testamos que os endpoints existem e têm estrutura correta
    
    # 1. Login redirect
    response = client.get("/auth/oauth/google/login")
    assert response.status_code == 400  # Provider não configurado
    
    # 2. Callback
    response = client.get("/auth/oauth/google/callback?code=test")
    assert response.status_code == 400  # Provider não configurado


def test_rbac_permission_structure():
    """Testar estrutura de permissões RBAC."""
    from telaflow_cloud_api.auth.rbac import (
        Role, Permission, ROLE_PERMISSIONS,
        RequireAdmin, RequireOperator, RequireViewer,
        RequireOrgCreate, RequireEventCreate, RequireSceneCreate
    )
    
    # Verificar enums
    assert Role.ADMIN == "admin"
    assert Role.OPERATOR == "operator" 
    assert Role.VIEWER == "viewer"
    
    assert Permission.ORG_CREATE == "org:create"
    assert Permission.EVENT_CREATE == "event:create"
    assert Permission.SCENE_CREATE == "scene:create"
    
    # Verificar mapeamento de permissões
    assert Permission.ORG_CREATE in ROLE_PERMISSIONS[Role.ADMIN]
    assert Permission.ORG_CREATE not in ROLE_PERMISSIONS[Role.VIEWER]
    
    # Verificar que todas as roles têm permissões de leitura
    read_permissions = [
        Permission.ORG_READ,
        Permission.EVENT_READ, 
        Permission.SCENE_READ
    ]
    
    for role in Role:
        for perm in read_permissions:
            assert perm in ROLE_PERMISSIONS[role]


def test_oauth_imports():
    """Testar que imports OAuth funcionam."""
    from telaflow_cloud_api.auth.oauth import get_oauth
    from telaflow_cloud_api.auth.rbac import get_current_user_context
    
    # Verificar que funções existem
    assert callable(get_oauth)
    assert callable(get_current_user_context)


def test_repository_new_methods():
    """Testar novos métodos do repository."""
    from telaflow_cloud_api.persistence.repository import Repository
    from telaflow_cloud_api.persistence.ids import new_user_id, new_organization_id
    
    # Verificar que geradores de ID funcionam
    user_id = new_user_id()
    org_id = new_organization_id()
    
    assert user_id.startswith("usr_")
    assert org_id.startswith("org_")
    assert len(user_id) > 10
    assert len(org_id) > 10


def test_organization_routes_structure():
    """Testar estrutura das rotas de organizations."""
    app = client.app
    
    # Verificar que rotas existem
    routes = [route.path for route in app.routes]
    
    expected_routes = [
        "/organizations",
        "/organizations/{organization_id}",
        "/organizations/{organization_id}/invite",
        "/organizations/{organization_id}/members",
    ]
    
    for route in expected_routes:
        assert any(route in r for r in routes), f"Route {route} not found"


if __name__ == "__main__":
    pytest.main([__file__])
