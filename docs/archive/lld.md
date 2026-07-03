> **⚠️ ARCHIVED — Historical Document**
>
> This document is retained for historical reference only. It describes the **original conceptual design** of BeaconMesh and does **not reflect the current implementation**.
>
> For the current architecture, see **[docs/architecture/architecture-overview.md](../architecture/architecture-overview.md)** — the canonical source of truth.
>
> *Archived: July 2026*

---

# Low-Level Design (LLD)

## 1. Go Backend Package Layout (Clean Architecture & DDD Lite)
The Go backend is structured to isolate domain logic from external dependencies (frameworks, database, and simulation wrappers).

```
/backend
  /cmd
    /server         # Main HTTP/WebSocket entry point
  /internal
    /domain         # Enterprise business rules (Entities, Value Objects, Aggregates)
      /vessel       # Vessel entity and invariants
      /telemetry    # Telemetry data structures
      /emergency    # Emergency / Distress alert concepts
    /application    # Application services / Use Cases
      /telemetry    # Tracking and history use cases
      /emergency    # Alerting and routing dispatch coordination
      /simulation   # Orchestration of the simulation process
    /infrastructure # Database, Network client, Optimization wrapper implementations
      /database     # PostGIS Repository implementations
      /solver       # Client calling Python OR-Tools solver
      /simclient    # Client communicating with Python simulation engine
    /interfaces     # HTTP endpoints, WebSocket handlers, and JSON serialization
      /http
      /websocket
```

## 2. Core Go Interfaces

### Telemetry Repository
```go
package domain

import "context"

type Telemetry struct {
	VesselID  string    `json:"vessel_id"`
	Timestamp int64     `json:"timestamp"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Heading   float64   `json:"heading"`
	Speed     float64   `json:"speed"`
	BatteryLevel float64 `json:"battery_level"`
}

type TelemetryRepository interface {
	Save(ctx context.Context, telemetry *Telemetry) error
	GetLatestForVessel(ctx context.Context, vesselID string) (*Telemetry, error)
	GetHistory(ctx context.Context, vesselID string, startTime, endTime int64) ([]*Telemetry, error)
}
```

### Emergency Repository & Service
```go
package domain

type EmergencyStatus string

const (
	StatusActive    EmergencyStatus = "ACTIVE"
	StatusResolving EmergencyStatus = "RESOLVING"
	StatusResolved  EmergencyStatus = "RESOLVED"
)

type Emergency struct {
	ID          string          `json:"id"`
	VesselID    string          `json:"vessel_id"`
	Timestamp   int64           `json:"timestamp"`
	Latitude    float64         `json:"latitude"`
	Longitude   float64         `json:"longitude"`
	Status      EmergencyStatus `json:"status"`
	Severity    int             `json:"severity"` // 1 (Minor) to 5 (Critical)
	Description string          `json:"description"`
}

type EmergencyRepository interface {
	Create(ctx context.Context, emergency *Emergency) error
	UpdateStatus(ctx context.Context, id string, status EmergencyStatus) error
	GetActive(ctx context.Context) ([]*Emergency, error)
}
```

### Optimization Engine Client Interface
```go
package infrastructure

import "context"

type OptimizationRequest struct {
	Emergencies    []EmergencyInput   `json:"emergencies"`
	RescueVessels  []RescueVesselInput `json:"rescue_vessels"`
}

type EmergencyInput struct {
	ID        string  `json:"id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Severity  int     `json:"severity"`
}

type RescueVesselInput struct {
	ID        string  `json:"id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Speed     float64 `json:"speed"` // in knots
	Capacity  int     `json:"capacity"`
}

type OptimizationResponse struct {
	Routes map[string][]string `json:"routes"` // RescueVesselID -> ordered list of EmergencyIDs
}

type RescueOptimizer interface {
	Solve(ctx context.Context, req *OptimizationRequest) (*OptimizationResponse, error)
}
```

## 3. Python Simulation Architecture
The simulator models the physical coordinates and message-routing properties using an event loop.

### Core Simulation Classes

```python
class Packet:
    def __init__(self, message_id: str, sender_id: str, payload: dict, is_emergency: bool = False):
        self.message_id = message_id
        self.sender_id = sender_id
        self.payload = payload
        self.is_emergency = is_emergency
        self.hops = 0
        self.visited = set()

class SimulationVessel:
    def __init__(self, vessel_id: str, x: float, y: float, range_km: float = 15.0):
        self.vessel_id = vessel_id
        self.x = x
        self.y = y
        self.range_km = range_km
        self.buffer = [] # Store-carry-forward queue of Packet objects
        self.is_gateway = False

    def step(self, new_x: float, new_y: float):
        self.x = new_x
        self.y = new_y

    def broadcast(self, peers: list):
        # Broadcasts any packets in buffer to peers within range_km
        pass
```

### Google OR-Tools Integration
The routing solver uses OR-Tools' **RoutingModel** library to solve a Vehicle Routing Problem with Time Windows (VRPTW).

* **Distance Matrix Calculation**: Uses spherical Haversine formula to compute distance (and travel time) between all coordinates (rescue bases and emergency locations).
* **Objective Function**: Minimize a cost function composed of:
  * Sum of transit time for all rescue paths.
  * Penalty for late arrival or missed visits to emergencies.
  * Severity weights (prioritizing critical medical or sinking emergencies to be visited first).
* **Constraints**:
  * Capacity limit per rescue vessel.
  * Working hours / fuel window constraints for each boat.
  * Start and end locations mapped back to respective rescue stations.
