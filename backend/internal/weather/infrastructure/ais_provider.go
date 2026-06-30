package infrastructure

import (
	"context"
	"math"
	"math/rand"
	"sync"
	"time"
)

type AISVessel struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Type        string  `json:"type"` // Cargo, Tanker, Passenger, Tug
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Speed       float64 `json:"speed"` // knots
	Heading     float64 `json:"heading"` // degrees
	People      int     `json:"peopleOnboard"`
	Cargo       string  `json:"cargo"`
	Destination string  `json:"destination"`
	IsLiveAIS   bool    `json:"isLiveAIS"`
}

type AISProvider interface {
	FetchVessels(ctx context.Context) ([]AISVessel, error)
}

type MockAISProvider struct {
	mu      sync.Mutex
	vessels []AISVessel
	lastUpd time.Time
}

func NewMockAISProvider() *MockAISProvider {
	p := &MockAISProvider{
		vessels: []AISVessel{
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
			},
		},
		lastUpd: time.Now(),
	}
	return p
}

func (m *MockAISProvider) FetchVessels(ctx context.Context) ([]AISVessel, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(m.lastUpd).Seconds()
	m.lastUpd = now

	// Update coordinates based on speed and heading to make them feel "live"
	for i := range m.vessels {
		v := &m.vessels[i]
		// Calculate movement: speed in knots to degrees/sec
		// 1 knot = 1.852 km/h = 0.514 m/s
		// 1 degree of lat = 111,000 meters
		speedMps := v.Speed * 0.514444
		distMoved := speedMps * elapsed

		headingRad := v.Heading * math.Pi / 180.0
		dy := distMoved * math.Cos(headingRad)
		dx := distMoved * math.Sin(headingRad)

		latChange := dy / 111000.0
		lonChange := dx / (111000.0 * math.Cos(v.Latitude*math.Pi/180.0))

		v.Latitude += latChange
		v.Longitude += lonChange

		// Keep heading with small random wander
		v.Heading = math.Mod(v.Heading+float64(rand.Intn(11)-5)+360.0, 360.0)

		// Boundaries to keep them within the Mangalore map sector (around lat 12.5-13.5, lon 73.5-74.8)
		if v.Latitude < 12.4 || v.Latitude > 13.6 || v.Longitude < 73.4 || v.Longitude > 74.9 {
			// Reverse heading
			v.Heading = math.Mod(v.Heading+180.0, 360.0)
		}
	}

	// Copy and return
	result := make([]AISVessel, len(m.vessels))
	copy(result, m.vessels)
	return result, nil
}
