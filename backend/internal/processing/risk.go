package processing

import (
	"strings"
)

// DynamicRisk calculates the risk profile of a vessel based on sea state conditions and vessel characteristics.
// returns riskLevel ("low", "moderate", "high", "critical") and details string.
// ponytail: calculation runs in-memory with basic arithmetic, satisfying PS5 latency requirement of <5ms.
func CalculateRisk(vType string, speed float64, waveHeight, windSpeed, visibility float64) (string, string) {
	score := 0.0
	var factors []string

	// 1. Sea State Wave Height impact
	if waveHeight > 4.0 {
		score += 50
		factors = append(factors, "extreme wave height (>4.0m)")
	} else if waveHeight > 2.5 {
		score += 30
		factors = append(factors, "rough sea state (>2.5m)")
	} else if waveHeight > 1.25 {
		score += 10
		factors = append(factors, "moderate swells (>1.25m)")
	}

	// 2. Wind Speed impact
	if windSpeed > 50.0 {
		score += 30
		factors = append(factors, "gale force winds (>50 km/h)")
	} else if windSpeed > 35.0 {
		score += 15
		factors = append(factors, "strong winds (>35 km/h)")
	}

	// 3. Visibility impact (meters)
	if visibility < 500 {
		score += 30
		factors = append(factors, "dense fog / low visibility (<500m)")
	} else if visibility < 1500 {
		score += 15
		factors = append(factors, "restricted visibility (<1.5km)")
	}

	// 4. Vessel Type correction (Smaller craft are more vulnerable)
	isSmallCraft := vType == "Fishing" || vType == "Tug" || vType == "Other"
	if isSmallCraft && score > 0 {
		score *= 1.4 // 40% risk multiplier for small boats in bad weather
		factors = append(factors, "small craft vulnerability multiplier")
	}

	// 5. Operational Status (Speed check)
	if speed < 1.0 {
		score += 15
		factors = append(factors, "near-stationary / potentially drifting")
	}

	// Determine risk category
	var level string
	switch {
	case score >= 70:
		level = "critical"
	case score >= 40:
		level = "high"
	case score >= 20:
		level = "moderate"
	default:
		level = "low"
	}

	var details string
	if len(factors) > 0 {
		details = "Elevated risk factors: " + strings.Join(factors, ", ")
	} else {
		details = "Normal weather and operational conditions."
	}

	return level, details
}
