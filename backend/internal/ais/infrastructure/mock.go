package infrastructure

import (
	"context"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/beaconmesh/backend/internal/ais/domain"
)

type MockProvider struct {
	mu      sync.Mutex
	vessels []domain.Vessel
	lastUpd time.Time
}

func NewMockProvider() *MockProvider {
	now := time.Now()
	return &MockProvider{
		vessels: []domain.Vessel{
			{
				ID:          "AIS-CARGO-9102",
				Name:        "Symphony of the Seas",
				Type:        "Passenger",
				Latitude:    12.95,
				Longitude:   74.20,
				Speed:       18.5,
				Heading:     120,
				People:      240,
				Cargo:       "None (Cruise Ship)",
				Destination: "Mangalore Port",
				IsLiveAIS:   true,
				Source:      "mock",
			},
			{
				ID:          "AIS-TANK-5612",
				Name:        "Pacific Crest",
				Type:        "Tanker",
				Latitude:    12.80,
				Longitude:   74.15,
				Speed:       14.0,
				Heading:     340,
				People:      25,
				Cargo:       "LNG (32,000 Tons)",
				Destination: "Dahej Port",
				IsLiveAIS:   true,
				Source:      "mock",
			},
			{
				ID:          "AIS-TUG-1002",
				Name:        "Ocean Titan",
				Type:        "Tug",
				Latitude:    12.92,
				Longitude:   74.80,
				Speed:       9.0,
				Heading:     270,
				People:      8,
				Cargo:       "Rescue & Towing Equipment",
				Destination: "Mangalore Anchorage",
				IsLiveAIS:   true,
				Source:      "mock",
			},
			{
				ID:          "AIS-CARGO-4411",
				Name:        "Cosco Fortune",
				Type:        "Cargo",
				Latitude:    13.10,
				Longitude:   74.30,
				Speed:       16.2,
				Heading:     180,
				People:      19,
				Cargo:       "General Merchandise",
				Destination: "Colombo Port",
				IsLiveAIS:   true,
				Source:      "mock",
			},
		},
		lastUpd: now,
	}
}

func (m *MockProvider) Name() string {
	return "mock"
}

func (m *MockProvider) FetchVessels(ctx context.Context) ([]domain.Vessel, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	elapsed := time.Since(m.lastUpd).Seconds()
	m.lastUpd = time.Now()

	for i := range m.vessels {
		v := &m.vessels[i]

		speedMps := v.Speed * 0.514444
		distMoved := speedMps * elapsed

		headingRad := v.Heading * math.Pi / 180.0
		dy := distMoved * math.Cos(headingRad)
		dx := distMoved * math.Sin(headingRad)

		latChange := dy / 111000.0
		lonChange := dx / (111000.0 * math.Cos(v.Latitude*math.Pi/180.0))

		v.Latitude += latChange
		v.Longitude += lonChange

		v.Heading = math.Mod(v.Heading+float64(rand.Intn(11)-5)+360.0, 360.0)

		if v.Latitude < 12.4 || v.Latitude > 13.6 || v.Longitude < 73.4 || v.Longitude > 74.9 {
			v.Heading = math.Mod(v.Heading+180.0, 360.0)
		}
	}

	result := make([]domain.Vessel, len(m.vessels))
	copy(result, m.vessels)
	return result, nil
}
