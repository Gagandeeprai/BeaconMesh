package processing

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/beaconmesh/backend/internal/database"
)

// DefaultLoiteringThreshold is the default duration before a vessel is considered loitering.
// This can be overridden at runtime via the configuration service (Person 2, Task 5).
var DefaultLoiteringThreshold = 30 * time.Minute

// VesselState holds the current known location and metadata for a vessel in-memory.
type VesselState struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Speed       float64   `json:"speed"`
	Heading     float64   `json:"heading"`
	LastUpdated time.Time `json:"lastUpdated"`
	RiskLevel   string    `json:"riskLevel"`
	RiskDetails string    `json:"riskDetails"`
}

// Engine acts as the central High-Speed Processing Engine state and coordinator.
type Engine struct {
	mu           sync.RWMutex
	vesselStates map[string]VesselState
	zones        []Zone
	entryTimes   map[string]time.Time
	alerts       *AlertStore

	// Configurable thresholds
	loiteringThreshold time.Duration

	// Benchmark state — benchmarkCancel is guarded by mu to avoid data races.
	benchmarkActive int32 // atomic bool
	benchmarkCancel context.CancelFunc

	// Performance metrics with quantile tracking
	metricsMu       sync.Mutex
	totalProcessed  uint64
	totalLatency    time.Duration
	latencySamples  []float64 // rolling latency samples in microseconds
	lastThroughput  float64
	lastAvgLatency  float64
	lastP50Latency  float64
	lastP99Latency  float64
	lastMaxLatency  float64
	metricReset     time.Time
}

func NewEngine(alerts *AlertStore) *Engine {
	return &Engine{
		vesselStates:       make(map[string]VesselState),
		zones:              GetPredefinedZones(),
		entryTimes:         make(map[string]time.Time),
		alerts:             alerts,
		loiteringThreshold: DefaultLoiteringThreshold,
		latencySamples:     make([]float64, 0, 10000),
		metricReset:        time.Now(),
	}
}

// SetLoiteringThreshold updates the configurable loitering duration threshold at runtime.
func (e *Engine) SetLoiteringThreshold(d time.Duration) {
	e.mu.Lock()
	e.loiteringThreshold = d
	e.mu.Unlock()
}

// GetLoiteringThreshold returns the current loitering threshold.
func (e *Engine) GetLoiteringThreshold() time.Duration {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.loiteringThreshold
}

// ProcessUpdate ingests a single vessel update, runs rules and calculates operational risk.
func (e *Engine) ProcessUpdate(id string, name string, vType string, lat, lon, speed float64, waveHeight, windSpeed, visibility float64) {
	e.ProcessUpdateWithHeading(id, name, vType, lat, lon, speed, 0.0, waveHeight, windSpeed, visibility)
}

// ProcessUpdateWithHeading ingests a vessel update including heading for course anomaly detection.
func (e *Engine) ProcessUpdateWithHeading(id string, name string, vType string, lat, lon, speed, heading float64, waveHeight, windSpeed, visibility float64) {
	startTime := time.Now()

	// 1. Calculate operational risk based on weather parameters
	riskLevel, riskDetails := CalculateRisk(vType, speed, waveHeight, windSpeed, visibility)

	// 2. Save vessel state in memory and collect previous state for anomaly detection
	e.mu.Lock()
	prevState, hadPrev := e.vesselStates[id]
	e.vesselStates[id] = VesselState{
		ID:          id,
		Name:        name,
		Type:        vType,
		Latitude:    lat,
		Longitude:   lon,
		Speed:       speed,
		Heading:     heading,
		LastUpdated: startTime,
		RiskLevel:   riskLevel,
		RiskDetails: riskDetails,
	}

	// 3. Evaluate geofence rules
	violations := EvaluateRules(id, name, vType, lat, lon, speed, e.zones, e.entryTimes, e.loiteringThreshold)

	// 4. Check AIS Silence — detect vessels whose last update is stale
	if hadPrev {
		silenceViolations := CheckAISSilence(id, name, prevState.LastUpdated, startTime)
		violations = append(violations, silenceViolations...)

		// 5. Check Course Anomaly — detect sudden heading shifts
		courseViolations := CheckCourseAnomaly(id, name, prevState.Heading, heading, speed)
		violations = append(violations, courseViolations...)
	}
	e.mu.Unlock()

	// 6. Register active violations in AlertStore
	for _, v := range violations {
		// Severity mapping to fit frontend expectations ("High", "Medium", "Low")
		severity := "Medium"
		if v.Severity == "critical" || v.Severity == "emergency" {
			severity = "High"
		} else if v.Severity == "info" {
			severity = "Low"
		}

		alert := Alert{
			ID:            fmt.Sprintf("ALERT-%s-%s", id, v.RuleName),
			VesselID:      id,
			VesselName:    name,
			Type:          v.RuleName,
			Time:          v.Timestamp.Format("15:04:05"),
			Location:      fmt.Sprintf("%.4f° N, %.4f° E", lat, lon),
			Latitude:      lat,
			Longitude:     lon,
			Status:        "In Progress",
			Severity:      severity,
			PeopleOnboard: 12,
			Description:   v.Description,
		}

		e.alerts.AddOrUpdateAlert(alert)

		if atomic.LoadInt32(&e.benchmarkActive) == 0 {
			go func(a Alert) {
				_ = database.RecordAlertHistory(database.DB, a.ID, a.VesselID, a.VesselName, a.Type, a.Location, a.Status, a.Severity, a.Description)
			}(alert)
		}
	}

	// Async log coordinates to database for persistent historical tracking
	if atomic.LoadInt32(&e.benchmarkActive) == 0 {
		go func() {
			_ = database.RecordVesselHistory(database.DB, id, name, vType, lat, lon, speed, riskLevel)
		}()
	}

	elapsed := time.Since(startTime)
	latencyUs := float64(elapsed.Nanoseconds()) / 1000.0

	// 7. Update metrics with latency sample
	e.metricsMu.Lock()
	e.totalProcessed++
	e.totalLatency += elapsed
	e.latencySamples = append(e.latencySamples, latencyUs)
	e.metricsMu.Unlock()
}

