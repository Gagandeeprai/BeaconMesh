# BeaconMesh Platform v2 — 4-Person Simultaneous Task Board

This task board splits the development of the **BeaconMesh Maritime Surveillance Platform (v2 PRD)** into four parallelized roles. Each role has clear API boundaries, mock interfaces, and zero direct build-time dependencies on the other roles to maximize development speed.

---

## ⚠️ High-Throughput Data Path Specification & Boundaries
* **Direct Path (In-Process Saturation)**: The ≥ 50,000 msg/sec throughput floor is proven ONLY on the in-process path. The stress-test generator (Person 3, Task 5) writes directly into the engine's internal buffered jobs channel. This path is entirely in-process and avoids network serialization.
* **Network Path (Simulation & Map Display)**: The data path crossing `Simulator (Python) ──► Gateway (Go) ──► gRPC ──► Engine` exists only to feed the visual ~200-vessel tracking map rendered by the frontend. This path is subject to network serialization overhead and carries no throughput floor guarantee. If production telemetry is ever requested via the API Gateway, it must be benchmarked as a separate path under a separate test plan.

---

## 👥 Team Roles & API Boundaries

```
                 ┌───────────────────────────────────────┐
                 │        Person 1 (Frontend UI)         │
                 │  React Dashboard + MapLibre GL Map    │
                 └──────────────────┬────────────────────┘
                                    │ REST / WebSockets (Port 8080)
                                    ▼
                 ┌───────────────────────────────────────┐
                 │        Person 2 (API Gateway)         │
                 │   Auth (JWT/RBAC) + Config + Alerts   │
                 └──────┬───────────┬────────────┬───────┘
                        │           │            │
         Internal gRPC  │           │ REST       │ SQL / PostGIS
         / Channels     ▼           ▼            ▼
 ┌───────────────────────────┐ ┌───────────┐ ┌───────────────────────────┐
 │   Person 3 (Ingest/Det)   │ │ Person 4  │ │     Person 4 (DB/Sim)     │
 │ Go 50K msg/s Core Engine  │ │ Simulator │ │ Postgres+PostGIS, Replay │
 └───────────────────────────┘ └───────────┘ └───────────────────────────┘
```

---

## 👤 Person 1 — React Frontend & Tactical Map Console
**Focus:** Visualizations, user interactions, mapping layers, and control dashboard interfaces.

### Tasks
- [ ] **1. Navigation & Shell Layout**
  - Implement the dashboard routing structure (Landing Page, Live Map, Alert Center, Analytics, Vessel Details, Historical Replay, Admin Settings).
- [ ] **2. Live Map Console (MapLibre GL)**
  - Render vessel indicators with heading rotation markers.
  - Draw shaded boundary polygons for Geofences (Marine Protected Areas, Military boundaries, Shipping lanes).
  - Implement a dynamic zoom level filter (toggle clustering badge counters at low zoom levels).
- [ ] **3. Ingestion Performance Panel**
  - Implement a visual metrics dashboard displaying live throughput graphs (msg/s), p50/p99/max latency (microseconds), and a button to toggle the stress-test load generator.
- [ ] **4. Alert Command Center**
  - Implement notifications alerts log cards (MMSI, Violation Type, Location, Risk Level).
  - Add operational controls: "Acknowledge Alert" (opens dispatcher form) and "Resolve Alert" (closes alert with a log entry).
- [ ] **5. Incident Replay Screen**
  - Build playback slider interface (Play, Pause, Speed multiplier $1x/2x/4x$, timeline scrub).
- [ ] **6. Analytics Charting Grid**
  - Render statistical widgets: Risk distributions, daily violation rates by type, and mean response times.

---

## 👤 Person 2 — Go API Gateway, Auth, & Operations
**Focus:** REST & WebSocket entry points, token security, rate limiting, and system config.

### Tasks
- [ ] **1. Enhanced HTTP Mux Router**
  - Build the Go HTTP API Gateway matching the REST schema specifications.
  - Set up CORS, proxy headers, and basic rate-limiting middleware.
- [ ] **2. Authenticated Session Controller**
  - Implement JWT verification middleware.
  - Set up Role-Based Access Control (RBAC) handlers verifying permission levels (Operator, Analyst, Administrator).
- [ ] **3. WebSockets Feed Manager**
  - Implement `/api/v1/ws` connection upgrades.
  - Manage client subscription loops, pushing telemetry arrays and real-time alerts.
- [ ] **4. Active Alert Controller & Broker**
  - Expose `/api/v1/alerts` and `/api/v1/alerts/acknowledge` endpoints.
  - Forward resolved alerts to PostgreSQL.
