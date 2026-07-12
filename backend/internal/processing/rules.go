package processing

import (
	"fmt"
	"math"
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

// ────────────────────────────────────────────────────────────────────────────
// Milestone 1 — MVP Rules
// ────────────────────────────────────────────────────────────────────────────

// EvaluateRules checks the current state of a vessel against geofenced zones.
// loiteringTracker: maps "vesselID:zoneID" -> first entry timestamp.
// loiteringThreshold: configurable duration (matches Person 2's `loitering_threshold_seconds` key).
func EvaluateRules(vesselID string, name string, vType string, lat, lon, speed float64, zones []Zone, entryTimes map[string]time.Time, loiteringThreshold time.Duration) []RuleViolation {
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

			// Rule: Protected Area Entry (fishing-ban zones)
			switch zone.Type {
			case "fishing-ban":
				if vType == "Fishing" {
					violations = append(violations, RuleViolation{
						RuleName:    "Illegal Fishing",
						Severity:    "critical",
						Description: fmt.Sprintf("Vessel %s (%s) detected operating inside %s.", name, vesselID, zone.Name),
						Action:      "Dispatch Fisheries Department patrol and issue immediate regulatory warning.",
						Timestamp:   time.Now(),
					})
				}

			// Rule: Restricted Area Intrusion (military zones)
			case "military-restricted":
				if vType == "Rescue" || vType == "Coast Guard" {
					violations = append(violations, RuleViolation{
						RuleName:    "Checking its activity",
						Severity:    "info",
						Description: fmt.Sprintf("Rescue Vessel %s (%s) is intercepting or patrolling in %s.", name, vesselID, zone.Name),
						Action:      "Monitor operation progress.",
						Timestamp:   time.Now(),
					})
				} else if vType == "Fishing" {
					violations = append(violations, RuleViolation{
						RuleName:    "Illegal fishing",
						Severity:    "critical",
						Description: fmt.Sprintf("Fishing Vessel %s (%s) entered restricted %s.", name, vesselID, zone.Name),
						Action:      "Scramble Coast Guard to intercept and board.",
						Timestamp:   time.Now(),
					})
				} else {
					violations = append(violations, RuleViolation{
						RuleName:    "Restricted Area Intrusion",
						Severity:    "critical",
						Description: fmt.Sprintf("Vessel %s (%s) entered restricted %s.", name, vesselID, zone.Name),
						Action:      "Contact vessel on VHF Channel 16. Notify Coast Guard command room immediately.",
						Timestamp:   time.Now(),
					})
				}

				// Rule: Loitering Detection — configurable threshold (default 30 minutes)
				if timeSpent >= loiteringThreshold {
					violations = append(violations, RuleViolation{
						RuleName:    "Loitering In Restricted Zone",
						Severity:    "emergency",
						Description: fmt.Sprintf("Vessel %s (%s) loitering in restricted %s for %s.", name, vesselID, zone.Name, timeSpent.Round(time.Second)),
						Action:      "Scramble local quick-response interceptor vessel to identify and board target.",
						Timestamp:   time.Now(),
					})
				}

			// Rule: Speed Anomaly / Violations (port-channel zones)
			case "port-channel":
				if speed > 10.0 {
					violations = append(violations, RuleViolation{
						RuleName:    "Speed Limit Violation",
						Severity:    "warning",
						Description: fmt.Sprintf("Vessel %s (%s) speed of %.1f knots exceeds 10.0 knots limit in %s.", name, vesselID, speed, zone.Name),
						Action:      "Issue speed reduction advisory via harbor radio control.",
						Timestamp:   time.Now(),
					})
				}
			}

			// Rule: Loitering Detection — general loitering in any zone
			if zone.Type != "military-restricted" && timeSpent >= loiteringThreshold {
				violations = append(violations, RuleViolation{
					RuleName:    "Loitering Detected",
					Severity:    "warning",
					Description: fmt.Sprintf("Vessel %s (%s) has been loitering in %s for %s.", name, vesselID, zone.Name, timeSpent.Round(time.Second)),
					Action:      "Monitor vessel activity. Consider dispatching patrol for visual identification.",
					Timestamp:   time.Now(),
				})
			}
		} else {
			// Exited zone, clear entry tracking
			delete(entryTimes, trackingKey)
		}
	}

	return violations
}

// CheckAISSilence detects vessels whose AIS timestamp is stale (> 5 minutes since last update).
func CheckAISSilence(vesselID string, name string, lastSeen time.Time, now time.Time) []RuleViolation {
	var violations []RuleViolation

	silence := now.Sub(lastSeen)
	if silence >= 5*time.Minute {
		violations = append(violations, RuleViolation{
			RuleName:    "AIS Silence",
			Severity:    "warning",
			Description: fmt.Sprintf("Vessel %s (%s) has not transmitted AIS for %s. Possible transponder malfunction or intentional disabling.", name, vesselID, silence.Round(time.Second)),
			Action:      "Attempt contact on VHF. Flag vessel for visual monitoring.",
			Timestamp:   now,
		})
	}

	return violations
}

