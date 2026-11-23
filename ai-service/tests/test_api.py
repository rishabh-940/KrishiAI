"""Automated End-to-End Verification Suite for KrishiAI FastAPI & ML Pipelines."""

import io
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert "ai_registry" in body


def test_disease_prediction():
    # Synthesize a green leaf image with brown blight spots
    img = Image.new("RGB", (256, 256), (48, 140, 52))
    for x in range(80, 175):
        for y in range(80, 175):
            img.putpixel((x, y), (110, 62, 30))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    r = client.post(
        "/api/v1/disease/predict",
        files={"image": ("leaf.jpg", buf.getvalue(), "image/jpeg")},
        data={"model_choice": "ensemble", "crop_hint": "Tomato"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "success"
    assert body["top_prediction"]["confidence"] > 0.0
    assert body["visual_diagnostics"]["necrosis_brown_ratio"] > 0.1
    assert len(body["treatment"]["chemical_remedies"]) >= 1


def test_schemes_query():
    r = client.post(
        "/api/v1/schemes/query",
        json={"query": "crop insurance and drip irrigation subsidy for wheat", "crop": "Wheat", "state": "Rajasthan"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["model_id"] == "bharatgenai/AgriParam"
    assert len(body["matched_schemes"]) >= 2


def test_chemical_chat_and_dosage():
    r = client.post(
        "/api/v1/chemicals/chat",
        json={"message": "सरसों में माहू कीट के लिए कौन सा कीटनाशक छिड़कें?", "crop": "Mustard", "language": "hi-en"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["model_id"] == "me-nabi/farmer-advisory-hindi-qwen2.5-3b"
    assert "Imidacloprid" in body["reply"] or "इमिडाक्लोप्रिड" in body["reply"]

    r2 = client.post(
        "/api/v1/chemicals/dosage-calculator",
        json={"crop": "Wheat", "area_acres": 5.0, "soil_n": 220, "soil_p": 14, "soil_k": 180},
    )
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2["fertilizer_bags"]["urea_45kg_bags"] > 0
    assert b2["estimated_cost_inr"] > 0


def test_mandi_price_prediction():
    meta = client.get("/api/v1/prices/metadata")
    assert meta.status_code == 200
    assert len(meta.json()["states"]) >= 5

    r = client.post(
        "/api/v1/prices/predict",
        json={"state": "Rajasthan", "commodity": "Mustard", "horizon_days": 30},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["commodity"] == "Mustard"
    assert len(body["forecast_series"]) >= 4
    assert body["predicted_avg_modal_price"] > 1000


def test_crop_recommendation():
    r = client.post(
        "/api/v1/ml/recommend-crop",
        json={
            "nitrogen": 105,
            "phosphorus": 52,
            "potassium": 42,
            "temperature": 19.0,
            "humidity": 56.0,
            "ph": 6.9,
            "rainfall": 390.0,
            "area_acres": 3.0,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["recommendations"]) == 4
    assert body["recommendations"][0]["crop"] in ("Wheat", "Mustard", "Maize")


def test_weather_advisory():
    r = client.get("/api/v1/weather/forecast", params={"city": "Kota"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["forecast_7d"]) == 7
    assert body["irrigation_recommendation"]


if __name__ == "__main__":
    test_health()
    test_disease_prediction()
    test_schemes_query()
    test_chemical_chat_and_dosage()
    test_mandi_price_prediction()
    test_crop_recommendation()
    test_weather_advisory()
    print("ALL 7 PYTHON AI/ML/DL END-TO-END TESTS PASSED!")
