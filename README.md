<div align="center">

<br/>

```
██████╗ ███████╗ █████╗  ██████╗ ██████╗ ███╗   ██╗███╗   ███╗███████╗███████╗██╗  ██╗
██╔══██╗██╔════╝██╔══██╗██╔════╝██╔═══██╗████╗  ██║████╗ ████║██╔════╝██╔════╝██║  ██║
██████╔╝█████╗  ███████║██║     ██║   ██║██╔██╗ ██║██╔████╔██║█████╗  ███████╗███████║
██╔══██╗██╔══╝  ██╔══██║██║     ██║   ██║██║╚██╗██║██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║
██████╔╝███████╗██║  ██║╚██████╗╚██████╔╝██║ ╚████║██║ ╚═╝ ██║███████╗███████║██║  ██║
╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
```

**Maritime Emergency Coordination & Global Traffic Surveillance Platform**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-4.1-396CB2?style=for-the-badge&logo=maplibre&logoColor=white)](https://maplibre.org/)
[![OR-Tools](https://img.shields.io/badge/OR--Tools-9.6-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/optimization)

</div>

---

## 🌊 Overview

**BeaconMesh** is a full-stack, real-time maritime situational awareness platform designed for coastal emergency coordination, AIS vessel tracking, and intelligent rescue mission optimization.

It combines two distinct operational theatres in one unified interface:

| Mode | Purpose |
|------|---------|
| 🆘 **Dashboard** | Regional emergency operations for the Mangalore coastal sector — SOS dispatch, fleet coordination, DTN mesh routing |
| 🌍 **Live Map** | Global maritime traffic monitoring center — 12,000+ vessels worldwide, AIS telemetry, cyclone alerts, port telemetry |

---

## ✨ Key Features

### 🗺️ Global Maritime Traffic Console
- **Full-world MapLibre GL** map with WebGL GPU-accelerated rendering
- **200+ live vessels** plotted across all major international shipping lanes (Suez, Malacca, Panama, English Channel, Hormuz)
- **Smart clustering** — vessel groups collapse at low zoom and expand on click
- **Color-coded vessel types**: Cargo (green), Tankers (red), Passenger (blue), Tugs (yellow), Fishing (cyan), Research (purple), Military (pink)
- **Real-time coordinate drift** simulating vessel movement at true knot velocities
- **Port telemetry** for 8 major global ports (Singapore, Shanghai, Rotterdam, LA, Suez, Mumbai, Mangalore)
- **Cyclone warning zones** with fill overlays and active storm tracking

### 🔍 Vessel Specifications Inspector
- Click any ship to open a full-spec side drawer
- MMSI, IMO number, flag state, dimensions (length × beam × draft)
- SOG, COG, heading, destination, ETA, position, last AIS update
- Operational summary: nearest port distance, storm proximity, rescue assistance eligibility, weather risk level

### 🎛️ Advanced Traffic Filters
- Category toggles (7 vessel types + anchored/underway status filters)
- Speed (knots) and length (meters) range sliders
- Country/Flag, Destination, and Status text search filters
- Live vessel search bar with instant dropdown results

### 🆘 Emergency Operations Dashboard
- Real-time SOS incident tracker with alert severity grading
- Active mission dispatch board with vessel assignments
- DTN (Delay-Tolerant Networking) mesh link simulation between gateway stations
- Weather-adjusted ETA calculations for rescue vessels

### 🧠 OR-Tools Optimization Engine
- Google OR-Tools powered rescue assignment solver
- Weather-penalty cost model (wave height, wind speed factors)
- Assigns optimal vessels to SOS incidents minimizing ETA under sea conditions
- REST API with full JSON payloads via Python FastAPI

### 🌦️ Live Weather Integration
- Open-Meteo Weather & Marine API integration
- Real-time temperature, wind speed/direction, wave height/period/direction
- 5-minute cache layer with offline fallback state
- Weather data feeds directly into OR-Tools cost penalties

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     BeaconMesh Platform                      │
├────────────────┬──────────────────┬──────────────────────────┤
│   Frontend     │   Go Gateway     │   Python Optimizer       │
│                │                  │                          │
│  React + Vite  │  REST API :8080  │  FastAPI + OR-Tools :8000│
│  TypeScript    │  Weather Cache   │  Rescue Assignment Solver│
│  MapLibre GL   │  AIS Provider    │  Weather Cost Model      │
│  TailwindCSS   │  CORS Proxy      │  Vessel ETAs             │
│                │                  │                          │
│  Simulation    │  Open-Meteo API  │  pytest test suite       │
│  Engine (TS)   │  (Weather/Marine)│                          │
└────────────────┴──────────────────┴──────────────────────────┘
```

### AIS Provider Architecture (future-proof)
```
Frontend → Go Proxy → AISProvider Interface
                           ├── MockAISProvider  (current — trigonometric simulation)
                           └── LiveAISProvider  (future — real transponder APIs)
```

### Simulation Architecture (frontend)
```
simulation/
  ├── engine.ts     — tick orchestrator
  ├── movement.ts   — vessel physics (drift, heading, speed)
  ├── dtn.ts        — mesh radio link simulation
  ├── mission.ts    — SOS dispatch & mission lifecycle
  └── eventBus.ts   — cross-component event system
```

---

## 📁 Project Structure

```
BeaconMesh/
├── frontend/                    # React + TypeScript (Vite)
│   ├── src/
│   │   ├── App.tsx              # Root application with mode switcher
│   │   ├── types.ts             # Shared TypeScript types
│   │   ├── components/
│   │   │   ├── LiveMapConsole.tsx   # Global maritime surveillance center
│   │   │   ├── Header.tsx           # Mode switcher (Live / Hybrid / Simulation)
│   │   │   ├── Sidebar.tsx          # Navigation
│   │   │   ├── MapOverview.tsx      # Dashboard regional map (Leaflet)
│   │   │   ├── AlertsView.tsx       # SOS alert management
│   │   │   ├── MissionsView.tsx     # Active rescue missions
│   │   │   ├── VesselsView.tsx      # Fleet vessel registry
│   │   │   ├── WeatherOverview.tsx  # Live weather telemetry
│   │   │   └── AnalyticsView.tsx    # Operational analytics
│   │   └── simulation/
│   │       ├── engine.ts
│   │       ├── movement.ts
│   │       ├── dtn.ts
│   │       ├── mission.ts
│   │       └── eventBus.ts
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Go API Gateway
│   ├── cmd/server/main.go       # Entry point + CORS + routing
│   └── internal/
│       ├── weather/
│       │   ├── application/     # Weather service + tests
│       │   ├── domain/          # Weather & AIS provider interfaces
│       │   ├── infrastructure/  # Open-Meteo client, AIS mock, cache
│       │   └── interfaces/      # HTTP handlers
│       └── shared/event/        # Internal event bus
│
├── simulation/                  # Python Optimization Service
│   ├── src/
│   │   ├── app.py               # FastAPI entry point
│   │   ├── optimizer/
│   │   │   ├── solver.py        # OR-Tools assignment solver
│   │   │   └── costs.py         # Weather penalty cost model
│   │   └── simulator/
│   │       ├── engine.py
│   │       ├── vessel.py
│   │       └── radio.py
│   ├── tests/
│   │   ├── test_optimizer.py
│   │   └── test_simulator.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── docs/                        # Architecture documentation
│   ├── adr/                     # Architecture Decision Records
│   ├── hld.md                   # High-Level Design
│   ├── lld.md                   # Low-Level Design
│   ├── prd.md                   # Product Requirements
│   ├── api_specification.md
│   └── database_design.md
│
├── requirements.txt             # Top-level Python deps
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Frontend runtime |
| Go | ≥ 1.22 | API Gateway |
| Python | ≥ 3.11 | Optimization service |

---

### 1. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

> Runs at **http://localhost:3000**

---

### 2. Go API Gateway

```bash
cd backend
go run ./cmd/server/main.go
```

> Runs at **http://localhost:8080**

Endpoints:
- `GET /api/weather` — Current weather & marine conditions
- `GET /api/ais/vessels` — Live AIS vessel positions
- `POST /api/optimize` — Rescue assignment optimization

---

### 3. Python Optimization Service

```bash
cd simulation
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
uvicorn src.app:app --reload --port 8000
```

> Runs at **http://localhost:8000**

---

### 4. Run Tests

```bash
# Go tests
cd backend && go test ./...

# Python tests
cd simulation && pytest tests/ -v
```

---

## 🖥️ Operational Modes

Switch between modes using the **header toggle bar**:

| Mode | Description |
|------|-------------|
| 🟢 **Live** | Displays only real (or simulated-live) AIS commercial traffic. No simulated emergency events. |
| 🟡 **Hybrid** | Combines global AIS traffic with simulated fishing fleet, SOS events, and rescue dispatches. |
| 🔵 **Simulation** | Only simulated vessels, gateway stations, and emergency scenarios. All global AIS traffic is hidden. |

---

## 🌐 Live Data Sources

| Source | Data |
|--------|------|
| [Open-Meteo Weather API](https://open-meteo.com/) | Temperature, wind speed/direction, visibility |
| [Open-Meteo Marine API](https://marine-api.open-meteo.com/) | Wave height, period, direction |
| CartoDB Dark Matter | Dark WebGL world map tiles |
| AIS Mock Provider | Trigonometric vessel simulation (real transponder-ready interface) |

---

## 📐 Architecture Decision Records

| ADR | Title |
|-----|-------|
| [ADR-001](docs/adr/adr-001-mesh-routing.md) | DTN Mesh Routing Strategy |
| [ADR-002](docs/adr/adr-002-modular-monolith-clean-arch.md) | Modular Monolith + Clean Architecture |
| [ADR-003](docs/adr/adr-003-simulation-integration.md) | Simulation Layer Integration |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | TailwindCSS |
| World Map | MapLibre GL (WebGL) |
| Regional Map | Leaflet.js |
| Icons | Lucide React |
| API Gateway | Go 1.22 (net/http) |
| Optimization | Python + Google OR-Tools |
| REST Service | FastAPI + Uvicorn |
| Data Validation | Pydantic v2 |
| Scientific Compute | NumPy + SciPy |
| Testing | Go test + pytest |

---

## 🔮 Roadmap

- [ ] Connect `LiveAISProvider` to real transponder APIs (e.g. AISHub, MarineTraffic)
- [ ] WebSocket streaming for real-time vessel position updates
- [ ] PostgreSQL + PostGIS for vessel track persistence
- [ ] Docker Compose multi-service orchestration
- [ ] Alert notification push (email / SMS / webhook)
- [ ] Vessel route prediction using ML trajectory models

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

Built with 🌊 for maritime safety and situational awareness.

**BeaconMesh** — _When seconds matter at sea._

</div>
