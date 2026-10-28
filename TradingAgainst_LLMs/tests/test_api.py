import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "api.sqlite"))
    monkeypatch.setenv("PROVIDER", "mock")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    from app.main import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_health_and_system_hide_secrets(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    system = client.get("/api/system").json()
    assert system["provider"] == "mock"
    assert system["api_key_configured"] is False
    assert "OPENAI_API_KEY" not in system
    assert "default_experiment" in system
    assert system["default_experiment"]["model"] == "mock-anchor-v1"


def test_live_provider_without_key_is_refused(client):
    response = client.post(
        "/api/experiments",
        json={
            "provider": "openai",
            "confirm_llm_cost": True,
            "train_sessions": 1,
            "test_sessions": 1,
            "rounds": 3,
            "agents": 2,
            "variant_mode": "fixed_full",
            "run_prompt_sensitivity": False,
        },
    )
    assert response.status_code == 400
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_tiny_experiment_roundtrip(client):
    response = client.post(
        "/api/experiments",
        json={
            "name": "tiny",
            "seed": 21,
            "train_sessions": 1,
            "test_sessions": 1,
            "rounds": 5,
            "agents": 3,
            "variant_mode": "fixed_full",
            "run_prompt_sensitivity": False,
            "ignore_cache": True,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["protocol"]["test_used_for_selection"] is False
    assert body["performance"]["test"]["n_sessions"] == 1
    assert body["disclaimer"]
    session_id = body["sessions"][0]["id"]
    session = client.get(f"/api/sessions/{session_id}")
    assert session.status_code == 200
    payload = session.json()
    assert "true_value" in payload["rounds"][0]
    assert payload["rounds"][0]["quotes"][0]["private_signal"] is not None
    quotes = client.get(f"/api/experiments/{body['id']}/quotes")
    assert quotes.status_code == 200
    assert quotes.json()["total"] > 0
    exported = client.post(f"/api/experiments/{body['id']}/export")
    assert exported.status_code == 200
    assert len(exported.json()["files"]) == 4
