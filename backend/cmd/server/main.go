package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/beaconmesh/backend/internal/database"

	aisApp "github.com/beaconmesh/backend/internal/ais/application"
	aisDomain "github.com/beaconmesh/backend/internal/ais/domain"
	aisInfra "github.com/beaconmesh/backend/internal/ais/infrastructure"
	aisHttp "github.com/beaconmesh/backend/internal/ais/interfaces"
	"github.com/beaconmesh/backend/internal/emergency"
	"github.com/beaconmesh/backend/internal/gateway"
	"github.com/beaconmesh/backend/internal/processing"
	"github.com/beaconmesh/backend/internal/shared/event"
	weatherApp "github.com/beaconmesh/backend/internal/weather/application"
	"github.com/beaconmesh/backend/internal/weather/domain"
	"github.com/beaconmesh/backend/internal/weather/infrastructure"
	"github.com/beaconmesh/backend/internal/weather/interfaces"
)

func main() {
	log.Println("Starting BeaconMesh API Gateway...")

	// 0. Initialize PostgreSQL/PostGIS database
	postgresURL := os.Getenv("POSTGRES_URL")
	if postgresURL == "" {
		postgresURL = "postgres://postgres:postgres@localhost:5432/beaconmesh?sslmode=disable"
	}
	dbPool, dbErr := database.InitDB(postgresURL)
	if dbErr != nil {
		log.Printf("database: initialization warning (proceeding without DB): %v", dbErr)
	} else {
		defer dbPool.Close()
	}

	// ── 1. Event Bus ──────────────────────────────────────────────────────────
	eventBus := event.NewEventBus()

	eventBus.Subscribe("weather.updated", func(data interface{}) {
		report, ok := data.(*domain.WeatherReport)
		if !ok {
			return
		}
		log.Printf("[EventBus] Weather update — Temp: %.1f°C, Waves: %.1fm, Advisory: %s",
			report.Weather.Temperature,
			report.Marine.WaveHeight,
			report.Advisory.Severity,
		)
	})

	// ── 2. Weather Service ────────────────────────────────────────────────────
	realProvider := infrastructure.NewOpenMeteoProvider()

	var weatherSvc *weatherApp.WeatherService

	cacheWrapper := infrastructure.NewWeatherCache(realProvider, 10*time.Minute, func(r *domain.WeatherReport) {
		if weatherSvc != nil {
			r.Advisory = weatherSvc.GenerateAdvisory(r.Weather, r.Marine)
			eventBus.Publish("weather.updated", r)
		}
	})

	weatherSvc = weatherApp.NewWeatherService(cacheWrapper, eventBus)
	weatherHandler := interfaces.NewWeatherHandler(weatherSvc)

	// ── 3. AIS Subsystem ──────────────────────────────────────────────────────
	aisConfig := aisInfra.ConfigFromEnv()
	if err := aisConfig.Validate(); err != nil {
		log.Fatalf("ais: invalid configuration: %v", err)
	}

	primaryProvider, err := aisInfra.NewProvider(aisConfig)
	if err != nil {
		log.Fatalf("ais: failed to create primary provider: %v", err)
	}
	log.Printf("ais: primary provider = %q", primaryProvider.Name())

	var fallbackProvider aisDomain.Provider
	if aisConfig.FallbackToMock && aisConfig.Provider != aisInfra.ProviderMock {
		fallbackProvider = aisInfra.NewMockProvider()
		log.Printf("ais: fallback provider = %q", fallbackProvider.Name())
	}

	aisSvc := aisApp.NewService(
		primaryProvider,
		fallbackProvider,
		aisApp.Config{
			CacheTTL:        aisConfig.CacheTTL,
			RefreshInterval: aisConfig.CacheTTL,
			FallbackToMock:  aisConfig.FallbackToMock,
		},
	)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	aisSvc.StartBackgroundRefresh(ctx)

	// ── 4. Processing Engine + Alert Store ────────────────────────────────────
	alertStore := processing.NewAlertStore()
	processingEngine := processing.NewEngine(alertStore)
	processingHandler := processing.NewHandler(processingEngine, alertStore)

	// ── 5. Gateway Components (Person 2) ─────────────────────────────────────
	//
	// Latency tracker: 10,000-sample ring buffer for p50/p99/max quantiles.
	latencyTracker := gateway.NewLatencyTracker(10000)

	// Config store: in-memory runtime operator configuration.
	configStore := gateway.NewConfigStore()
	configHandler := gateway.NewConfigHandler(configStore)

	// Metrics handler: wraps processing engine + latency tracker.
	metricsHandler := gateway.NewMetricsHandler(processingEngine, latencyTracker)

	// Stress-test handler: proxies Administrator-only toggle to the engine.
	stressHandler := gateway.NewStressHandler(processingEngine)

	// WebSocket hub: broadcasts vessel+alert snapshots to all connected clients.
	var wsHub *gateway.Hub
	wsHub = gateway.NewHub(func() interface{} {
		return map[string]interface{}{
			"type":    "telemetry",
			"ts":      time.Now().UTC().Format(time.RFC3339),
			"vessels": processingEngine.GetVesselStates(),
			"alerts":  alertStore.GetActiveAlerts(),
			"clients": wsHub_clientCount(wsHub),
		}
	})
	wsHub.StartBroadcastLoop(2 * time.Second)

	aisHandler := aisHttp.NewAISHandler(aisSvc)

	solverURL := os.Getenv("SOLVER_URL")
	if solverURL == "" {
		solverURL = "http://localhost:8000/api/v1/optimize/rescue"
	}
	rescueHandler := interfaces.NewRescueHandler(solverURL)

	// ── 6. Background integration: AIS → Engine ───────────────────────────────
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				vessels, err := aisSvc.GetVessels(ctx)
				if err == nil {
					var waveHeight, windSpeed, visibility float64 = 1.0, 10.0, 10000.0
					if report, err := weatherSvc.GetWeatherReport(ctx, 12.9141, 74.8560); err == nil {
						waveHeight = report.Marine.WaveHeight
						windSpeed = report.Weather.WindSpeed
						visibility = report.Weather.Visibility
					}
					for _, v := range vessels {
						start := time.Now()
						processingEngine.ProcessUpdate(v.ID, v.Name, v.Type, v.Latitude, v.Longitude, v.Speed, waveHeight, windSpeed, visibility)
						latencyTracker.Record(time.Since(start))
					}
				}
			}
		}
	}()

	// ── 7. HTTP Multiplexer ───────────────────────────────────────────────────
	mux := http.NewServeMux()

	// ── Public routes (no auth) ────────────────────────────────────────────
	// Health check
	mux.HandleFunc("GET /api/v1/health", aisHandler.GetHealth)

	// Auth login → returns JWT
	mux.HandleFunc("POST /api/v1/auth/login", gateway.LoginHandler)

	// WebSocket feed (no auth for hackathon demo, auth can be added via query param later)
	mux.HandleFunc("GET /api/v1/ws", wsHub.ServeWS)

	// Historical Database Analytics & Replay streams
	mux.HandleFunc("GET /api/v1/analytics", database.GetAnalyticsSummary)
	mux.HandleFunc("GET /api/v1/replay/ws", database.HandleReplayWebSocket)

	// ── Analyst+ routes (JWT required, Analyst role or above) ─────────────
	mux.Handle("GET /api/v1/weather",
		gateway.HandlerFunc(weatherHandler.GetWeather, gateway.JWTAuth, gateway.RequireRole("Analyst")))

	mux.Handle("GET /api/v1/ais",
		gateway.HandlerFunc(aisHandler.GetAISVessels, gateway.JWTAuth, gateway.RequireRole("Analyst")))

	// Metrics API — Task 6
	mux.Handle("GET /api/v1/metrics",
		gateway.HandlerFunc(metricsHandler.GetMetrics, gateway.JWTAuth, gateway.RequireRole("Analyst")))

	// ── Operator+ routes ───────────────────────────────────────────────────
	mux.Handle("GET /api/v1/alerts",
		gateway.HandlerFunc(processingHandler.GetAlerts, gateway.JWTAuth, gateway.RequireRole("Operator")))

	mux.Handle("POST /api/v1/alerts/acknowledge",
		gateway.HandlerFunc(processingHandler.AcknowledgeAlert, gateway.JWTAuth, gateway.RequireRole("Operator")))

	mux.Handle("GET /api/v1/zones",
		gateway.HandlerFunc(processingHandler.GetZones, gateway.JWTAuth, gateway.RequireRole("Operator")))

	mux.Handle("POST /api/v1/telemetry",
		gateway.HandlerFunc(processingHandler.IngestTelemetry, gateway.JWTAuth, gateway.RequireRole("Operator")))

	// Config endpoints — Task 5
	mux.Handle("GET /api/v1/config",
		gateway.HandlerFunc(configHandler.GetConfig, gateway.JWTAuth, gateway.RequireRole("Operator")))

	// ── Administrator-only routes ──────────────────────────────────────────
	// Config update — Task 5
	mux.Handle("PUT /api/v1/config/{key}",
		gateway.HandlerFunc(configHandler.UpdateConfig, gateway.JWTAuth, gateway.RequireRole("Administrator")))

	// Stress-test toggle — Task 7
	mux.Handle("POST /api/v1/admin/stress-test",
		gateway.HandlerFunc(stressHandler.ToggleStressTest, gateway.JWTAuth, gateway.RequireRole("Administrator")))

	// Legacy benchmark endpoint (kept for backward compatibility, Administrator-gated)
	mux.Handle("GET /api/v1/processing/metrics",
		gateway.HandlerFunc(processingHandler.GetMetrics, gateway.JWTAuth, gateway.RequireRole("Analyst")))

	mux.Handle("POST /api/v1/processing/benchmark",
		gateway.HandlerFunc(processingHandler.ToggleBenchmark, gateway.JWTAuth, gateway.RequireRole("Administrator")))

	// Emergency + rescue (Operator+)
	mux.Handle("POST /api/v1/emergency",
		gateway.HandlerFunc(emergency.TriggerEmergency, gateway.JWTAuth, gateway.RequireRole("Operator")))

	mux.Handle("GET /api/v1/emergency/pending",
		gateway.HandlerFunc(emergency.GetPendingEmergencies, gateway.JWTAuth, gateway.RequireRole("Operator")))

	mux.Handle("POST /api/v1/optimize/rescue",
		gateway.HandlerFunc(rescueHandler.OptimizeRescue, gateway.JWTAuth, gateway.RequireRole("Operator")))

		// ── 8. Middleware stack: RateLimit → CORS → Recovery → Mux ────────────────
	recoveryMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[PANIC] recovered in HTTP handler: %v", rec)
				http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
			}
		}()
		mux.ServeHTTP(w, r)
	})

	corsMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "X-Gateway, X-Request-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		recoveryMux.ServeHTTP(w, r)
	})

	// Rate limiter is the outermost middleware — applied before CORS
	rateLimitedMux := gateway.RateLimit(corsMux)

	// ── 9. Start Server ───────────────────────────────────────────────────────
	server := &http.Server{
		Addr:         ":8080",
		Handler:      rateLimitedMux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[BeaconMesh] API Gateway listening on :8080")
		log.Printf("[BeaconMesh] JWT Auth + RBAC active | Rate limit: 200 req/min/IP")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	// ── 10. Graceful Shutdown ─────────────────────────────────────────────────
	<-ctx.Done()
	stop()
	log.Println("[BeaconMesh] Shutdown signal received...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("graceful shutdown failed: %v", err)
	}
	log.Println("[BeaconMesh] Server exited cleanly.")
}

// wsHub_clientCount is a helper to safely pass the hub reference into the closure
// before the variable is fully assigned.
func wsHub_clientCount(h *gateway.Hub) int {
	if h == nil {
		return 0
	}
	return h.ClientCount()
}
