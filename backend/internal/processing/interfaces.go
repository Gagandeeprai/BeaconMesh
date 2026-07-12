package processing

import (
	"encoding/json"
	"net/http"
)

type Handler struct {
	engine     *Engine
	alertStore *AlertStore
}

func NewHandler(engine *Engine, alertStore *AlertStore) *Handler {
	return &Handler{
		engine:     engine,
		alertStore: alertStore,
	}
}

// GetZones returns the list of predefined geofence zones.
func (h *Handler) GetZones(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(h.engine.zones)
}

// GetAlerts returns active violations/distress alerts.
func (h *Handler) GetAlerts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(h.alertStore.GetActiveAlerts())
}

// GetThreats returns a summary of vessels with active threat score calculations.
func (h *Handler) GetThreats(w http.ResponseWriter, r *http.Request) {
	vessels := h.engine.GetVesselStates()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(vessels)
}

// AcknowledgeAlertRequest defines body payload to acknowledge alert.
type AcknowledgeAlertRequest struct {
	ID        string `json:"id"`
	Responder string `json:"responder"`
	ETAMin    int    `json:"etaMin"`
}

// AcknowledgeAlert marks an alert as Acknowledged.
func (h *Handler) AcknowledgeAlert(w http.ResponseWriter, r *http.Request) {
	var req AcknowledgeAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.ID == "" {
		http.Error(w, `{"error":"id is required"}`, http.StatusBadRequest)
		return
	}

	success := h.alertStore.AcknowledgeAlert(req.ID, req.Responder, req.ETAMin)
	if !success {
		http.Error(w, `{"error":"alert not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"status": "acknowledged", "id": req.ID})
}

// IngestTelemetryRequest defines the telemetry payload.
type IngestTelemetryRequest struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Type          string  `json:"type"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	Speed         float64 `json:"speed"`
	WaveHeight    float64 `json:"waveHeight"`
	WindSpeed     float64 `json:"windSpeed"`
	Visibility    float64 `json:"visibility"`
}

// IngestTelemetry receives client vessel position reports.
func (h *Handler) IngestTelemetry(w http.ResponseWriter, r *http.Request) {
	var req IngestTelemetryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.ID == "" || req.Name == "" {
		http.Error(w, `{"error":"id and name are required"}`, http.StatusBadRequest)
		return
	}

	// Fetch weather variables defaults if not supplied
	if req.Visibility <= 0 {
		req.Visibility = 10000.0
	}

	h.engine.ProcessUpdate(req.ID, req.Name, req.Type, req.Latitude, req.Longitude, req.Speed, req.WaveHeight, req.WindSpeed, req.Visibility)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"status": "ingested", "id": req.ID})
}

// GetMetrics returns statistics on processing.
func (h *Handler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(h.engine.GetMetrics())
}

