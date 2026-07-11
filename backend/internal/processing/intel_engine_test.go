package processing

import (
	"testing"
	"time"
)

func TestCalculateThreatScore(t *testing.T) {
	entryTimes := make(map[string]time.Time)

	// Test case 1: Vessel with no violations and moving -> Threat Score should be 0
	score, indicators, activeViolations := CalculateThreatScore("V-001", nil, 10.0, nil, entryTimes)
	if score != 0 {
		t.Errorf("Expected threat score 0, got %d", score)
	}
	if len(indicators) != 0 {
		t.Errorf("Expected 0 indicators, got %d", len(indicators))
	}
	if len(activeViolations) != 0 {
		t.Errorf("Expected 0 active violations, got %d", len(activeViolations))
	}

	// Test case 2: Vessel with Illegal Fishing -> Threat Score should be 30
	violations := []RuleViolation{
		{RuleName: "Illegal Fishing", Severity: "critical", Timestamp: time.Now()},
	}
	score, indicators, activeViolations = CalculateThreatScore("V-002", violations, 5.0, nil, entryTimes)
	if score != 30 {
		t.Errorf("Expected threat score 30, got %d", score)
	}
	if len(indicators) != 1 || indicators[0] != "Illegal Fishing Behavior Detected" {
		t.Errorf("Expected indicator 'Illegal Fishing Behavior Detected', got %v", indicators)
	}
	if len(activeViolations) != 1 || activeViolations[0] != "Illegal Fishing" {
		t.Errorf("Expected active violation 'Illegal Fishing', got %v", activeViolations)
	}

	// Test case 3: Vessel loitering for > 10 minutes -> Add 15 threat points
	// Register entry time for vessel V-003:zone-1 as 15 minutes ago
	entryTimes["V-003:zone-1"] = time.Now().Add(-15 * time.Minute)
	score, indicators, activeViolations = CalculateThreatScore("V-003", nil, 1.0, nil, entryTimes)
	if score != 15 {
		t.Errorf("Expected threat score 15 for loitering, got %d", score)
	}
	if len(indicators) != 1 || indicators[0] != "Active Vessel Loitering" {
		t.Errorf("Expected indicator 'Active Vessel Loitering', got %v", indicators)
	}

	// Test case 4: Combined threat factors (Illegal Fishing + Restricted Entry + History) -> Score should cap at 100
	violations = []RuleViolation{
		{RuleName: "Illegal Fishing", Severity: "critical", Timestamp: time.Now()},
		{RuleName: "Restricted Area Intrusion", Severity: "critical", Timestamp: time.Now()},
		{RuleName: "MMSI Spoofing", Severity: "critical", Timestamp: time.Now()},
	}
	prevIntel := &VesselState{
		ActiveViolations: []string{"Illegal Fishing", "AIS Silence"},
	}
	score, _, _ = CalculateThreatScore("V-004", violations, 0.5, prevIntel, entryTimes)
	if score != 90 { // 30 (fishing) + 25 (restricted) + 25 (spoofing) + 10 (2 historic violations * 5) = 90
		t.Errorf("Expected threat score 90, got %d", score)
	}
}