// GetVesselStates returns a copy of all current vessel states.
func (e *Engine) GetVesselStates() []VesselState {
	e.mu.RLock()
	defer e.mu.RUnlock()

	result := make([]VesselState, 0, len(e.vesselStates))
	for _, v := range e.vesselStates {
		result = append(result, v)
	}
	return result
}

// BenchmarkActive returns whether the high-volume ingestion benchmark is currently running.
func (e *Engine) BenchmarkActive() bool {
	return atomic.LoadInt32(&e.benchmarkActive) == 1
}

// ToggleBenchmark switches the background high-volume load generator on or off.
// Data race fix: benchmarkCancel is now guarded by e.mu to prevent concurrent read/write.
func (e *Engine) ToggleBenchmark(enable bool) {
	if enable {
		if atomic.CompareAndSwapInt32(&e.benchmarkActive, 0, 1) {
			ctx, cancel := context.WithCancel(context.Background())
			e.mu.Lock()
			e.benchmarkCancel = cancel
			e.mu.Unlock()
			e.startBenchmarkLoop(ctx)
		}
	} else {
		if atomic.CompareAndSwapInt32(&e.benchmarkActive, 1, 0) {
			e.mu.Lock()
			if e.benchmarkCancel != nil {
				e.benchmarkCancel()
			}
			e.mu.Unlock()
		}
	}
}

// percentile returns the p-th percentile from a sorted slice of float64.
func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0.0
	}
	rank := p / 100.0 * float64(len(sorted)-1)
	lower := int(math.Floor(rank))
	upper := int(math.Ceil(rank))
	if lower == upper {
		return sorted[lower]
	}
	frac := rank - float64(lower)
	return sorted[lower]*(1-frac) + sorted[upper]*frac
}

// GetMetrics computes and returns current throughput and latency metrics including p50/p99/max.
func (e *Engine) GetMetrics() map[string]interface{} {
	e.metricsMu.Lock()
	defer e.metricsMu.Unlock()

	now := time.Now()
	elapsed := now.Sub(e.metricReset).Seconds()

	if elapsed >= 1.0 {
		e.lastThroughput = float64(e.totalProcessed) / elapsed
		if e.totalProcessed > 0 {
			e.lastAvgLatency = float64(e.totalLatency.Nanoseconds()) / float64(e.totalProcessed) / 1000.0 // in microseconds
		} else {
			e.lastAvgLatency = 0.0
		}

		// Calculate p50, p99, max from latency samples
		if len(e.latencySamples) > 0 {
			sort.Float64s(e.latencySamples)
			e.lastP50Latency = percentile(e.latencySamples, 50.0)
			e.lastP99Latency = percentile(e.latencySamples, 99.0)
			e.lastMaxLatency = e.latencySamples[len(e.latencySamples)-1]
		} else {
			e.lastP50Latency = 0.0
			e.lastP99Latency = 0.0
			e.lastMaxLatency = 0.0
		}

		e.totalProcessed = 0
		e.totalLatency = 0
		e.latencySamples = e.latencySamples[:0] // reset without deallocating
		e.metricReset = now
	}

	return map[string]interface{}{
		"benchmarkActive":   e.BenchmarkActive(),
		"throughput":        e.lastThroughput,
		"avgLatencyUs":      e.lastAvgLatency,
		"p50LatencyUs":      e.lastP50Latency,
		"p99LatencyUs":      e.lastP99Latency,
		"maxLatencyUs":      e.lastMaxLatency,
		"activeAlertsCount": len(e.alerts.GetActiveAlerts()),
	}
}

func (e *Engine) startBenchmarkLoop(ctx context.Context) {
	// Pre-create simulated vessel data to avoid allocating in loop
	vesselCount := 1000
	ids := make([]string, vesselCount)
	names := make([]string, vesselCount)
	types := []string{"Cargo", "Tanker", "Fishing", "Passenger", "Tug"}

	for i := 0; i < vesselCount; i++ {
		ids[i] = fmt.Sprintf("BENCH-%04d", i)
		names[i] = fmt.Sprintf("Vessel %04d", i)
	}

	// Spin up workers
	workers := 8
	jobs := make(chan int, 100000)

	for w := 0; w < workers; w++ {
		go func() {
			for {
				select {
				case <-ctx.Done():
					return
				case idx := <-jobs:
					id := ids[idx]
					name := names[idx]
					vType := types[idx%len(types)]
					// Random wander coordinate within Mangalore
					lat := 12.3 + rand.Float64()*1.3
					lon := 73.3 + rand.Float64()*1.65
					speed := 2.0 + rand.Float64()*25.0

					e.ProcessUpdate(id, name, vType, lat, lon, speed, 1.5, 10.0, 10000.0)
				}
			}
		}()
	}

	// Ingestion scheduler: targets 50,000 updates/second.
	// 50,000 updates/sec = 5,000 updates every 100ms.
	go func() {
		defer close(jobs)
		ticker := time.NewTicker(10 * time.Millisecond)
		defer ticker.Stop()

		batchSize := 500 // 50,000 updates per sec / 100 ticks per sec = 500 per tick

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				for i := 0; i < batchSize; i++ {
					select {
					case jobs <- rand.Intn(vesselCount):
					default: // Skip if channel is full to prevent freezing
					}
				}
			}
		}
	}()
}
