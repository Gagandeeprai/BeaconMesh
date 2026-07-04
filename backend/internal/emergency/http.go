package emergency

import (
	"encoding/json"
	"net/http"
	"sync"
)

type EmergencyStore struct {
	mu       sync.Mutex
	pending  []PendingEmergency
}

type PendingEmergency struct {
	VesselID    string `json:"vessel_id"`
	Type        string `json:"type"`
	Description string `json:"description"`
}

var store = &EmergencyStore{}

type EmergencyRequest struct {
	VesselID    string `json:"vessel_id"`
	Type        string `json:"type"`
	Description string `json:"description"`
}

func TriggerEmergency(w http.ResponseWriter, r *http.Request) {
	var req EmergencyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}
	if req.VesselID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "vessel_id is required"})
		return
	}
	if req.Type == "" {
		req.Type = "Engine Failure"
	}
	if req.Description == "" {
		req.Description = "Distress signal triggered via command."
	}

	store.mu.Lock()
	store.pending = append(store.pending, PendingEmergency{
		VesselID:    req.VesselID,
		Type:        req.Type,
		Description: req.Description,
	})
	store.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "SOS_TRIGGERED",
		"vessel_id": req.VesselID,
	})
}

func GetPendingEmergencies(w http.ResponseWriter, r *http.Request) {
	store.mu.Lock()
	pending := make([]PendingEmergency, len(store.pending))
	copy(pending, store.pending)
	store.pending = nil
	store.mu.Unlock()

	if pending == nil {
		pending = []PendingEmergency{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(pending)
}
