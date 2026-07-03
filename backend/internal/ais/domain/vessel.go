package domain

import (
	"context"
	"time"
)

// Vessel is the canonical domain model for a ship transponder (AIS) target.
// All providers MUST return this type.  No provider-specific fields leak
// beyond the provider layer.
//
// JSON tags are locked to the existing public API so the frontend sees
// exactly the same response as before.
type Vessel struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Speed       float64   `json:"speed"`
	Heading     float64   `json:"heading"`
	People      int       `json:"peopleOnboard"`
	Cargo       string    `json:"cargo"`
	Destination string    `json:"destination"`
	IsLiveAIS   bool      `json:"isLiveAIS"`

	MMSI        string    `json:"mmsi,omitempty"`
	IMO         string    `json:"imo,omitempty"`
	ETA         string    `json:"eta,omitempty"`
	Source      string    `json:"source,omitempty"`
	PhotoURL    string    `json:"photoUrl,omitempty"`
	LastUpdated time.Time `json:"lastUpdated,omitempty"`
}

// Provider is the interface every AIS data source must implement.
type Provider interface {
	FetchVessels(ctx context.Context) ([]Vessel, error)
	Name() string
}
