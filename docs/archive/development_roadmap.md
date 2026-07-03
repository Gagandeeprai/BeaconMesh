> **⚠️ ARCHIVED — Historical Document**
>
> This document is retained for historical reference only. It describes the **original conceptual design** of BeaconMesh and does **not reflect the current implementation**.
>
> For the current architecture, see **[docs/architecture/architecture-overview.md](../architecture/architecture-overview.md)** — the canonical source of truth.
>
> *Archived: July 2026*

---

# Development Roadmap

This roadmap details the engineering milestones required to build BeaconMesh into a production-ready simulation and coordination platform.

## Milestone 1: Simulation Engine & Mesh Routing (Python)
**Objective**: Build a discrete event simulator modeling vessel mobility patterns, wireless signal propagation, and store-carry-forward packet routing.

* **Tasks**:
  - Setup Python environment, dockerization, and test suite.
  - Implement spatial models for vessel movements (patrols, circular lines, random walks).
  - Implement a line-of-sight & RF path loss radio range model (LoRa physics).
  - Implement Epidemic Routing (store-carry-forward packet replication and exchange).
  - Create a FastAPI/Flask runner to trigger simulation steps.
* **Verification**:
  - Unit tests verifying packet exchanges when nodes are in range.
  - Verification of zero-packet transmission when nodes are completely out of range.
  - Test suites confirming data collection at base station gateway nodes.

---

## Milestone 2: Go Backend Modular Monolith & DB Setup
**Objective**: Build the Go application backend conforming to Clean Architecture and DDD Lite principles, linked to PostgreSQL and PostGIS.

* **Tasks**:
  - Implement Docker Compose running PostgreSQL with the PostGIS spatial extensions.
  - Create Go domain aggregates and repository interfaces (`Vessel`, `Telemetry`, `Emergency`).
  - Implement PostgreSQL repository adapters with spatial queries (e.g. `ST_DWithin`, `ST_Distance`).
  - Construct the HTTP API Gateway (REST API endpoints).
  - Build the WebSocket stream hub to pipe live telemetry updates and distress events.
  - Implement cryptographic signature verification (Ed25519 or ECDSA) for incoming distress logs.
* **Verification**:
  - Go unit tests verifying business rules.
  - Database integration tests verifying spatial index performance and nearest-vessel queries.
  - REST client checks for telemetry upload and verification.

---

## Milestone 3: Search & Rescue (SAR) Optimization with Google OR-Tools
**Objective**: Develop the optimization solver service using OR-Tools, and bridge Go with the Python solver.

* **Tasks**:
  - Construct the Vehicle Routing Problem solver in Python using Google OR-Tools.
  - Define optimization parameters: travel cost minimization, capacity parameters, severity coefficients.
  - Create gRPC or HTTP JSON communication adapter between the Go backend and the Python worker.
  - Implement Go-side logic to aggregate active emergencies, call the optimizer, and save calculated routes.
* **Verification**:
  - Solver tests checking if high-severity cases are prioritized correctly.
  - Capacity limit checks (ensuring a rescue vessel with space for 4 patients is not sent to rescue 6).
  - Integration tests verifying Go calls translate to solved routes in the DB.

---

## Milestone 4: Next.js Frontend Map Dashboard
**Objective**: Build a beautiful, responsive, and real-time dashboard UI displaying telemetry logs, emergency statuses, and optimal routing plans.

* **Tasks**:
  - Setup React + Next.js template inside the `/frontend` directory.
  - Configure TailwindCSS design system with high-end dark mode aesthetics.
  - Integrate Mapbox GL JS with custom styling.
  - Connect client-side WebSocket hook to the Go backend streaming hub.
  - Add active emergency overlays (flashing distress beacons, signal ranges).
  - Add search and rescue route overlays (directional lines representing recommended paths).
  - Implement dispatch control panel to manually run optimization tasks.
* **Verification**:
  - Dashboard loads and streams simulated vessels in real-time.
  - Pressing "Dispatch Optimization" generates lines and stops correctly on the map.
  - Responsive design works on tablet and monitor viewports.
