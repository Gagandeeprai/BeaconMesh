package interfaces

import (
	"encoding/json"
	"net/http"

	"github.com/beaconmesh/backend/internal/ais/application"
)

type AISHandler struct {
	service *application.Service
}

func NewAISHandler(service *application.Service) *AISHandler {
	return &AISHandler{service: service}
}

func (h *AISHandler) GetAISVessels(w http.ResponseWriter, r *http.Request) {
	vessels, err := h.service.GetVessels(r.Context())
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(vessels)
}

func (h *AISHandler) GetHealth(w http.ResponseWriter, r *http.Request) {
	health := h.service.Health()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(health)
}
