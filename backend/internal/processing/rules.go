package processing

import (
	"fmt"
	"time"
)

// RuleViolation represents a violation found by the Rule Engine.
type RuleViolation struct {
	RuleName    string    `json:"ruleName"`
	Severity    string    `json:"severity"` // "info", "warning", "critical", "emergency"
	Description string    `json:"description"`
	Action      string    `json:"recommendedAction"`
	Timestamp   time.Time `json:"timestamp"`
}

// EvaluateRules checks the current state of a vessel against geofenced zones.
// loiteringTracker: maps "vesselID:zoneID" -> first entry timestamp
// ponytail: loitering is tracked using a simple map with lock at engine level, clean and fast.
func EvaluateRules(vesselID string, name string, vType string, lat, lon, speed float64, zones []Zone, entryTimes map[string]time.Time) []RuleViolation {
	var violations []RuleViolation
	pos := Coordinate{Latitude: lat, Longitude: lon}

	for _, zone := range zones {
		inZone := PointInPolygon(pos, zone.Boundary)
		trackingKey := fmt.Sprintf("%s:%s", vesselID, zone.ID)

		if inZone {
			// Record entry time if not already tracked
			if _, exists := entryTimes[trackingKey]; !exists {
				entryTimes[trackingKey] = time.Now()
			}

			timeSpent := time.Since(entryTimes[trackingKey])

			switch zone.Type {
			case "fishing-ban":
				if vType == "Fishing" {
					violations = append(violations, RuleViolation{
						RuleName:    "Illegal Fishing",
						Severity:    "critical",
						Description: fmt.Sprintf("Vessel %s (%s) detected operating inside Netrani Marine Protected Area.", name, vesselID),
						Action:      "Dispatch Fisheries Department patrol and issue immediate regulatory warning.",
						Timestamp:   time.Now(),
					})
				}

			case "military-restricted":
				violations = append(violations, RuleViolation{
					RuleName:    "Restricted Area Intrusion",
					Severity:    "critical",
					Description: fmt.Sprintf("Vessel %s (%s) entered restricted Naval Command Sector.", name, vesselID),
					Action:      "Contact vessel on VHF Channel 16. Notify Coast Guard command room immediately.",
					Timestamp:   time.Now(),
				})

				// Loitering Check: stayed inside restricted zone for > 15 seconds
				if timeSpent >= 15*time.Second {
					violations = append(violations, RuleViolation{
						RuleName:    "Loitering In Restricted Zone",
						Severity:    "emergency",
						Description: fmt.Sprintf("Vessel %s (%s) loitering in restricted Naval Command Sector for %s.", name, vesselID, timeSpent.Round(time.Second)),
						Action:      "Scramble local quick-response interceptor vessel to identify and board target.",
						Timestamp:   time.Now(),
					})
				}

			case "port-channel":
				if speed > 10.0 {
					violations = append(violations, RuleViolation{
						RuleName:    "Speed Limit Violation",
						Severity:    "warning",
						Description: fmt.Sprintf("Vessel %s (%s) speed of %.1f knots exceeds 10.0 knots limit in port approach channel.", name, vesselID, speed),
						Action:      "Issue speed reduction advisory via harbor radio control.",
						Timestamp:   time.Now(),
					})
				}
			}
		} else {
			// Exited zone, clear entry tracking
			delete(entryTimes, trackingKey)
		}
	}

	return violations
}
