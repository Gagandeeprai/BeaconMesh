package interfaces

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/beaconmesh/backend/internal/weather/application"
	"github.com/beaconmesh/backend/internal/weather/infrastructure"
)

type WeatherHandler struct {
	service *application.WeatherService
}

func NewWeatherHandler(service *application.WeatherService) *WeatherHandler {
	return &WeatherHandler{
		service: service,
	}
}

// GetWeather handles the HTTP requests for current weather and marine advisory reports
func (h *WeatherHandler) GetWeather(w http.ResponseWriter, r *http.Request) {
	// Default coordinates for Mangalore
	lat := 12.9141
	lon := 74.8560

	// Allow overriding via query parameters
	if latStr := r.URL.Query().Get("latitude"); latStr != "" {
		if parsedLat, err := strconv.ParseFloat(latStr, 64); err == nil {
			lat = parsedLat
		}
	}
	if lonStr := r.URL.Query().Get("longitude"); lonStr != "" {
		if parsedLon, err := strconv.ParseFloat(lonStr, 64); err == nil {
			lon = parsedLon
		}
	}

	report, err := h.service.GetWeatherReport(r.Context(), lat, lon)
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
	_ = json.NewEncoder(w).Encode(report)
}

type AISHandler struct {
	provider infrastructure.AISProvider
}

func NewAISHandler(provider infrastructure.AISProvider) *AISHandler {
	return &AISHandler{provider: provider}
}

func (h *AISHandler) GetAISVessels(w http.ResponseWriter, r *http.Request) {
	vessels, err := h.provider.FetchVessels(r.Context())
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

type RescueHandler struct {
	pythonSolverURL string
}

func NewRescueHandler(pythonSolverURL string) *RescueHandler {
	return &RescueHandler{
		pythonSolverURL: pythonSolverURL,
	}
}

func (h *RescueHandler) OptimizeRescue(w http.ResponseWriter, r *http.Request) {
	resp, err := http.Post(h.pythonSolverURL, "application/json", r.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to connect to Python optimization solver: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

