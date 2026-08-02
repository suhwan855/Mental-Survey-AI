from fastapi.testclient import TestClient
from backend.main import app

VALID = {"phq_total": 10, "gad_total": 8, "k10_total": 22, "phq_item9": 0, "asq_any_yes": False}

def test_prediction_contract():
    with TestClient(app) as client:
        response = client.post("/predict", json=VALID)
        assert response.status_code == 200
        body = response.json()
        assert set(body["predictions"]) == {"suicidal", "depression", "stress"}
        assert body["overall_level"] in {"low", "moderate", "high"}

def test_score_range_validation():
    with TestClient(app) as client:
        assert client.post("/predict", json={**VALID, "phq_total": 99}).status_code == 422

def test_safety_signal_has_priority():
    with TestClient(app) as client:
        response = client.post("/predict", json={**VALID, "phq_item9": 1, "asq_any_yes": True})
        assert response.status_code == 200
        assert response.json()["overall_level"] == "high"
