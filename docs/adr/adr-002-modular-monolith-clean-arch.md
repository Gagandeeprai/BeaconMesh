# ADR-002: Modular Monolith and Clean Architecture for Go Backend

## Context
A maritime safety platform requires high reliability, ease of auditing, and simple operational maintenance. Microservices introduce complex network failures, deployment orchestration overhead, and consistency challenges. However, a tightly coupled monolith will lead to spaghetti code, blocking future scaling or migration.

## Decision
We will architect the Go backend as a **Modular Monolith** employing **Clean Architecture** (ports and adapters) and **DDD Lite** principles.

Key guidelines:
1. **Modules**: The codebase is split into distinct functional modules: `Vessel`, `Telemetry`, `Emergency`, and `Simulation`.
2. **Layering**: Inside each module, we enforce strict dependency rules from the outside in:
   * **Domain Layer**: Contains entities, value objects, aggregates, and repository interfaces. It has zero external dependencies (no DB libraries, no web frameworks).
   * **Application Layer**: Contains business use cases. orchestrating domain operations.
   * **Infrastructure Layer**: Contains DB adapters (PostGIS, database repositories) and client implementations.
   * **Interfaces Layer**: Contains controllers for HTTP routing and WebSocket hubs.
3. **Communication**: Modules communicate in-memory using domain services or events, rather than direct package dependency loops.

## Consequences

### Positive
* **Decoupled Core**: Business logic is completely isolated and testable without mock databases.
* **Refactor-Friendly**: Easy to extract modules into independent microservices if scaling requirements demand it.
* **Low Operational Overhead**: Simple deployment of a single Docker container containing the entire compiled Go binary.

### Negative
* **Strict Discipline**: Developers must follow separation of concerns and interface rules. Boilerplate code is required for interface definitions.
