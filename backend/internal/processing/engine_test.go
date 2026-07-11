package processing

import (
	"testing"
	"time"
)

func TestPointInPolygon(t *testing.T) {
	// A square zone: Lat 12.0 to 13.0, Lon 74.0 to 75.0
	polygon := []Coordinate{
		{Latitude: 12.0, Longitude: 74.0},
		{Latitude: 12.0, Longitude: 75.0},
		{Latitude: 13.0, Longitude: 75.0},
		{Latitude: 13.0, Longitude: 74.0},
	}

	tests := []struct {
		point    Coordinate
		expected bool
	}{
		{Coordinate{Latitude: 12.5, Longitude: 74.5}, true},
		{Coordinate{Latitude: 11.5, Longitude: 74.5}, false},
		{Coordinate{Latitude: 12.5, Longitude: 75.5}, false},
	}

	for _, tt := range tests {
		result := PointInPolygon(tt.point, polygon)
		if result != tt.expected {
			t.Errorf("Point %v in polygon: expected %v, got %v", tt.point, tt.expected, result)
		}
	}
}

func TestRulesIllegalFishing(t *testing.T) {
	zones := GetPredefinedZones()
	entryTimes := make(map[string]time.Time)
	threshold := 30 * time.Minute

	// In MPA (Lat 12.45 to 12.75, Lon 73.5 to 73.85)
	// Fishing vessel inside MPA should trigger violation
	violations := EvaluateRules("F-001", "Sea Harvest", "Fishing", 12.50, 73.60, 4.5, zones, entryTimes, threshold)

	found := false
	for _, v := range violations {
		if v.RuleName == "Illegal Fishing" {
			found = true
			if v.Severity != "critical" {
				t.Errorf("Expected critical severity for illegal fishing, got %s", v.Severity)
			}
		}
	}

	if !found {
		t.Error("Expected 'Illegal Fishing' violation not found")
	}

	// Cargo vessel inside MPA should NOT trigger illegal fishing
	violationsCargo := EvaluateRules("C-002", "Globe Carrier", "Cargo", 12.50, 73.60, 12.5, zones, entryTimes, threshold)
	for _, v := range violationsCargo {
		if v.RuleName == "Illegal Fishing" {
			t.Error("Cargo vessel triggered Illegal Fishing violation in ban zone")
		}
	}
}

func TestRulesSpeedViolation(t *testing.T) {
	zones := GetPredefinedZones()
	entryTimes := make(map[string]time.Time)
	threshold := 30 * time.Minute

	// Port approach: Lat 12.85 to 13.05, Lon 74.65 to 74.9
	// Speed 12.5 knots > 10.0 knots
	violations := EvaluateRules("C-001", "Ocean Express", "Cargo", 12.95, 74.75, 12.5, zones, entryTimes, threshold)

	found := false
	for _, v := range violations {
		if v.RuleName == "Speed Limit Violation" {
			found = true
			if v.Severity != "warning" {
				t.Errorf("Expected warning severity for speed violation, got %s", v.Severity)
			}
		}
	}

	if !found {
		t.Error("Expected Speed Limit Violation not found")
	}
}

func TestCalculateRisk(t *testing.T) {
	// Calm weather, large vessel -> low risk
	lvl, _ := CalculateRisk("Cargo", 15.0, 0.5, 10.0, 10000.0)
	if lvl != "low" {
		t.Errorf("Expected low risk, got %s", lvl)
	}

	// Severe weather, small vessel -> critical risk
	lvlSec, _ := CalculateRisk("Fishing", 2.0, 4.5, 55.0, 400.0)
	if lvlSec != "critical" {
		t.Errorf("Expected critical risk, got %s", lvlSec)
	}
}

func TestAISSilence(t *testing.T) {
	now := time.Now()

	// Recent update (1 minute ago) -> no violation
	recent := now.Add(-1 * time.Minute)
	violations := CheckAISSilence("V-001", "Test Ship", recent, now)
	if len(violations) != 0 {
		t.Errorf("Expected no AIS Silence violations for recent update, got %d", len(violations))
	}

	// Stale update (6 minutes ago) -> should trigger violation
	stale := now.Add(-6 * time.Minute)
	violations = CheckAISSilence("V-002", "Silent Ship", stale, now)
	found := false
	for _, v := range violations {
		if v.RuleName == "AIS Silence" {
			found = true
		}
	}
	if !found {
		t.Error("Expected AIS Silence violation not found for stale vessel")
	}
}

func TestCourseAnomaly(t *testing.T) {
	// Small heading change (10°) at speed -> no violation
	violations := CheckCourseAnomaly("V-001", "Steady Ship", 100.0, 110.0, 12.0)
	if len(violations) != 0 {
		t.Errorf("Expected no course anomaly for small heading change, got %d", len(violations))
	}

	// Large heading change (90°) at speed -> should trigger violation
	violations = CheckCourseAnomaly("V-002", "Erratic Ship", 90.0, 180.0, 15.0)
	found := false
	for _, v := range violations {
		if v.RuleName == "Course Anomaly" {
			found = true
		}
	}
	if !found {
		t.Error("Expected Course Anomaly violation not found for large heading change")
	}

	// Large heading change but vessel is stationary -> no violation
	violations = CheckCourseAnomaly("V-003", "Drifting Ship", 10.0, 200.0, 0.5)
	if len(violations) != 0 {
		t.Errorf("Expected no course anomaly for stationary vessel, got %d", len(violations))
	}

	// Wrapping case: 350° -> 10° = 20° change -> no violation
	violations = CheckCourseAnomaly("V-004", "Wrap Ship", 350.0, 10.0, 12.0)
	if len(violations) != 0 {
		t.Errorf("Expected no course anomaly for 20-degree wrapping change, got %d", len(violations))
	}
}