- [ ] **5. Live Configuration Service**
  - Implement a configuration manager allowing operators to change safety variables at runtime via REST calls without restarting services.
  - **Config Contracts**: Must support a named config key `loitering_threshold_seconds` (default: `1800` seconds / 30 minutes) to override the loitering duration threshold dynamically, alongside standard speed limits and violation margins.
- [ ] **6. Performance Metrics API (`GET /api/v1/metrics`)**
  - Expose statistics on throughput (msg/s) and latency quantiles (p50, p99, max in microseconds) generated by the engine for consumption by Person 1's Ingestion Panel.
- [ ] **7. Stress-Test Toggle API (`POST /api/v1/admin/stress-test`)**
  - Expose administrative trigger endpoint accepting JSON `{"enable": true|false}` to activate/deactivate the in-process stress test simulator on Person 3's engine.

---

## 👤 Person 3 — High-Speed Ingestion, Rules & Risk Engine
**Focus:** In-memory high-throughput data processing, geospatial calculations, and rules evaluation.

### Tasks
- [ ] **1. Concurrent Goroutine Worker Pool**
  - Implement a buffered Go channel (`capacity = 100,000`) feeding into 8 concurrent processing worker routines.
  - **State Guarding**: Access to `vesselStates` in-memory map must be strictly guarded by `sync.RWMutex`, matching the reference implementation in Appendix A.
  - **Guardrail Rule**: Do not swap this concurrency mechanism unless benchmark data proves a lock contention bottleneck, accompanied by documented before/after saturation numbers.
- [ ] **2. Geospatial Ray-Casting PIP Checker**
  - Optimize the ray-casting algorithm for checking point intersections with irregular polygon geofences in-memory.
- [ ] **3. Maritime Rules Engine**
  - **Milestone 1 — MVP Rules**:
    - *Protected Area Entry* (ray-casting Point-in-Polygon check)
    - *Loitering Detection* (duration limit matching the configurable `loitering_threshold_seconds` key)
    - *AIS Timeout / Silence* (timestamp freshness checks)
    - *Speed Anomaly / Violations* (zone-based velocity checks)
    - *Course Anomaly* (rapid drift or sudden heading adjustments)
  - **Milestone 2 — Stretch Rules**:
    - *MMSI Spoofing* (identity conflicts, duplicate MMSI positions)
    - *Dark Vessel Detection* (AIS silence matched near restricted geofences)
    - *Repeated Violations* (historical offense flags)
    - *Fishing Behavior Pattern* (slow loop tracks inside restricted zones)
    - *Route Deviation* (shipping channel trajectory drift)
    - *Cross-Border Intrusion* (maritime boundary crossings)
- [ ] **4. Weather-Correlated Risk Assessor**
  - Build weighted calculators combining wind speed, wave swell height, visibility, and vessel size coefficients into a single risk index (Low $\rightarrow$ Critical).
- [ ] **5. SAT Stress Test Controller**
  - Build an unbounded generator pushing mock coordinates into the jobs channel to stress test the service.
  - Implement exact p50/p99/max latency estimators using atomic counters.

---

## 👤 Person 4 — Database, Historical Replay & Simulator
**Focus:** Postgres/PostGIS schemas, analytics queries, historical playback, and mock feeds.

### Tasks
- [ ] **1. PostGIS Database Schema & Indexes**
  - Write SQL migrations for: `vessel_history` (coordinates, timestamp, trajectory lines) and `alerts_history`.
  - Set up R-Tree spatial indexing for fast regional historical querying.
- [ ] **2. Data Generation Simulator (FastAPI)**
  - Implement simulated generation of cargo, fishing, tankers, weather files, and scripted vessel violations.
  - Support modes: *Replay*, *Random*, and *Scenario Injection*.
- [ ] **3. Historical Replay Engine**
  - Build a backend playback service querying PostGIS trajectories by time interval and streaming coordinates sequentially via WebSockets.
- [ ] **4. Analytics Aggregator**
  - Expose statistical REST routes (`GET /api/v1/analytics`) returning summarized count logs, risk averages, and charts data arrays.

---

## 🏁 Phase 9 — Final Roadmap Integration (All Hands)
This milestone begins only after Persons 1–3 have stabilized their independent service builds:
- [ ] **1. Unified Containerization**
  - Draft the root-level `docker-compose.yml` wrapping all microservices.
  - Configure the Docker network bridge and cross-service hosts.
- [ ] **2. Health-Check Coordination**
  - Set up shell health check scripts validating database availability, simulation server, and API gateway start sequences.
- [ ] **3. GitHub Actions CI Configuration**
  - Setup `.github/workflows/ci.yml` verifying TypeScript typechecking, Go testing, and Python pytests on merge requests.
