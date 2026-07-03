package infrastructure

import (
	"errors"
	"fmt"
	"os"
	"time"
)

type ProviderType string

const (
	ProviderMock   ProviderType = "mock"
	ProviderAISHub ProviderType = "aishub"
)

type Config struct {
	Provider ProviderType

	AISHubAPIKey string
	AISHubURL    string

	CacheTTL        time.Duration
	RequestTimeout  time.Duration
	FallbackToMock  bool
}

func DefaultConfig() Config {
	return Config{
		Provider:        ProviderMock,
		CacheTTL:        30 * time.Second,
		RequestTimeout:  30 * time.Second,
		FallbackToMock:  true,
	}
}

func ConfigFromEnv() Config {
	cfg := DefaultConfig()

	if key := os.Getenv("AISHUB_API_KEY"); key != "" {
		cfg.Provider = ProviderAISHub
		cfg.AISHubAPIKey = key
	}

	if url := os.Getenv("AISHUB_URL"); url != "" {
		cfg.AISHubURL = url
	}

	return cfg
}

// Validate checks that the configuration is self-consistent.
// Returns an error if the configuration cannot produce a working provider.
func (cfg Config) Validate() error {
	switch cfg.Provider {
	case ProviderAISHub:
		if cfg.AISHubAPIKey == "" {
			return errors.New("AISHUB_API_KEY must be set when provider is 'aishub'")
		}
	case ProviderMock:
		// Mock provider requires no configuration.
	default:
		return fmt.Errorf("unknown AIS provider type: %q", cfg.Provider)
	}
	return nil
}
