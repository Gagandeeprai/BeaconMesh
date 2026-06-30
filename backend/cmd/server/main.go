package main

import (
	"log"
	"net/http"
	"time"

	"github.com/beaconmesh/backend/internal/shared/event"
	"github.com/beaconmesh/backend/internal/weather/application"
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
	var weatherSvc *application.WeatherService

	// 4. Initialize SWR Cache wrapper with 10-minute expiry and callback wiring
	cacheWrapper := infrastructure.NewWeatherCache(realProvider, 10*time.Minute, func(r *domain.WeatherReport) {
		if weatherSvc != nil {
			// Enrich and publish background revalidation updates
			r.Advisory = weatherSvc.GenerateAdvisory(r.Weather, r.Marine)
			eventBus.Publish("weather.updated", r)
		}
	})

	// 5. Initialize Application Use-Case Service
	weatherSvc = application.NewWeatherService(cacheWrapper, eventBus)

	// 6. Initialize HTTP interface controllers
	weatherHandler := interfaces.NewWeatherHandler(weatherSvc)

	// Initialize AIS Telemetry and Rescue Routing controllers
	aisProvider := infrastructure.NewMockAISProvider()
	aisHandler := interfaces.NewAISHandler(aisProvider)
	rescueHandler := interfaces.NewRescueHandler("http://localhost:8000/api/v1/optimize/rescue")

	// 7. Setup Go 1.22 enhanced HTTP multiplexer router
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/weather", weatherHandler.GetWeather)
	mux.HandleFunc("GET /api/v1/ais", aisHandler.GetAISVessels)
	mux.HandleFunc("POST /api/v1/optimize/rescue", rescueHandler.OptimizeRescue)

	// CORS wrapper middleware
	corsMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		mux.ServeHTTP(w, r)
	})

	server := &http.Server{
		Addr:         ":8080",
		Handler:      corsMux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Server listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed to listen: %v", err)
	}
}
