package gateway

import (
	"encoding/json"
	"net/http"
	"sync"
)

// ── Config Store ─────────────────────────────────────────────────────────────

// ConfigStore is an in-memory, thread-safe key-value store for runtime
// operator configuration. Values persist for the lifetime of the process.
type ConfigStore struct {
	mu     sync.RWMutex
	values map[string]interface{}
}

// NewConfigStore returns a ConfigStore pre-loaded with default values.
// The key `loitering_threshold_seconds` is the required contract value.
func NewConfigStore() *ConfigStore {
	return &ConfigStore{
		values: map[string]interface{}{
			// Task 5 required key — loitering detection threshold
			"loitering_threshold_seconds": 1800.0,
			// Additional operational safety knobs
			"max_speed_knots":          25.0,
			"violation_margin_percent": 10.0,
			"ais_timeout_seconds":      300.0,
		},
	}
}

// Get returns a config value by key, and a boolean indicating if it exists.
func (c *ConfigStore) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.values[key]
	return v, ok
}

// GetFloat64 is a convenience getter with a fallback default.
func (c *ConfigStore) GetFloat64(key string, defaultVal float64) float64 {
	v, ok := c.Get(key)
	if !ok {
		return defaultVal
	}
	if f, ok := v.(float64); ok {
		return f
	}
	return defaultVal
}

// GetInt is a convenience getter that casts float64 → int (JSON numbers decode as float64).
func (c *ConfigStore) GetInt(key string, defaultVal int) int {
	return int(c.GetFloat64(key, float64(defaultVal)))
}

// Set updates or creates a config key at runtime without restart.
func (c *ConfigStore) Set(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.values[key] = value
}

// All returns a deep copy of the current config map for safe serialisation.
func (c *ConfigStore) All() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make(map[string]interface{}, len(c.values))
	for k, v := range c.values {
		out[k] = v
	}
	return out
}

// ── HTTP Handlers ─────────────────────────────────────────────────────────────

// ConfigHandler exposes GET /api/v1/config and PUT /api/v1/config/{key}.
type ConfigHandler struct {
	store *ConfigStore
}

// NewConfigHandler wires the handler to the given store.
func NewConfigHandler(store *ConfigStore) *ConfigHandler {
	return &ConfigHandler{store: store}
}

// GetConfig returns all current config values as JSON.
// Requires: Operator role or above.
func (h *ConfigHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"config": h.store.All(),
	})
}

// UpdateConfig sets a single config key at runtime.
// Body: {"value": <number|string>}
// Requires: Administrator role.
func (h *ConfigHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	if key == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "config key is required in URL path"})
		return
	}

	var body struct {
		Value interface{} `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON body — expected {\"value\": ...}"})
		return
	}

	h.store.Set(key, body.Value)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "updated",
		"key":    key,
		"value":  body.Value,
	})
}
