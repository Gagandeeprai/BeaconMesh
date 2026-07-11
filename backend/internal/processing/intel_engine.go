package processing

import (
	"time"
)

// CalculateThreatScore evaluates the threat score for a vessel based on current violations,
// history of updates, and loitering accumulation.
func CalculateThreatScore(vesselID string, violations []RuleViolation, speed float64, prevIntel *VesselState, entryTimes map[string]time.Time) (int, []string, []string) {
	score := 0
	var indicators []string
	var activeViolations []string

	// 1. Process active rule violations
	hasIllegalFishing := false
	hasRestrictedIntrusion := false
	hasSpeedViolation := false
	hasAISSilence := false
	hasCourseAnomaly := false

	for _, v := range violations {
		activeViolations = append(activeViolations, v.RuleName)
		switch v.RuleName {
		case "Illegal Fishing", "Fishing Behavior Pattern":
			if !hasIllegalFishing {
				score += 30
				indicators = append(indicators, "Illegal Fishing Behavior Detected")
				hasIllegalFishing = true
			}
		case "Restricted Area Intrusion", "Loitering In Restricted Zone":
			if !hasRestrictedIntrusion {
				score += 25
				indicators = append(indicators, "Restricted Area Intrusion")
				hasRestrictedIntrusion = true
			}
		case "Speed Limit Violation":
			if !hasSpeedViolation {
				score += 10
				indicators = append(indicators, "Port Speed Limit Violation")
				hasSpeedViolation = true
			}
		case "AIS Silence", "Dark Vessel":
			if !hasAISSilence {
				score += 20
				indicators = append(indicators, "Suspicious AIS Silence")
				hasAISSilence = true
			}
		case "Course Anomaly":
			if !hasCourseAnomaly {
				score += 10
				indicators = append(indicators, "Sudden Course Anomaly")
				hasCourseAnomaly = true
			}
		case "MMSI Spoofing":
			score += 25
			indicators = append(indicators, "MMSI Identity Spoofing Detected")
		}
	}

	// 2. Stateful Loitering Accumulator
	// Check if the vessel is loitering (speed <= 2.0 knots for an extended period)
	loiteringDuration := 0.0
	if speed <= 2.0 {
		// Find when the vessel started idling in any geofence zone
		for trackingKey, entryTime := range entryTimes {
			// trackingKey format is "vesselID:zoneID"
			if len(trackingKey) > len(vesselID) && trackingKey[:len(vesselID)] == vesselID {
				duration := time.Since(entryTime).Seconds()
				if duration > loiteringDuration {
					loiteringDuration = duration
				}
			}
		}
		
		// If loitering exceeds 10 minutes, apply loitering threat weight
		if loiteringDuration >= 600.0 { // 10 minutes
			score += 15
			indicators = append(indicators, "Active Vessel Loitering")
		}
	}

	// 3. Repeated Violations Multiplier
	// If the vessel had previous threat indicators, carry over some risk based on historical violation count
	violationCount := 0
	if prevIntel != nil {
		violationCount = len(prevIntel.ActiveViolations)
		if violationCount > 0 {
			// Carry over historic violation count weight
			score += violationCount * 5
			indicators = append(indicators, "Repeated Violations History")
		}
	}

	// Cap score at 100
	if score > 100 {
		score = 100
	}

	return score, indicators, activeViolations
}
