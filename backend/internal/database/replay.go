package database

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for POC
	},
}

// ReplayPoint defines historical data to stream back over WebSocket.
type ReplayPoint struct {
	VesselID  string    `json:"vesselId"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Speed     float64   `json:"speed"`
	RiskLevel string    `json:"riskLevel"`
	Timestamp time.Time `json:"timestamp"`
}

// HandleReplayWebSocket processes historical telemetry query slices and streams WebSockets packets.
func HandleReplayWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("replay: failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	log.Println("replay: client connected for historical replay feed")

	if DB == nil {
		log.Println("replay: DB is not initialized. Exiting.")
		_ = conn.WriteJSON(map[string]string{"error": "database is unavailable"})
		return
	}

	// Parse start/end parameters (optional, defaults to last 1 hour)
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	startTime := time.Now().Add(-1 * time.Hour)
	endTime := time.Now()

	if startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			startTime = t
		}
	}
	if endStr != "" {
		if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			endTime = t
		}
	}

	// Query historical vessel updates
	query := `
		SELECT vessel_id, name, type, latitude, longitude, speed, risk_level, timestamp
		FROM vessel_history
		WHERE timestamp BETWEEN $1 AND $2
		ORDER BY timestamp ASC
		LIMIT 1000
	`
	rows, err := DB.Query(query, startTime, endTime)
	if err != nil {
		log.Printf("replay: db query failed: %v", err)
		_ = conn.WriteJSON(map[string]string{"error": "database query failed"})
		return
	}
	defer rows.Close()

	// Stream matching coordinates down the connection
	for rows.Next() {
		var p ReplayPoint
		err := rows.Scan(&p.VesselID, &p.Name, &p.Type, &p.Latitude, &p.Longitude, &p.Speed, &p.RiskLevel, &p.Timestamp)
		if err != nil {
			log.Printf("replay: row scan failed: %v", err)
			continue
		}

		if err := conn.WriteJSON(p); err != nil {
			log.Printf("replay: websocket write failed: %v", err)
			return
		}

		// Brief delay to simulate playback speed
		time.Sleep(100 * time.Millisecond)
	}

	log.Println("replay: streamed all matching historical data points to client")
}
