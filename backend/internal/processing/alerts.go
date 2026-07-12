package processing

import (
	"sync"
)

// Alert represents an active rule violation or distress event.
// Mapped to match the frontend expectations.
type Alert struct {
	ID            string  `json:"id"`
	VesselID      string  `json:"vesselId"`
	VesselName    string  `json:"vesselName"`
	Type          string  `json:"type"` // e.g. "Illegal Fishing", "Speed Limit Violation", "Restricted Area Intrusion", "Loitering In Restricted Zone", "AIS Silence"
	Time          string  `json:"time"`
	Location      string  `json:"location"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	Status        string  `json:"status"` // "In Progress", "Acknowledged", "Resolved"
	Severity      string  `json:"severity"` // "High", "Medium", "Low"
	PeopleOnboard int     `json:"peopleOnboard"`
	Responder     string  `json:"responder,omitempty"`
	ETAMin        int     `json:"etaMin,omitempty"`
	Description   string  `json:"description"`
}

// AlertStore manages all alerts thread-safely in-memory.
type AlertStore struct {
	mu     sync.RWMutex
	alerts map[string]*Alert
}

func NewAlertStore() *AlertStore {
	return &AlertStore{
		alerts: make(map[string]*Alert),
	}
}

// AddOrUpdateAlert puts an alert in the store, keeping status if it already exists.
func (s *AlertStore) AddOrUpdateAlert(a Alert) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If alert already exists, do not overwrite status if it's been acknowledged/resolved
	if existing, exists := s.alerts[a.ID]; exists {
		if existing.Status != "In Progress" {
			return
		}
		// Update details but keep custom responder/eta/status
		a.Status = existing.Status
		a.Responder = existing.Responder
		a.ETAMin = existing.ETAMin
	}
	s.alerts[a.ID] = &a
}

// AcknowledgeAlert sets alert status to Acknowledged.
func (s *AlertStore) AcknowledgeAlert(id string, responder string, etaMin int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if a, exists := s.alerts[id]; exists {
		a.Status = "Acknowledged"
		a.Responder = responder
		a.ETAMin = etaMin
		return true
	}
	return false
}

// ResolveAlert sets alert status to Resolved.
func (s *AlertStore) ResolveAlert(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if a, exists := s.alerts[id]; exists {
		a.Status = "Resolved"
		return true
	}
	return false
}

// GetActiveAlerts returns a slice of all active (unresolved) alerts.
func (s *AlertStore) GetActiveAlerts() []Alert {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := []Alert{}
	for _, a := range s.alerts {
		if a.Status != "Resolved" {
			result = append(result, *a)
		}
	}
	return result
}

// GetActiveAlertsForVessel returns active alerts for a specific vessel.
func (s *AlertStore) GetActiveAlertsForVessel(vesselID string) []Alert {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := []Alert{}
	for _, a := range s.alerts {
		if a.Status != "Resolved" && a.VesselID == vesselID {
			result = append(result, *a)
		}
	}
	return result
}

// GetAllAlerts returns all alerts, resolved or not.
func (s *AlertStore) GetAllAlerts() []Alert {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]Alert, 0, len(s.alerts))
	for _, a := range s.alerts {
		result = append(result, *a)
	}
	return result
}

// Reset clears all active and resolved alerts from the store.
func (s *AlertStore) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.alerts = make(map[string]*Alert)
}