// CheckCourseAnomaly detects sudden heading changes (> 45° between consecutive updates)
// that may indicate erratic maneuvering, collision avoidance, or evasive behavior.
func CheckCourseAnomaly(vesselID string, name string, prevHeading, currHeading, speed float64) []RuleViolation {
	var violations []RuleViolation

	// Only flag course anomalies for moving vessels (> 2 knots) to avoid noise from drifting
	if speed < 2.0 {
		return violations
	}

	// Calculate minimum angular difference (handles 359° -> 1° wrapping)
	diff := math.Abs(currHeading - prevHeading)
	if diff > 180.0 {
		diff = 360.0 - diff
	}

	if diff >= 45.0 {
		violations = append(violations, RuleViolation{
			RuleName:    "Course Anomaly",
			Severity:    "warning",
			Description: fmt.Sprintf("Vessel %s (%s) heading changed by %.0f° (%.0f° → %.0f°). Sudden course deviation detected.", name, vesselID, diff, prevHeading, currHeading),
			Action:      "Monitor for erratic behavior. May indicate collision avoidance or evasive maneuvering.",
			Timestamp:   time.Now(),
		})
	}

	return violations
}

// ────────────────────────────────────────────────────────────────────────────
// Milestone 2 — Stretch Rules
// ────────────────────────────────────────────────────────────────────────────

// CheckMMSISpoofing detects if two distinct positions report the same MMSI/ID at the same time.
// Called externally by the engine when a duplicate position conflict is found.
func CheckMMSISpoofing(vesselID string, name string, pos1, pos2 Coordinate) []RuleViolation {
	var violations []RuleViolation
	dist := DistanceKM(pos1, pos2)

	// If same MMSI appears > 50 km apart, it's physically impossible
	if dist > 50.0 {
		violations = append(violations, RuleViolation{
			RuleName:    "MMSI Spoofing",
			Severity:    "critical",
			Description: fmt.Sprintf("Vessel %s (%s) detected at two positions %.1f km apart simultaneously. Identity conflict.", name, vesselID, dist),
			Action:      "Flag for identity verification. Possible MMSI cloning or spoofing attack.",
			Timestamp:   time.Now(),
		})
	}

	return violations
}

// CheckDarkVessel detects AIS silence specifically near restricted geofences.
// Combines AIS silence with proximity to restricted zones for heightened alerting.
func CheckDarkVessel(vesselID string, name string, lat, lon float64, lastSeen time.Time, now time.Time, zones []Zone) []RuleViolation {
	var violations []RuleViolation

	silence := now.Sub(lastSeen)
	if silence < 5*time.Minute {
		return violations
	}

	pos := Coordinate{Latitude: lat, Longitude: lon}
	for _, zone := range zones {
		if zone.Type != "military-restricted" {
			continue
		}
		// Check if the vessel is within 10 km of a restricted zone centroid
		centroid := zoneCentroid(zone)
		if DistanceKM(pos, centroid) < 10.0 {
			violations = append(violations, RuleViolation{
				RuleName:    "Dark Vessel",
				Severity:    "critical",
				Description: fmt.Sprintf("Vessel %s (%s) AIS silent for %s near restricted %s. Possible intentional transponder disabling.", name, vesselID, silence.Round(time.Second), zone.Name),
				Action:      "Scramble aerial or patrol asset for visual identification. High priority intercept.",
				Timestamp:   now,
			})
		}
	}

	return violations
}

// CheckFishingBehavior detects slow looping tracks inside restricted zones
// that are indicative of trawling or net-dragging fishing operations.
func CheckFishingBehavior(vesselID string, name string, speed float64, lat, lon float64, zones []Zone) []RuleViolation {
	var violations []RuleViolation

	// Fishing behavior: slow speed (< 4 knots) inside a restricted zone
	if speed > 4.0 {
		return violations
	}

	pos := Coordinate{Latitude: lat, Longitude: lon}
	for _, zone := range zones {
		if zone.Type != "fishing-ban" {
			continue
		}
		if PointInPolygon(pos, zone.Boundary) {
			violations = append(violations, RuleViolation{
				RuleName:    "Fishing Behavior Pattern",
				Severity:    "critical",
				Description: fmt.Sprintf("Vessel %s (%s) exhibiting trawling behavior (%.1f kn) inside %s.", name, vesselID, speed, zone.Name),
				Action:      "Dispatch Fisheries enforcement. Document vessel activity for prosecution.",
				Timestamp:   time.Now(),
			})
		}
	}

	return violations
}

// ────────────────────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────────────────────

// zoneCentroid returns the geometric centroid of a zone's boundary polygon.
func zoneCentroid(z Zone) Coordinate {
	if len(z.Boundary) == 0 {
		return Coordinate{}
	}
	var sumLat, sumLon float64
	for _, c := range z.Boundary {
		sumLat += c.Latitude
		sumLon += c.Longitude
	}
	n := float64(len(z.Boundary))
	return Coordinate{Latitude: sumLat / n, Longitude: sumLon / n}
}
