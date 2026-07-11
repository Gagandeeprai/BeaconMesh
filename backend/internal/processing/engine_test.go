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

	// In MPA (Lat 12.45 to 12.75, Lon 73.5 to 73.85)
	// Fishing vessel inside MPA should trigger violation
	violations := EvaluateRules("F-001", "Sea Harvest", "Fishing", 12.50, 73.60, 4.5, zones, entryTimes)

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
	violationsCargo := EvaluateRules("C-002", "Globe Carrier", "Cargo", 12.50, 73.60, 12.5, zones, entryTimes)
	for _, v := range violationsCargo {
		if v.RuleName == "Illegal Fishing" {
			t.Error("Cargo vessel triggered Illegal Fishing violation in ban zone")
		}
	}
}

func TestRulesSpeedViolation(t *testing.T) {
	zones := GetPredefinedZones()
	entryTimes := make(map[string]time.Time)

	// Port approach: Lat 12.85 to 13.05, Lon 74.65 to 74.9
	// Speed 12.5 knots > 10.0 knots
	violations := EvaluateRules("C-001", "Ocean Express", "Cargo", 12.95, 74.75, 12.5, zones, entryTimes)

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
