package interfaces

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/beaconmesh/backend/internal/weather/application"
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
	lat := 12.9141
	lon := 74.8560

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

type RescueHandler struct {
	pythonSolverURL string
	client          *http.Client
}

func NewRescueHandler(pythonSolverURL string) *RescueHandler {
	return &RescueHandler{
		pythonSolverURL: pythonSolverURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (h *RescueHandler) OptimizeRescue(w http.ResponseWriter, r *http.Request) {
	// Limit request body to 1 MB
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, h.pythonSolverURL, r.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to create request to optimization solver",
		})
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(req)
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

