package domain

import (
	"math"
	"time"
)

type WeatherData struct {
	Condition     string    `json:"condition"`
	Temperature   float64   `json:"temperature"`
	WindSpeed     float64   `json:"windSpeed"`
	WindDirection string    `json:"windDirection"`
	Visibility    float64   `json:"visibility"`
	WeatherCode   int       `json:"weatherCode"`
}

type MarineData struct {
	WaveHeight    float64   `json:"waveHeight"`
	WavePeriod    float64   `json:"wavePeriod"`
	WaveDirection float64   `json:"waveDirection"`
}

type MarineAdvisory struct {
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type WeatherReport struct {
	Location  string         `json:"location"`
	UpdatedAt time.Time      `json:"updatedAt"`
	Weather   WeatherData    `json:"weather"`
	Marine    MarineData     `json:"marine"`
	Advisory  MarineAdvisory `json:"advisory"`
}

// MapWeatherCode maps WMO weather codes to human-readable strings
func MapWeatherCode(code int) string {
	switch code {
	case 0:
		return "Clear Sky"
	case 1:
		return "Mainly Clear"
	case 2:
		return "Partly Cloudy"
	case 3:
		return "Overcast"
	case 45, 48:
		return "Fog"
	case 51, 53, 55:
		return "Light Drizzle"
	case 61:
		return "Light Rain"
	case 63:
		return "Moderate Rain"
	case 65:
		return "Heavy Rain"
	case 71, 73, 75:
		return "Snow"
	case 80, 81, 82:
		return "Rain Showers"
	case 95, 96, 99:
		return "Thunderstorm"
	default:
		return "Unknown Weather Condition"
	}
}

// DegreesToCompass converts wind or wave direction degrees to compass directions
func DegreesToCompass(deg float64) string {
	directions := []string{"N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"}
	index := int(math.Floor((deg+11.25)/22.5)) % 16
	if index < 0 {
		index += 16
	}
	return directions[index]
}
