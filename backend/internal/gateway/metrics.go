package gateway

import (
	"encoding/json"
	"net/http"
	"sort"
	"sync"
	"time"
)

// ── Quantile Latency Tracker ─────────────────────────────────────────────────

// LatencyTracker records a sliding window of processing latencies and
// can compute p50 / p99 / max quantiles on demand.
type LatencyTracker struct {
	mu     sync.Mutex
	window []int64 // nanoseconds, fixed-size ring buffer
	head   int
	full   bool
	size   int
}

// NewLatencyTracker creates a tracker with a ring buffer of `size` samples.
func NewLatencyTracker(size int) *LatencyTracker {
	return &LatencyTracker{
		window: make([]int64, size),
		size:   size,
	}
}

// Record adds a single latency sample (duration) to the ring buffer.
func (t *LatencyTracker) Record(d time.Duration) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.window[t.head] = d.Nanoseconds()
	t.head = (t.head + 1) % t.size
	if t.head == 0 {
		t.full = true
	}
}

// Quantiles returns p50, p99, and max latency in microseconds.
// Returns zeros if no samples have been recorded yet.
func (t *LatencyTracker) Quantiles() (p50, p99, maxUs float64) {
	t.mu.Lock()
	defer t.mu.Unlock()

	n := t.size
	if !t.full {
		n = t.head
	}
	if n == 0 {
		return 0, 0, 0
	}

	samples := make([]int64, n)
	copy(samples, t.window[:n])
	sort.Slice(samples, func(i, j int) bool { return samples[i] < samples[j] })

	toUs := func(ns int64) float64 { return float64(ns) / 1000.0 }

	p50 = toUs(samples[int(float64(n)*0.50)])
	p99 = toUs(samples[int(float64(n)*0.99)])
	maxUs = toUs(samples[n-1])
	return
}

// ── Metrics Handler ──────────────────────────────────────────────────────────

// MetricsSource is the interface the gateway metrics handler needs from the engine.
// The processing.Engine already satisfies this — we just need the extra method below.
type MetricsSource interface {
	GetMetrics() map[string]interface{}
}

// MetricsHandler serves GET /api/v1/metrics with quantile-enriched data.
type MetricsHandler struct {
	engine  MetricsSource
	tracker *LatencyTracker
}

// NewMetricsHandler wires the handler to the processing engine and a shared tracker.
func NewMetricsHandler(engine MetricsSource, tracker *LatencyTracker) *MetricsHandler {
	return &MetricsHandler{engine: engine, tracker: tracker}
}

// GetMetrics handles GET /api/v1/metrics.
// Returns throughput + p50/p99/max latency quantiles + active alert count.
// Requires: Analyst role or above.
func (h *MetricsHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	raw := h.engine.GetMetrics()
	p50, p99, maxUs := h.tracker.Quantiles()

	// Fallback: if tracker has no data yet, use the engine's avg latency for p50
	if p50 == 0 {
		if avg, ok := raw["avgLatencyUs"].(float64); ok {
			p50 = avg
			p99 = avg * 3 // rough approximation until data arrives
			maxUs = avg * 5
		}
	}

	throughput := 0.0
	if tp, ok := raw["throughput"].(float64); ok {
		throughput = tp
	}
	benchmarkActive := false
	if ba, ok := raw["benchmarkActive"].(bool); ok {
		benchmarkActive = ba
	}
	alertCount := 0
	if ac, ok := raw["activeAlertsCount"].(int); ok {
		alertCount = ac
	}

	resp := map[string]interface{}{
		"throughput_msg_per_sec": throughput,
		"latency_p50_us":         p50,
		"latency_p99_us":         p99,
		"latency_max_us":         maxUs,
		"benchmark_active":        benchmarkActive,
		"active_alerts_count":     alertCount,
		"sampled_at":              time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
