> **⚠️ ARCHIVED — Historical Document**
>
> This document is retained for historical reference only. It describes the **original conceptual design** of BeaconMesh and does **not reflect the current implementation**.
>
> For the current architecture, see **[docs/architecture/architecture-overview.md](../architecture/architecture-overview.md)** — the canonical source of truth.
>
> *Archived: July 2026*

---

# API Specification

## 1. REST Endpoints

### 1.1 Vessel Management

#### `POST /api/v1/vessels`
Registers a new vessel (fishing boat, rescue boat, or base station).
* **Request Payload**:
  ```json
  {
    "name": "Ocean Finder IV",
    "type": "FISHING",
    "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "id": "e0e84b80-f6bd-4217-bc45-ebc2b04f7a21",
    "name": "Ocean Finder IV",
    "type": "FISHING",
    "created_at": "2026-06-29T19:05:00Z"
  }
  ```

#### `GET /api/v1/vessels`
Lists all registered vessels and their current status.
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "e0e84b80-f6bd-4217-bc45-ebc2b04f7a21",
      "name": "Ocean Finder IV",
      "type": "FISHING",
      "latest_telemetry": {
        "timestamp": "2026-06-29T19:04:10Z",
        "latitude": 42.5678,
        "longitude": -70.1234,
        "heading": 120.5,
        "speed": 8.2,
        "battery_level": 94.2,
        "distress_active": false
      }
    }
  ]
  ```

---

### 1.2 Telemetry Ingestion

#### `POST /api/v1/telemetry`
Uploads raw telemetry logs. Usually invoked by gateway vessels uploading bundled files when hitting cellular connectivity or directly by simulation nodes.
* **Request Payload**:
  ```json
  {
    "vessel_id": "e0e84b80-f6bd-4217-bc45-ebc2b04f7a21",
    "timestamp": 1782759850,
    "latitude": 42.5678,
    "longitude": -70.1234,
    "heading": 120.5,
    "speed": 8.2,
    "battery_level": 94.2,
    "distress_active": false,
    "signature": "base64EncodedSignatureHex"
  }
  ```
* **Response (202 Accepted)**:
  ```json
  {
    "status": "ACCEPTED",
    "message": "Telemetry log verified and queued for processing"
  }
  ```

---

### 1.3 Emergency Alerts

#### `POST /api/v1/emergencies`
Creates or propagates an SOS distress record.
* **Request Payload**:
  ```json
  {
    "vessel_id": "e0e84b80-f6bd-4217-bc45-ebc2b04f7a21",
    "timestamp": 1782759850,
    "latitude": 42.5678,
    "longitude": -70.1234,
    "severity": 5,
    "description": "Engine failure, vessel rolling heavily.",
    "signature": "base64EncodedSignatureOfSOS"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "emergency_id": "7831d102-1234-4567-89ab-cdef01234567",
    "status": "ACTIVE"
  }
  ```

#### `GET /api/v1/emergencies/active`
Returns all active emergencies currently waiting for rescue coordination.
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "7831d102-1234-4567-89ab-cdef01234567",
      "vessel_id": "e0e84b80-f6bd-4217-bc45-ebc2b04f7a21",
      "vessel_name": "Ocean Finder IV",
      "reported_at": "2026-06-29T19:04:10Z",
      "latitude": 42.5678,
      "longitude": -70.1234,
      "severity": 5,
      "status": "ACTIVE",
      "description": "Engine failure, vessel rolling heavily."
    }
  ]
  ```

---

### 1.4 Rescue & Routing Optimization

#### `POST /api/v1/missions`
Runs the OR-Tools optimizer for active emergencies and active rescue assets.
* **Request Payload**:
  ```json
  {
    "rescue_vessel_ids": [
      "91ad85f0-62bb-4ba1-b4f7-7b243292ca43"
    ]
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "mission_id": "c1f7b889-4a92-49fa-9488-ea6df2ff39ad",
    "status": "IN_PROGRESS",
    "routes": [
      {
        "rescue_vessel_id": "91ad85f0-62bb-4ba1-b4f7-7b243292ca43",
        "route_path": [
          {"latitude": 42.5000, "longitude": -70.0000},
          {"latitude": 42.5678, "longitude": -70.1234}
        ],
        "stops": [
          {
            "order": 1,
            "emergency_id": "7831d102-1234-4567-89ab-cdef01234567",
            "vessel_name": "Ocean Finder IV"
          }
        ]
      }
    ]
  }
  ```

---

### 1.5 Simulation Control

#### `POST /api/v1/simulation/control`
Commands to initialize, start, pause, or reset the Python mesh networking simulation.
* **Request Payload**:
  ```json
  {
    "action": "START", // START | PAUSE | RESET | TICK
    "params": {
      "node_count": 25,
      "transmission_range_km": 15.0,
      "packet_drop_probability": 0.05
    }
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "status": "RUNNING",
    "node_count": 25,
    "active_emergencies": 1
  }
  ```

---

## 2. WebSocket Push Streams

### Endpoint: `WS /api/v1/ws`
Clients connect to receive live streaming map updates without polling.

#### Messages Broadcasted by Server
1. **Telemetry Feed**:
   ```json
   {
     "event": "TELEMETRY_UPDATED",
     "data": {
       "vessel_id": "e0e84b80-f6bd-4217-bc45-ebc2b04f7a21",
       "latitude": 42.5682,
       "longitude": -70.1240,
       "heading": 121.0,
       "speed": 8.0,
       "battery_level": 94.0,
       "timestamp": 1782759910
     }
   }
   ```
2. **Emergency Alert Feed**:
   ```json
   {
     "event": "EMERGENCY_TRIGGERED",
     "data": {
       "emergency_id": "7831d102-1234-4567-89ab-cdef01234567",
       "vessel_name": "Ocean Finder IV",
       "latitude": 42.5678,
       "longitude": -70.1234,
       "severity": 5,
       "description": "Engine failure, vessel rolling heavily."
     }
   }
   ```
3. **Simulation Status Update**:
   ```json
   {
     "event": "SIMULATION_TICK",
     "data": {
       "time_elapsed_seconds": 360,
       "active_packets_in_air": 14,
       "delivered_packets_count": 3
     }
   }
   ```
4. **Rescue Mission Created**:
   ```json
   {
     "event": "MISSION_OPTIMIZED",
     "data": {
       "mission_id": "c1f7b889-4a92-49fa-9488-ea6df2ff39ad",
       "vessels_dispatched": 1
     }
   }
   ```
