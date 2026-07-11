# BeaconMesh — Hackathon Task Board

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│ Person 1 (Frontend Map)     Person 2 (Frontend Ops+Sim)      │
│  LiveMapConsole.tsx          AlertsView, MissionsView         │
│  MapLibre GL + 200 vessels  Simulation engine + DTN mesh     │
│  Ports, cyclones, filters   SOS dispatch, weather panel      │
└──────────┬──────────────────┬────────────────────────────────┘
           │ REST             │ REST
           ▼                  ▼
┌───────────────────────────────────────────────────────────────┐
│ Person 3 (Go API Gateway)                                     │
│  AIS mock provider, Weather SWR cache                         │
│  Processing engine (geofence, risk, 50K msg/s)                │
│  Emergency endpoints, WebSocket                               │
└──────────┬───────────────────────────────────────────────────┘
           │ POST /api/v1/optimize/rescue
           ▼
┌───────────────────────────────────────────────────────────────┐
│ Person 4 (Python OR-Tools + Infrastructure)                   │
│  Rescue solver, Weather cost model                            │
│  DTN radio, Vessel simulation                                 │
│  Docker Compose, CI/CD, Integration tests                     │
└───────────────────────────────────────────────────────────────┘
```

---

## Person 1 — Global Maritime Traffic Console

**No backend needed.** Uses hardcoded vessel data from `data.ts`. MapLibre GL renders everything client-side.

| # | Task | Files | What to build |
|---|------|-------|---------------|
| 1 | Render 200+ vessels on MapLibre GL with type colors | `LiveMapConsole.tsx` | `map.addSource('vessels', { type: 'geojson' })` with `FeatureCollection` from `data.ts`. `circle-color` paint property mapping vessel type → color |
| 2 | Heading arrows via rotation | `LiveMapConsole.tsx` | `circle-rotate: ['get', 'heading']` on vessel layer so dots point in direction of travel |
| 3 | Smart clustering at low zoom | `LiveMapConsole.tsx` | `cluster: true`, `clusterRadius: 50`. Count badge. Click to expand into individual vessels |
| 4 | Vessel detail side drawer on click | `LiveMapConsole.tsx` | `map.on('click', 'vessels')` → set state → slide-in panel with MMSI, IMO, flag, dims, speed, heading, destination, ETA, photo |
| 5 | Filter accordion | `LiveMapConsole.tsx` | 7 vessel type checkboxes, speed/length range sliders, flag/destination text input → `setFilter()` on layer |
| 6 | Search bar with autocomplete | `LiveMapConsole.tsx` | Input → filter vessels by name → dropdown → click pans map to vessel |
| 7 | Port markers + cyclone zones | `LiveMapConsole.tsx` | Ports as `symbol` layer with name. Cyclones as `fill` layer with opacity |
| 8 | Coordinate drift loop (1s tick) | `LiveMapConsole.tsx` | `useEffect` + `setInterval(1000)` → update each vessel's lat/lng by knot velocity → `getSource('vessels').setData(...)` to animate |

**How to run:** `cd frontend && npm run dev` → opens at localhost:3000 → click "Live Map" tab

**Demo:** *Open Live Map → see 200+ colored vessels moving → click one → drawer with full spec → filter by type → search finds vessel → ports + storm zones visible*

---

## Person 2 — Emergency Dashboard + Simulation Engine

**No backend needed.** The browser-side simulation engine (`simulation/engine.ts`) runs entirely in the browser. Uses its own event bus + tick loop. The `runFallbackSolver()` provides rescue optimization locally.

| # | Task | Files | What to build |
|---|------|-------|---------------|
| 1 | SOS alert panel | `AlertsView.tsx`, `RecentAlertsPanel.tsx` | Cards with type icon, severity badge, status, people count, description. "View Command Panel" navigates to detail |
| 2 | Distress broadcast form | `AlertsView.tsx` | Vessel picker dropdown, type selector, description textarea → button calls `engine.triggerSOS()` |
| 3 | Active mission board | `MissionsView.tsx`, `ActiveMissionPanel.tsx` | Mission cards: ID, vessel, type, responder, ETA countdown, status badge. Timeline log with ring-dot visualization |
| 4 | DTN mesh links on Leaflet map | `MapOverview.tsx` | `computeDTNLinks()` from `dtn.ts` → draw lines between in-range vessels. Blue=active, red=distress routing |
| 5 | Network trace animation | `MapOverview.tsx`, `engine.ts` | SOS triggers `computePropagationPath()` → BFS hops → animated pulse moves along each hop (progress 0→1) |
| 6 | Weather panel | `WeatherPanel.tsx` | Hardcoded data from `DEFAULT_WEATHER`. Show temp, wind speed/direction, wave height/period/direction, visibility, sea state |
| 7 | Fleet registry table + telemetry inspector | `VesselsView.tsx` | Search + type filter + sortable table. Select → sliders for speed/heading/lat/lng → "Inject AIS" applies changes to state |
| 8 | Analytics page | `AnalyticsView.tsx` | 3 KPI cards (incident rate -14.2%, mean rescue 24.5min, salvage ratio 98.2%). Bar charts from hardcoded data |

**How to run:** `cd frontend && npm run dev` → opens at localhost:3000 → "Dashboard" tab

**Demo:** *Dashboard loads → click "Broadcast SOS" → alert appears → DTN mesh lights up → mission assigned → ETA counts down → responder reaches target → "On Scene"*

---

## Person 3 — Go API Gateway (Backend)

**Standalone service.** Everything lives in `backend/`. No Python or frontend needed. Test with `curl`.

| # | Task | Files | What to build |
|---|------|-------|---------------|
| 1 | Fix weather cache by coordinates | `internal/weather/infrastructure/cache.go:32-41` | Change single-entry cache to `map[[2]float64]*cachedEntry` keyed by `(lat, lon)`. Return cached only if coords match AND TTL valid |
| 2 | Fix ToggleBenchmark data race | `internal/processing/engine.go:137-148` | Add `e.mu.Lock()/Unlock()` around `benchmarkCancel` reads/writes. Don't rely on atomic alone |
| 3 | AIS MockProvider — 200 vessels | `internal/ais/infrastructure/mock.go` | Return vessels across 12 sea areas with trig coordinate drift, random type distribution |
| 4 | AIS HTTP handler + background refresh | `internal/ais/interfaces/http.go`, `internal/ais/application/service.go` | `GET /api/v1/ais` returns JSON array. Background goroutine refreshes every 30s. Fallback if primary fails |
| 5 | Open-Meteo weather client | `internal/weather/infrastructure/openmeteo.go` | HTTP GET to `api.open-meteo.com` for weather + marine params. Parse into `domain.WeatherReport`. Handle errors |
| 6 | Processing Engine | `engine.go`, `rules.go`, `risk.go`, `geospatial.go`, `alerts.go` | Ingest telemetry → check zone polygons (ray-casting) → detect violations → calc risk → emit alerts. Benchmark: 50K msg/s with 8 goroutine workers |
| 7 | Emergency HTTP endpoints | `internal/emergency/http.go` | `POST /api/v1/emergency` (body: `vessel_id`, `type`, `description`) → queues SOS. `GET /api/v1/emergency/pending` → returns + clears queue |
| 8 | WebSocket for vessel position push | `cmd/server/main.go` | Add `/ws` endpoint using `gorilla/websocket`. On connect, send vessel positions every 1s. Handle disconnect cleanup |

**How to run:** `cd backend && go run ./cmd/server/main.go` → listens on `:8080`

**Demo:** `curl localhost:8080/api/v1/health` → `curl localhost:8080/api/v1/ais` → `curl 'localhost:8080/api/v1/weather?lat=12.9&lon=74.9'` → `curl -X POST localhost:8080/api/v1/emergency -d '{"vessel_id":"v1"}'` → `go test ./...` passes

---

## Person 4 — Python OR-Tools + Infrastructure

**Standalone service.** Python FastAPI runs independently. Docker Compose wraps all 3 services at the end.

| # | Task | Files | What to build |
|---|------|-------|---------------|
| 1 | OR-Tools rescue solver | `src/optimizer/solver.py` | `RescueOptimizer.optimize()`: cost matrix (haversine × weather multiplier), OR-Tools `RoutingModel` with `PATH_CHEAPEST_ARC`, return best vessel + ETA + route |
| 2 | Weather cost model | `src/optimizer/costs.py` | `get_travel_time_multiplier()`: wave (>1.2m → +15%/m), wind (>15 km/h → +5%/10kmh), visibility (<2km → +30%). `inf` if >4m waves or >60 km/h wind or <0.5km vis |
| 3 | FastAPI routes | `src/app.py` | `/health`, `POST /api/v1/optimize/rescue`, `POST /api/v1/sim/init`, `POST /api/v1/sim/tick`, `POST /api/v1/sim/emergency`, `GET /api/v1/sim/state`, `POST /api/v1/sim/reset` |
| 4 | DTN radio model | `src/simulator/radio.py` | `compute_rssi()`: log-distance path loss + shadowing. `is_link_successful()`: sigmoid from RSSI margin vs sensitivity |
| 5 | Vessel movement + epidemic routing | `src/simulator/vessel.py`, `src/simulator/engine.py` | Wander/patrol position updates. Buffer TTL. `sync_with_peer()`: epidemic exchange, ack vaccination, base station delivery |
| 6 | Python tests | `tests/test_optimizer.py`, `tests/test_simulator.py` | Test cost model (calm/penalties/blocked), haversine, radio propagation, vessel movement, DTN epidemic routing (A→B→C chain) |
| 7 | Docker Compose | Root `docker-compose.yml` | 3 services with ports: `frontend` (port 3000), `backend` (port 8080), `simulation` (port 8000). Shared network bridge |
| 8 | GitHub Actions CI | `.github/workflows/ci.yml` | On push/PR: `tsc --noEmit` (frontend), `go test ./...` (backend), `.venv/bin/pytest tests/ -v` (simulation). All must pass |

**How to run:**

```bash
# Standalone
cd simulation
.venv/bin/uvicorn src.app:app --port 8000

