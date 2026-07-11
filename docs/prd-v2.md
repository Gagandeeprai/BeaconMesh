**PRD**

**Real-Time Maritime Surveillance Platform**

Master Build Prompt for Antigravity

_v2 - Kafka removed. Constraints confirmed, not open questions._

Document type: Master task specification for Antigravity's Agent Manager. Supersedes the earlier version - the Kafka/in-process split is resolved: Kafka is not part of this platform, in any form, documented or deployed.

# **0\. Confirmed Constraints (non-negotiable, not up for redesign)**

- No heavy distributed pipelines. No Kafka, Flink, Spark, Redis Streams, or any message broker - anywhere in the platform, not even as a documented "future scaling path." In-process goroutines and channels only, for the same reason this held for the Person 3 Gateway: it's a clean, compact design that already clears the throughput floor by a wide margin without the operational overhead of a distributed system.
- Strict throughput floor: ≥ 50,000 vessel location messages/sec on standard hardware. Proven under unbounded load - a benchmark pre-paced to land exactly on 50,000/sec doesn't count as proof, it counts as proof the pacing works. Report actual saturation throughput.
- Real-time alerts: geofence violation detection triggers within milliseconds of receiving a message, characterized by p50/p99/max latency - not average. Average hides the tail, and the tail is what this constraint is actually about.

**Rule:** If any part of the design elsewhere in this document seems to invite a broker, a queue, or a distributed processing framework, that's a conflict with this section - and this section wins.

# **1\. Domain Boundary**

**In scope:** everything from the point maritime data reaches this software platform onward - ingestion, processing, geospatial analysis, detection, risk scoring, visualization, replay, alerting.

**Out of scope:** do not design or reference implementation details for satellites, radar hardware, AIS transmitters, communication protocols, IoT devices, drones, patrol boats. AIS, Radar, Satellite Imagery, VMS, Port Monitoring, Weather Services, and Manual Patrol Reports are existing external data sources this platform consumes - model their data shapes, not their infrastructure.

# **2\. Product Vision**

**Mission:** give maritime authorities a unified, real-time picture of vessel activity with instant, low-false-positive violation detection - replacing fragmented, high-latency monitoring with one platform.

**Target users:** Maritime Authority command staff, Coast Guard operators, Marine Protection Agency analysts, platform Administrators, Data Analysts.

**Success metrics:** throughput and latency numbers from §0, measured and reported - not estimated - plus a false-positive rate low enough that operators act on alerts instead of tuning them out.

# **3\. Two-Phase Execution Model**

**Phase 1 - Engineering Design Document.** Antigravity produces a written design covering §4-§11 as markdown artifacts (Mermaid diagrams, JSON schemas, algorithm descriptions with complexity/false-positive notes). No implementation code in Phase 1. Stop and present the design for review.

**Phase 2 - Implementation.** Only after explicit sign-off on Phase 1. Production-quality code - no placeholders, no TODOs, no stubbed functions. Every module compiles independently. Idiomatic Go for backend services, idiomatic TypeScript/React for frontend.

**Do not** let Phase 2 start automatically after Phase 1 completes - re-confirm explicitly.

# **4\. Microservices to Design (Phase 1 deliverable)**

For each: purpose, responsibilities, internal modules, interfaces, dependencies, scaling strategy, failure handling, future extensions.

