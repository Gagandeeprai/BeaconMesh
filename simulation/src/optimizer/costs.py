class WeatherCostModel:
    def __init__(self, wave_height: float = 0.0, wind_speed: float = 0.0, wind_direction: str = "N", visibility: float = 10.0):
        self.wave_height = wave_height
        self.wind_speed = wind_speed
        self.wind_direction = wind_direction
        self.visibility = visibility

    def get_travel_time_multiplier(self) -> float:
        """
        Calculates a travel time multiplier (>= 1.0) based on weather conditions.
        If conditions are completely blocked, returns float('inf').
        """
        # Wave Height penalty: if > 4m, blocked. Otherwise, increase cost by 15% for every meter above 1.2m
        if self.wave_height > 4.0:
            return float('inf')
        
        wave_penalty = 0.0
        if self.wave_height > 1.2:
            wave_penalty = (self.wave_height - 1.2) * 0.15
            
        # Wind Speed penalty: only above 15 km/h, increase cost by 5% for every 10 km/h above 15 km/h
        if self.wind_speed > 60.0:
            return float('inf')
        wind_penalty = 0.0
        if self.wind_speed > 15.0:
            wind_penalty = ((self.wind_speed - 15.0) / 10.0) * 0.05
        
        # Visibility penalty: if < 2km, increase travel time by 30%. If < 0.5km, blocked
        if self.visibility < 0.5:
            return float('inf')
        visibility_penalty = 0.0
        if self.visibility < 2.0:
            visibility_penalty = 0.30
            
        # Combined multiplier
        multiplier = 1.0 + wave_penalty + wind_penalty + visibility_penalty
        return multiplier
