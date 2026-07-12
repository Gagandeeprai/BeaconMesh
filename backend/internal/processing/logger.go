package processing

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
)

var telemetryChan chan VesselState

// InitLogger starts the async JSONL logger.
func InitLogger() {
	telemetryChan = make(chan VesselState, 1000)

	logDir := "logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile := filepath.Join(logDir, "ships.jsonl")
	file, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatalf("failed to open log file: %v", err)
	}

	go func() {
		defer file.Close()
		encoder := json.NewEncoder(file)
		for state := range telemetryChan {
			if err := encoder.Encode(state); err != nil {
				log.Printf("[Logger] error writing JSONL: %v", err)
			}
		}
	}()
}

// LogTelemetry enqueues a vessel state to be written to the JSONL log file.
// If the channel is full, it drops the message to prevent blocking the engine.
func LogTelemetry(state VesselState) {
	if telemetryChan == nil {
		return // not initialized
	}
	select {
	case telemetryChan <- state:
	default:
		// channel full, drop to avoid blocking processing
	}
}
