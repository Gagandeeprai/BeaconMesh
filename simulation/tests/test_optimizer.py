import pytest
from src.optimizer.costs import WeatherCostModel
from src.optimizer.solver import RescueOptimizer, haversine_distance

def test_haversine_distance():
    # Coords check: Mangalore to a point ~10km away
    dist = haversine_distance(12.9141, 74.8560, 12.9141, 74.9482) # approx 10km east
    assert abs(dist - 10.0) < 0.5

def test_weather_cost_model_calm():
    # Calm weather: multiplier should be 1.0
    model = WeatherCostModel(wave_height=0.8, wind_speed=10.0, visibility=10.0)
    assert model.get_travel_time_multiplier() == 1.0

def test_weather_cost_model_penalties():
    # Waves above 1.2m and low visibility
    model = WeatherCostModel(wave_height=2.2, wind_speed=20.0, visibility=1.5)
    # wave_penalty = (2.2 - 1.2) * 0.15 = 0.15
    # wind_penalty = (20.0 - 15.0) / 10.0 * 0.05 = 0.025
    # visibility_penalty = 0.30
    # Expected multiplier = 1 + 0.15 + 0.025 + 0.30 = 1.475
    assert abs(model.get_travel_time_multiplier() - 1.475) < 0.01

def test_weather_cost_model_blocked():
    # Wave height > 4m
    model = WeatherCostModel(wave_height=4.5)
    assert model.get_travel_time_multiplier() == float('inf')

def test_rescue_optimizer():
    weather = {
        "waveHeight": 1.6,
        "windSpeed": 20.0,
        "windDirection": "SW",
        "visibility": 8.0
    }
    
    sos_coords = {"latitude": 12.9141, "longitude": 74.8560}
    
    responders = [
        {
            "id": "v1",
            "name": "Responder 1 (Near)",
            "latitude": 12.9241,  # ~1.1 km away
            "longitude": 74.8560,
            "speed_knots": 20.0
        },
        {
            "id": "v2",
            "name": "Responder 2 (Far)",
            "latitude": 13.1141,  # ~22 km away
            "longitude": 74.8560,
            "speed_knots": 30.0
        }
    ]
    
    optimizer = RescueOptimizer(weather)
    result = optimizer.optimize(sos_coords, responders)
    
    # Near responder should be selected
    assert result["vessel_id"] == "v1"
    assert result["vessel_name"] == "Responder 1 (Near)"
    assert result["eta_minutes"] > 0
    assert len(result["route"]) == 2
