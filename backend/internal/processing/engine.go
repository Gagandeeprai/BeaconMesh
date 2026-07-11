package processing

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"sync/atomic"
	"time"
)

// VesselState holds the current known location and metadata for a vessel in-memory.
type VesselState struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Speed       float64   `json:"speed"`
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

	// Benchmark state
	benchmarkActive int32 // atomic bool
	benchmarkCancel context.CancelFunc

	// Performance metrics
	metricsMu      sync.Mutex
	totalProcessed uint64
	totalLatency   time.Duration
	lastThroughput float64
	lastAvgLatency float64
	metricReset    time.Time
}

func NewEngine(alerts *AlertStore) *Engine {
	return &Engine{
		vesselStates: make(map[string]VesselState),
		zones:        GetPredefinedZones(),
		entryTimes:   make(map[string]time.Time),
		alerts:       alerts,
		metricReset:  time.Now(),
	}
}

// ProcessUpdate ingests a single vessel update, runs rules and calculates operational risk.
// ponytail: processes a single update concurrently and updates the metrics thread-safely.
func (e *Engine) ProcessUpdate(id string, name string, vType string, lat, lon, speed float64, waveHeight, windSpeed, visibility float64) {
	startTime := time.Now()

	// 1. Calculate operational risk based on weather parameters
	riskLevel, riskDetails := CalculateRisk(vType, speed, waveHeight, windSpeed, visibility)

	// 2. Save vessel state in memory
	e.mu.Lock()
	e.vesselStates[id] = VesselState{
		ID:          id,
		Name:        name,
		Type:        vType,
		Latitude:    lat,
		Longitude:   lon,
		Speed:       speed,
		LastUpdated: startTime,
		RiskLevel:   riskLevel,
		RiskDetails: riskDetails,
	}

	// 3. Evaluate geofence rules
	violations := EvaluateRules(id, name, vType, lat, lon, speed, e.zones, e.entryTimes)
	e.mu.Unlock()

	// 4. Register active violations in AlertStore
	for _, v := range violations {
		// Severity mapping to fit frontend expectations ("High", "Medium", "Low")
		severity := "Medium"
		if v.Severity == "critical" || v.Severity == "emergency" {
			severity = "High"
		} else if v.Severity == "info" {
			severity = "Low"
		}

		e.alerts.AddOrUpdateAlert(Alert{
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
		})
	}

	elapsed := time.Since(startTime)

	// 5. Update metrics
	e.metricsMu.Lock()
	e.totalProcessed++
	e.totalLatency += elapsed
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
func (e *Engine) ToggleBenchmark(enable bool) {
	if enable {
		if atomic.CompareAndSwapInt32(&e.benchmarkActive, 0, 1) {
			ctx, cancel := context.WithCancel(context.Background())
			e.benchmarkCancel = cancel
			e.startBenchmarkLoop(ctx)
		}
	} else {
		if atomic.CompareAndSwapInt32(&e.benchmarkActive, 1, 0) {
			if e.benchmarkCancel != nil {
				e.benchmarkCancel()
			}
		}
	}
}

// GetMetrics computes and returns current throughput and latency metrics.
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
		e.totalProcessed = 0
		e.totalLatency = 0
		e.metricReset = now
	}

	return map[string]interface{}{
		"benchmarkActive":   e.BenchmarkActive(),
		"throughput":        e.lastThroughput,
		"avgLatencyUs":      e.lastAvgLatency,
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
