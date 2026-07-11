from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)

def test_weather_endpoints():
    # 1. Fetch initial weather state
    res = client.get("/api/v1/sim/weather")
    assert res.status_code == 200
    data = res.json()
    assert "weather" in data
    assert data["weather"]["condition"] == "clear"

    # 2. Trigger storm scenario
    res = client.post("/api/v1/sim/scenario", json={"scenarioName": "storm_intrusion", "anomalyType": "loitering"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SCENARIO_APPLIED"
    assert data["weather"]["condition"] == "storm"
    assert data["weather"]["waveHeight"] == 4.5

    # 3. Check weather state is updated
    res = client.get("/api/v1/sim/weather")
    assert res.status_code == 200
    data = res.json()
    assert data["weather"]["condition"] == "storm"

    # 4. Reset scenario back to calm
    res = client.post("/api/v1/sim/scenario", json={"scenarioName": "calm"})
    assert res.status_code == 200
    data = res.json()
    assert data["weather"]["condition"] == "clear"
