# ADR-003: Simulation & Optimization Subsystem Separation

## Context
We need to simulate radio propagation (path loss, line-of-sight limits, packet collisions) and solve complex Capacitated Vehicle Routing Problems with Time Windows (CVRPTW). 

* While Go is excellent for high-concurrency web APIs and network streaming, its library ecosystem for advanced optimization and mathematical modeling is limited.
* Python has first-class support for Google OR-Tools and scientific libraries (NumPy, SciPy) useful for RF simulation math.

## Decision
We will separate the Simulation and Optimization engine into a **decoupled Python service**, communicating with the Go backend over local network APIs (gRPC or REST over HTTP).

* **Go Backend role**: Acts as the system of record. Stores persistent vessels, telemetry history, emergency logs, and active routes. Exposes APIs to frontend clients.
* **Python Service role**:
  * **Simulation Engine**: Runs discrete-event loops simulating vessel movements and routing dynamics. Emits results back to the Go backend database.
  * **Optimization Solver**: Implements OR-Tools routing model. Takes raw JSON/gRPC inputs from Go, computes optimal routes, and returns structured path/stop logs.

## Consequences

### Positive
* **Ecosystem Leverage**: Easy to implement complex optimization constraints in Python with native OR-Tools APIs.
* **CPU Isolation**: Solver computations and simulation loops are CPU-heavy. Running them in a separate process/container prevents CPU starvation on the Go web server.
* **Independent Scalability**: Optimization workers can be scaled horizontally behind a load balancer.

### Negative
* **Inter-process Latency**: Adds network serialization/deserialization cost between Go and Python.
* **Polyglot Monorepo Complexity**: Developers need to manage both Go and Python environments (Go modules and Python virtual environments/pip requirements).
