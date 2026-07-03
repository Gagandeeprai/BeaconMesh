package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	aisApp "github.com/beaconmesh/backend/internal/ais/application"
	aisDomain "github.com/beaconmesh/backend/internal/ais/domain"
	aisInfra "github.com/beaconmesh/backend/internal/ais/infrastructure"
	aisHttp "github.com/beaconmesh/backend/internal/ais/interfaces"
	"github.com/beaconmesh/backend/internal/shared/event"
	weatherApp "github.com/beaconmesh/backend/internal/weather/application"
	"github.com/beaconmesh/backend/internal/weather/domain"
	"github.com/beaconmesh/backend/internal/weather/infrastructure"
	"github.com/beaconmesh/backend/internal/weather/interfaces"
)

func main() {
	log.Println("Starting BeaconMesh Weather Service...")

	// 1. Initialize Event Bus
	eventBus := event.NewEventBus()

	// 2. Subscribe to internal weather updates to log events (proving out the Pub-Sub integration)
	eventBus.Subscribe("weather.updated", func(data interface{}) {
		report, ok := data.(*domain.WeatherReport)
		if !ok {
			return
		}
		log.Printf("[EventBus] Broadcast: Weather updated - Temp: %.1f°C, Waves: %.1fm, Advisory severity: %s",
			report.Weather.Temperature,
			report.Marine.WaveHeight,
			report.Advisory.Severity,
		)
	})

	// 3. Initialize real HTTP API client provider
	realProvider := infrastructure.NewOpenMeteoProvider()

	// weatherSvc pointer used inside the cache callback wrapper
	var weatherSvc *weatherApp.WeatherService

	// 4. Initialize SWR Cache wrapper with 10-minute expiry and callback wiring
	cacheWrapper := infrastructure.NewWeatherCache(realProvider, 10*time.Minute, func(r *domain.WeatherReport) {
		if weatherSvc != nil {
			// Enrich and publish background revalidation updates
			r.Advisory = weatherSvc.GenerateAdvisory(r.Weather, r.Marine)
			eventBus.Publish("weather.updated", r)
		}
	})

	// 5. Initialize Application Use-Case Service
	weatherSvc = weatherApp.NewWeatherService(cacheWrapper, eventBus)

	// 6. Initialize HTTP interface controllers
	weatherHandler := interfaces.NewWeatherHandler(weatherSvc)

	// --- AIS Subsystem ---
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

	// 7. Create context that cancels on SIGINT or SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	aisSvc.StartBackgroundRefresh(ctx)

	aisHandler := aisHttp.NewAISHandler(aisSvc)

	rescueHandler := interfaces.NewRescueHandler("http://localhost:8000/api/v1/optimize/rescue")

	// 8. Setup Go 1.22 enhanced HTTP multiplexer router
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/weather", weatherHandler.GetWeather)
	mux.HandleFunc("GET /api/v1/ais", aisHandler.GetAISVessels)
	mux.HandleFunc("GET /api/v1/health", aisHandler.GetHealth)
	mux.HandleFunc("POST /api/v1/optimize/rescue", rescueHandler.OptimizeRescue)

	// Recovery middleware — catches panics in HTTP handlers
	recoveryMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[PANIC] recovered: %v", rec)
				http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
			}
		}()
		mux.ServeHTTP(w, r)
	})

	// CORS wrapper middleware
	corsMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		recoveryMux.ServeHTTP(w, r)
	})

	server := &http.Server{
		Addr:         ":8080",
		Handler:      corsMux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// 9. Start server in a goroutine
	go func() {
		log.Printf("Server listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to listen: %v", err)
		}
	}()

	// 10. Wait for interrupt signal, then gracefully shut down
	<-ctx.Done()
	stop()
	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited cleanly.")
}