- Simulator - generates all data source types (§6), since live feeds aren't available.
- API Gateway - external-facing REST/WS entry point, auth, rate limiting.
- Ingestion + Detection Service - the validated in-process engine from Appendix A (goroutines/channels/RWMutex, ray-casting geofence check), formalized as a microservice boundary. This is the entire answer to §0's throughput/latency constraints - no broker sits in front of or behind it.
- Geospatial Engine - spatial indexing, point-in-polygon, trajectory prediction (extends Appendix A's grid + ray-casting work).
- Risk Engine - weighted, configurable composite scoring.
- Notification Service - alert delivery, escalation, rate limiting.
- Authentication - JWT, RBAC.
- Dashboard Backend - serves the frontend below.
- Dashboard Frontend - React + TypeScript.
- Analytics Service - aggregate/historical querying.
- Historical Replay Service - replays recorded traffic.
- Configuration Service - runtime-tunable thresholds without redeploying.

Scaling strategy for the Ingestion + Detection Service specifically: more instances behind the API Gateway, each an independent in-process engine - horizontal scale-out by running more of the same compact design, not by inserting a broker between ingestion and detection.

# **5\. Technology Selection**

Justify in Phase 1 - don't just restate this table.

| **Layer**        | **Choice**            | **Why**                                                                                                                                                          |
| ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend services | Go                    | Validated for the §0 throughput/latency floor in Appendix A                                                                                                      |
| Geospatial store | PostgreSQL + PostGIS  | Persistent spatial querying/indexing/joins for historical and replay data - the in-memory grid handles the hot path, PostGIS handles everything that isn't on it |
| Cache            | Redis                 | Session state and hot-path lookups that don't need PostGIS's query power                                                                                         |
| Frontend         | React + TypeScript    | Matches existing BeaconMesh stack                                                                                                                                |
| Mapping          | MapLibre GL / Leaflet | Matches existing BeaconMesh choice - WebGL for global scale, Leaflet for regional                                                                                |
| Transport        | REST + WebSocket      | Matches Appendix A's existing contract                                                                                                                           |
| Streaming        | None                  | Explicitly excluded by §0                                                                                                                                        |

# **6\. Data & Event Schemas (Phase 1 deliverable)**

Complete JSON schemas for: AIS, Radar, Satellite, VMS, Alerts, Risk, Notifications, Weather, Port events, Patrol reports. Field-level types, and which fields drive detection/risk logic downstream.

# **7\. Simulation Framework**

Generates: cargo ships, fishing vessels, tankers, patrol vessels, background traffic; AIS, radar, satellite, weather, VMS, port events; and violation scenarios - illegal fishing, AIS spoofing, AIS shutdown, dark vessels, route deviation, loitering, variable traffic density, storm conditions.

**Modes:** Replay, Random, Scenario (scripted violation injection for demos), Stress Test - unbounded flood, the mode that actually proves the §0 throughput floor, not a mode that paces itself to the floor and calls that proof.

Simulation speed and density must be runtime-configurable.

# **8\. Geospatial + Detection Engine**

**Geospatial primitives:** point-in-polygon, spatial indexing (Appendix A's grid choice - state in Phase 1 whether it still holds once PostGIS persistence is added, or whether geohashing/R-tree becomes worthwhile for the persisted-data query path specifically, as distinct from the hot in-memory path which stays a grid), distance calculation, trajectory prediction, spatial joins.

Detection algorithms, each with logic, inputs, configurable thresholds, complexity, expected false-positive modes, possible improvements:

- Protected area entry (reuses Appendix A's ray-casting engine directly)
- Loitering
- AIS timeout
- AIS spoofing
- Dark vessel detection
- Speed anomaly
- Course anomaly
- Repeated violations
- Fishing behavior pattern
- Route deviation
- Cross-border intrusion

# **9\. Risk Engine + Alert Engine**

**Risk Engine:** configurable weighted rules, severity, confidence, composite score - show the actual formula.

**Alert Engine:** severity/priority levels, deduplication (don't re-alert every tick on a sustained violation), escalation policy, rate limiting, notification routing.

# **10\. Dashboard**

Screens: Landing Page, Live Map, Alert Centre, Analytics, Vessel Details, Historical Replay, Risk Dashboard, Admin Panel, User Management. Components, filters, charts, key interactions per screen. Extends BeaconMesh's existing Live Map/dashboard work where screens overlap rather than starting from zero.

# **11\. APIs, Auth, Deployment, Testing, Performance Targets**

- APIs: complete REST design (request/response, auth, errors, status codes, versioning), OpenAPI/Swagger spec.
- Auth: JWT, RBAC with defined roles/permissions, session management, audit logging.
- Deployment: Docker + Docker Compose for the POC. Kubernetes design documented as a future path if useful - this is a deployment-topology question, unrelated to §0's streaming-framework exclusion, and fine to discuss without contradiction.
- Testing: unit, integration, load, stress, performance, and simulation-validation (does an injected violation actually get detected and alerted correctly).
- Performance targets: the §0 numbers, measured and reported once Phase 2 exists - not estimated in Phase 1.

# **12\. Implementation Roadmap (Phase 1 deliverable)**

Independently runnable milestones with deliverables, dependencies, testing, acceptance criteria. Suggested shape - Antigravity should refine, not just copy:

- 1\. Ingestion + Detection engine (Appendix A, formalized as a service)
- 2\. Simulator (Random + Stress Test modes first - needed to test milestone 1's throughput claim)
- 3\. Risk + Alert engines
- 4\. Dashboard backend + REST/WS contracts
- 5\. Dashboard frontend (Live Map, Alert Centre)
- 6\. Historical Replay + Analytics
- 7\. Auth/RBAC, Admin Panel

# **13\. Engineering & Coding Principles**

Scalable, maintainable, modular, loosely coupled, high cohesion, SOLID, Clean Architecture, DDD where it earns its complexity, event-driven without requiring a broker to be event-driven - an internal event bus (as already used in the Person 3 Gateway for weather.updated) satisfies this without violating §0. Avoid unnecessary complexity.

Phase 2 code: no pseudo-code, no placeholders, no TODOs, no incomplete functions. Every module compiles independently. Idiomatic Go / idiomatic TypeScript. Document everything.

# **Appendix A: Person 3 - Go API Gateway (reference implementation)**

Already-validated design. Phase 1's Ingestion + Detection Service section formalizes this into a microservice boundary - it does not redesign it.

Build Person 3's Go API Gateway for BeaconMesh, per the attached PRD.

Stack: Go 1.22, net/http, gorilla/websocket. Follow the task order in

section 7 exactly.

Architecture is decided - build to it, don't redesign: 8-worker

goroutine pool over a buffered channel (capacity 100,000), sync.RWMutex

guarding in-memory vesselStates, ray-casting geofence checks run inside

the timed hot path per message, (lat,lon)-keyed weather SWR cache with

strict TTL, AISProvider interface with a trigonometric MockProvider.

Do not mark the telemetry processing engine done without: an UNBOUNDED

throughput benchmark (not pre-paced to exactly 50,000/sec) run for >= 3

sustained seconds with the actual saturation number reported; p50/p99/max

latency from message receipt to alert emission (not average); explicit

confirmation the ray-casting check ran inside the benchmarked path; and

go test -race ./... clean (there's a known race condition around

benchmark toggles in engine.go to fix as part of this work).

Hard constraint: no distributed streaming frameworks (no Kafka/Flink/

Spark/Redis Streams) - in-process goroutines/channels only.

Do not change any REST path, JSON shape, WebSocket message format, or

the AISProvider interface signature without explicitly flagging the

change and why - Person 1/2's frontend and Person 4's optimizer are

built against these exact contracts. POST /api/v1/optimize/rescue is a

forward to Person 4's Python service - do not reimplement OR-Tools logic

in Go.

Do not swap the RWMutex-based concurrency design unless the unbounded

benchmark shows a measured throughput ceiling from lock contention; if

you do change it, report the before/after numbers that justified it.

Report real measured numbers in the implementation plan - not estimates.

# **Appendix B: Paste-Ready Prompt Block (Phase 1 only)**

Act as the engineering team described: Principal Architect, Distributed

Systems Engineer, Backend/Frontend/Geospatial/Data/Database/DevOps/SRE/

QA engineers, and PM. Design (do not implement yet) a production-inspired

Real-Time Maritime Surveillance Platform per this PRD's sections 1-12.

Software domain only - no satellite/radar/AIS-transmitter/hardware

design; treat those as existing external data sources you consume.

Hard constraint, non-negotiable: no message broker or distributed

streaming framework anywhere in the platform (no Kafka, Flink, Spark,

Redis Streams) - in-process goroutines and channels only. Must sustain

\>= 50,000 vessel location messages/sec on standard hardware, proven

under unbounded (not pre-paced) load. Geofence violation detection must

trigger within milliseconds, reported as p50/p99/max latency, not

average.

Produce a complete Engineering Design Document: architecture (Mermaid

diagrams for system context, container, component, sequence, data flow,

deployment), the microservice breakdown in section 4 with full detail

per service, justified technology selections (section 5, note that

streaming/broker technology is excluded by the hard constraint above),

event schemas (section 6), the simulation framework design (section 7)

including a Stress Test mode that proves the throughput floor under

unbounded load, geospatial + detection engine design (section 8) that

formalizes Appendix A's already-validated engine as the Ingestion +

Detection service rather than redesigning it, risk + alert engine design

(section 9), dashboard design (section 10), API/auth/deployment/testing/

performance design (section 11), and an independently-runnable milestone

roadmap (section 12).

State every assumption explicitly rather than silently resolving

ambiguity. Stop after producing this design document - do not begin

implementation until it's reviewed and explicitly approved.