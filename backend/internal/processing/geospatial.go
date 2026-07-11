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
		{
			ID:          "ZONE-EEZ-IND",
			Name:        "Indian Exclusive Economic Zone (EEZ)",
			Type:        "eez-india",
			Description: "India sovereign maritime jurisdiction (200 nautical miles).",
			Boundary: []Coordinate{
				{Latitude: 22.47, Longitude: 69.07}, // Okha (Gujarat)
				{Latitude: 22.0, Longitude: 68.0},   // North-West Arabian Sea (EEZ line)
				{Latitude: 18.9, Longitude: 68.5},   // West of Mumbai
				{Latitude: 12.0, Longitude: 70.5},   // West of Lakshadweep
				{Latitude: 7.0, Longitude: 71.5},    // South of Lakshadweep
				{Latitude: 6.5, Longitude: 77.0},    // South of Kanyakumari
				{Latitude: 8.08, Longitude: 77.54},  // Kanyakumari Shoreline
				{Latitude: 9.98, Longitude: 76.22},  // Cochin Shoreline
				{Latitude: 11.25, Longitude: 75.77}, // Calicut Shoreline
				{Latitude: 12.91, Longitude: 74.85}, // Mangalore Shoreline
				{Latitude: 14.80, Longitude: 74.13}, // Karwar Shoreline
				{Latitude: 15.49, Longitude: 73.81}, // Goa Shoreline
				{Latitude: 18.96, Longitude: 72.82}, // Mumbai Shoreline
				{Latitude: 21.64, Longitude: 69.60}, // Porbandar Shoreline
			},
		},
		{
			ID:          "ZONE-EEZ-LKA",
			Name:        "Sri Lanka Exclusive Economic Zone (EEZ)",
			Type:        "eez-srilanka",
			Description: "Sri Lankan maritime jurisdiction.",
			Boundary: []Coordinate{
				{Latitude: 10.0, Longitude: 79.5}, // North
				{Latitude: 8.5, Longitude: 82.5},  // East
				{Latitude: 5.5, Longitude: 82.0},  // South-East
				{Latitude: 4.5, Longitude: 80.5},  // South
				{Latitude: 6.0, Longitude: 78.5},  // South-West
				{Latitude: 8.0, Longitude: 78.8},  // West
			},
		},
		{
			ID:          "ZONE-EEZ-MDV",
			Name:        "Maldives Exclusive Economic Zone (EEZ)",
			Type:        "eez-maldives",
			Description: "Maldivian sovereign maritime jurisdiction.",
			Boundary: []Coordinate{
				{Latitude: 8.0, Longitude: 71.0},  // North-West
				{Latitude: 8.0, Longitude: 74.5},  // North-East
				{Latitude: 2.0, Longitude: 75.0},  // Central-East
				{Latitude: -1.0, Longitude: 74.5}, // South-East
				{Latitude: -1.0, Longitude: 71.0}, // South-West
				{Latitude: 2.0, Longitude: 70.5},  // Central-West
			},
		},
	}
}
