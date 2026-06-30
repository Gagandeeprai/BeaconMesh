# Folder Structure Spec

The BeaconMesh repository utilizes a multi-language monorepo structure. This layout isolates frontend, backend, simulation, infrastructure, and documentation clean boundaries.

```
/
├── docs/                        # Architectural & product design documents
│   ├── adr/                     # Architecture Decision Records
│   │   ├── adr-001-mesh-routing.md
│   │   ├── adr-002-modular-monolith-clean-arch.md
│   │   └── adr-003-simulation-integration.md
│   ├── api_specification.md     # REST and WebSocket API schemas
│   ├── database_design.md       # SQL schemas, ERD, and spatial queries
│   ├── development_roadmap.md   # Project milestones and task status
│   ├── folder_structure.md      # This file
│   ├── hld.md                   # High Level Design & System Architecture
│   ├── lld.md                   # Low Level Design & Code interfaces
│   └── prd.md                   # Product Requirements Document
│
├── backend/                     # Go Modular Monolith codebase
│   ├── cmd/
│   │   └── server/              # Main entry point (starts HTTP & WebSockets)
│   ├── internal/
│   │   ├── domain/              # Entities, Value Objects, Aggregates
│   │   │   ├── vessel/
│   │   │   ├── telemetry/
│   │   │   └── emergency/
│   │   ├── application/         # Core Use Cases / Business logic orchestrators
│   │   ├── infrastructure/      # Adapter layer (DB, Client wrappers, Config)
│   │   │   ├── database/        # GORM or SQLx pgx implementation
│   │   │   ├── solver/          # Client wrapper for python optimizer
│   │   │   └── simclient/       # Client wrapper for python simulator
│   │   └── interfaces/          # Port handlers (HTTP, WS controllers)
│   ├── go.mod                   # Go module definitions
│   └── go.sum
│
├── frontend/                    # Next.js / React Frontend Dashboard
│   ├── src/
│   │   ├── app/                 # Next.js App Router (Layouts, page directories)
│   │   ├── components/          # Reusable React components (Map, Sidebar, Panels)
│   │   ├── hooks/               # Custom hooks (WebSockets, Mapbox event binding)
│   │   ├── lib/                 # Utility files and HTTP client wrapper
│   │   └── types/               # TypeScript interface mappings
│   ├── public/                  # Static assets (images, icons)
│   ├── package.json
│   ├── tailwind.config.ts       # Tailwind CSS layout configurations
│   ├── next.config.ts
│   └── tsconfig.json
│
├── simulation/                  # Python simulation & optimization engine
│   ├── src/
│   │   ├── simulator/           # Mesh networking simulator models
│   │   │   ├── __init__.py
│   │   │   ├── engine.py        # Handles time loops and event queue
│   │   │   └── radio.py         # Line of sight and path loss physics calculations
│   │   ├── solver/              # Google OR-Tools optimization worker
│   │   │   ├── __init__.py
│   │   │   └── vrp_solver.py    # VRPTW model mapping
│   │   └── app.py               # Microservice API server (FastAPI/Flask)
│   ├── tests/                   # Python unit tests for radio and solver
│   ├── requirements.txt         # OR-Tools, FastAPI, and scientific dependencies
│   └── Dockerfile
│
├── docker/                      # Infrastructure dockerization configurations
│   ├── postgres/                # PostgreSQL config & setup migrations
│   │   └── init-db.sh           # Script to auto-load postgis extension
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── docker-compose.yml           # Runs Postgres, Backend, Simulation, and Frontend
└── README.md                    # Primary repository overview
```
