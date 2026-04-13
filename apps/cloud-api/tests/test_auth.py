"""Login JWT e tenant derivado do token."""

from __future__ import annotations


def test_login_returns_token_when_jwt_configured(monkeypatch, cliente):
    monkeypatch.setenv("TELAFLOW_JWT_SECRET", "unit-test-jwt-secret-key-32bytes!")
    r = cliente.post(
        "/auth/login",
        json={"email": "admin@telaflow.local", "password": "admin123"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert data.get("access_token")
    assert data.get("organization_id") == "org_telaflow_d1"


def test_events_require_bearer_when_jwt_configured(monkeypatch, cliente):
    monkeypatch.setenv("TELAFLOW_JWT_SECRET", "unit-test-jwt-secret-key-32bytes!")
    r = cliente.get("/events")
    assert r.status_code == 401


def test_events_ok_with_bearer_after_login(monkeypatch, cliente):
    monkeypatch.setenv("TELAFLOW_JWT_SECRET", "unit-test-jwt-secret-key-32bytes!")
    login = cliente.post(
        "/auth/login",
        json={"email": "admin@telaflow.local", "password": "admin123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    r = cliente.get(
        "/events",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert "events" in r.json()


def test_join_public_without_bearer(monkeypatch, cliente):
    """Inscrição pública não depende de `get_organization_id`."""
    monkeypatch.setenv("TELAFLOW_JWT_SECRET", "unit-test-jwt-secret-key-32bytes!")
    r = cliente.post("/join/nao-existe", json={})
    assert r.status_code == 404
