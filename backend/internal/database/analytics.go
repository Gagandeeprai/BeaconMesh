package database

import (
	"encoding/json"
	"log"
	"net/http"
)

// AnalyticsSummary contains compiled statistics from PostGIS history tables.
type AnalyticsSummary struct {
	TotalVesselsTracked int                    `json:"totalVesselsTracked"`
	AverageVesselSpeed  float64                `json:"averageVesselSpeed"`
	AlertsCountByType   map[string]int         `json:"alertsCountByType"`
	AlertsCountByLevel  map[string]int         `json:"alertsCountByLevel"`
	RecentAlerts        []map[string]interface{} `json:"recentAlerts"`
}

// GetAnalyticsSummary returns summarized operational metrics from PostgreSQL database.
func GetAnalyticsSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	summary := AnalyticsSummary{
		AlertsCountByType:  make(map[string]int),
		AlertsCountByLevel: make(map[string]int),
		RecentAlerts:       []map[string]interface{}{},
	}

	if DB == nil {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(summary)
		return
	}

	// 1. Count unique vessels
	err := DB.QueryRow("SELECT COUNT(DISTINCT vessel_id) FROM vessel_history").Scan(&summary.TotalVesselsTracked)
	if err != nil {
		log.Printf("analytics: failed to query vessel count: %v", err)
	}

	// 2. Average vessel speed
	err = DB.QueryRow("SELECT COALESCE(AVG(speed), 0.0) FROM vessel_history").Scan(&summary.AverageVesselSpeed)
	if err != nil {
		log.Printf("analytics: failed to query average speed: %v", err)
	}

	// 3. Count alerts by type
	typeRows, err := DB.Query("SELECT type, COUNT(*) FROM alerts_history GROUP BY type")
	if err == nil {
		defer typeRows.Close()
		for typeRows.Next() {
			var t string
			var count int
			if err := typeRows.Scan(&t, &count); err == nil {
				summary.AlertsCountByType[t] = count
			}
		}
	}

	// 4. Count alerts by severity
	severityRows, err := DB.Query("SELECT severity, COUNT(*) FROM alerts_history GROUP BY severity")
	if err == nil {
		defer severityRows.Close()
		for severityRows.Next() {
			var s string
			var count int
			if err := severityRows.Scan(&s, &count); err == nil {
				summary.AlertsCountByLevel[s] = count
			}
		}
	}

	// 5. Query top 5 recent alerts
	recentRows, err := DB.Query("SELECT id, vessel_name, type, severity, status FROM alerts_history ORDER BY timestamp DESC LIMIT 5")
	if err == nil {
		defer recentRows.Close()
		for recentRows.Next() {
			var id, name, t, severity, status string
			if err := recentRows.Scan(&id, &name, &t, &severity, &status); err == nil {
				summary.RecentAlerts = append(summary.RecentAlerts, map[string]interface{}{
					"id":         id,
					"vesselName": name,
					"type":       t,
					"severity":   severity,
					"status":     status,
				})
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}
