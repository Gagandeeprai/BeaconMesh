package database

import (
	"testing"
)

func TestRecordVesselHistory(t *testing.T) {
	if DB == nil {
		t.Skip("PostgreSQL database connection is not active. Skipping integration test.")
	}

	err := RecordVesselHistory(DB, "TEST-MMSI-01", "Vessel Test", "Cargo", 12.9, 74.8, 12.5, "Low")
	if err != nil {
		t.Fatalf("failed to record vessel history: %v", err)
	}
}

func TestRecordAlertHistory(t *testing.T) {
	if DB == nil {
		t.Skip("PostgreSQL database connection is not active. Skipping integration test.")
	}

	err := RecordAlertHistory(DB, "ALERT-TEST-01", "TEST-MMSI-01", "Vessel Test", "Protected Entry", "12.90, 74.80", "In Progress", "Medium", "Intrusion detected in Netrani MPA")
	if err != nil {
		t.Fatalf("failed to record alert history: %v", err)
	}
}
