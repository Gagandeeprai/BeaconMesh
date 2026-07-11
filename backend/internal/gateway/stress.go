package gateway

import (
	"encoding/json"
	"net/http"
)

// BenchmarkToggler is the interface the stress handler needs from the engine.
type BenchmarkToggler interface {
	ToggleBenchmark(enable bool)
	BenchmarkActive() bool
}

// StressHandler handles POST /api/v1/admin/stress-test.
// This endpoint activates or deactivates Person 3's high-throughput load generator.
// Requires: Administrator role.
type StressHandler struct {
	engine BenchmarkToggler
}

// NewStressHandler wires the handler to the engine.
func NewStressHandler(engine BenchmarkToggler) *StressHandler {
	return &StressHandler{engine: engine}
}

// ToggleStressTest handles POST /api/v1/admin/stress-test.
// Body: {"enable": true|false}
func (h *StressHandler) ToggleStressTest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Enable bool `json:"enable"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": `invalid request body — expected {"enable": true|false}`,
		})
		return
	}

	h.engine.ToggleBenchmark(req.Enable)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":          "updated",
		"benchmark_active": h.engine.BenchmarkActive(),
	})
}
