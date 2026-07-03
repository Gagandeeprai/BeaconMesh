package infrastructure

import (
	"fmt"

	"github.com/beaconmesh/backend/internal/ais/domain"
)

// NewProvider creates the active AIS data provider based on cfg.Provider.
// No provider-specific logic leaks beyond this function.
func NewProvider(cfg Config) (domain.Provider, error) {
	switch cfg.Provider {
	case ProviderMock:
		return NewMockProvider(), nil
	case ProviderAISHub:
		if cfg.AISHubAPIKey == "" {
			return nil, fmt.Errorf("provider aishub: AISHUB_API_KEY is required")
		}
		if cfg.AISHubURL == "" {
			cfg.AISHubURL = "http://data.aishub.net/ws.php"
		}
		return NewAISHubProvider(cfg), nil
	default:
		return nil, fmt.Errorf("unknown AIS provider type: %q", cfg.Provider)
	}
}