# Full stack
docker compose up
```

**Demo:**

```bash
curl -X POST localhost:8000/api/v1/optimize/rescue \
  -H 'Content-Type: application/json' \
  -d '{
    "sos_coords": {"latitude": 12.9, "longitude": 74.9},
    "responders": [
      {"id": "v1", "name": "Boat A", "latitude": 12.92, "longitude": 74.86, "speed_knots": 20}
    ],
    "weather": {"waveHeight": 1.6, "windSpeed": 20, "visibility": 8}
  }'
```

Returns `{"vessel_id":"v1","eta_minutes":...}`.

`pytest tests/ -v` passes. `docker compose up` starts every service.

---

## Integration — How It All Fits Together

| Person | Mocks what? | Connects to? | Final integration |
|--------|-------------|--------------|-------------------|
| 1 | Own `data.ts` (200 vessels) | Person 3's `GET /api/v1/ais` for live data | Person 4's `docker-compose.yml` |
| 2 | Own `engine.ts` (in-browser sim) | Person 3's `POST /api/v1/emergency` for real SOS | Person 4's `docker-compose.yml` |
| 3 | `MockProvider` for AIS | Person 4's `POST /api/v1/optimize/rescue` | Person 4's `docker-compose.yml` |
| 4 | Own solver + tests | Person 3's proxy calls into it | Person 4 writes the Docker glue |

## Timeline

| Phase | What |
|-------|------|
| **0-2h** | Everyone runs their "how to run" command. Blank page → first visible output |
| **2-4h** | Core tasks done (tasks 1-4 for each person). Person 4 gets `curl` response from solver |
| **4-6h** | Polish tasks (5-7). Person 4 writes Docker Compose |
| **6-8h** | Integration: `docker compose up` → frontend talks to Go → Go talks to Python. Fix any cross-service bugs. Prepare demo |
