package processing

import (
	"math"
)

// Coordinate represents a geographic point with Latitude and Longitude.
type Coordinate struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Zone defines a geofenced area of a specific type.
type Zone struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Type        string       `json:"type"` // e.g., "fishing-ban", "military-restricted", "port-channel"
	Boundary    []Coordinate `json:"boundary"`
	Description string       `json:"description"`
}

// PointInPolygon checks if a point is inside a polygon using the ray-casting algorithm.
// ponytail: ray-casting is clean, O(n) where n is vertices count, and avoids heavy GIS dependencies.
func PointInPolygon(point Coordinate, polygon []Coordinate) bool {
	if len(polygon) < 3 {
		return false
	}
	inside := false
	j := len(polygon) - 1
	for i := 0; i < len(polygon); i++ {
		if (polygon[i].Longitude > point.Longitude) != (polygon[j].Longitude > point.Longitude) &&
			point.Latitude < (polygon[j].Latitude-polygon[i].Latitude)*(point.Longitude-polygon[i].Longitude)/(polygon[j].Longitude-polygon[i].Longitude)+polygon[i].Latitude {
			inside = !inside
		}
		j = i
	}
	return inside
}

// DistanceKM calculates the great-circle distance between two coordinates in kilometers using the Haversine formula.
func DistanceKM(c1, c2 Coordinate) float64 {
	const R = 6371.0 // Earth radius in km
	dLat := (c2.Latitude - c1.Latitude) * math.Pi / 180.0
	dLon := (c2.Longitude - c1.Longitude) * math.Pi / 180.0
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(c1.Latitude*math.Pi/180.0)*math.Cos(c2.Latitude*math.Pi/180.0)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// GetPredefinedZones returns the list of default geofence zones in the Mangalore operations region.
func GetPredefinedZones() []Zone {
	return []Zone{
		{
			ID:          "ZONE-MPA-01",
			Name:        "Netrani Marine Protected Area",
			Type:        "fishing-ban",
			Description: "Strict ecological reserve. Commercial fishing is prohibited.",
			Boundary: []Coordinate{
				{Latitude: 12.45, Longitude: 73.50},
				{Latitude: 12.45, Longitude: 73.85},
				{Latitude: 12.75, Longitude: 73.85},
				{Latitude: 12.75, Longitude: 73.50},
			},
		},
		{
			ID:          "ZONE-MIL-02",
			Name:        "Naval Command Restricted Sector",
			Type:        "military-restricted",
			Description: "Defense operations zone. Unauthorised entry and loitering strictly prohibited.",
			Boundary: []Coordinate{
				{Latitude: 13.15, Longitude: 73.55},
				{Latitude: 13.15, Longitude: 73.95},
				{Latitude: 13.55, Longitude: 73.95},
				{Latitude: 13.55, Longitude: 73.55},
			},
		},
		{
			ID:          "ZONE-PORT-03",
			Name:        "New Mangalore Port Approach Channel",
			Type:        "port-channel",
			Description: "Main port shipping channel. Speed limit enforced: 10.0 knots.",
			Boundary: []Coordinate{
				{Latitude: 12.85, Longitude: 74.65},
				{Latitude: 12.85, Longitude: 74.90},
				{Latitude: 13.05, Longitude: 74.90},
				{Latitude: 13.05, Longitude: 74.65},
			},
		},
	}
}
