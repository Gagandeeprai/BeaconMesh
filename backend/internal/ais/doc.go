/*
Package ais provides a Clean Architecture subsystem for maritime AIS vessel
tracking.  It supports pluggable data providers, response caching with
stale-while-revalidate semantics, automatic fallback, and health monitoring.

Architecture
                        ┌─────────────────┐
                        │   interfaces/    │  HTTP handlers (AIS + Health)
                        │   http.go        │
                        └────────┬────────┘
                                 │ calls
                        ┌────────▼────────┐
                        │  application/   │  Orchestrator, cache, health
                        │  service.go     │
                        │  cache.go       │
                        └────────┬────────┘
                                 │ uses Provider interface
                        ┌────────▼────────┐
                        │ infrastructure/ │  Concrete providers, factory,
                        │  factory.go     │  config
                        │  mock.go        │
                        │  aishub.go      │
                        └────────┬────────┘
                                 │ implements
                        ┌────────▼────────┐
                        │    domain/      │  Vessel model, Provider interface
                        │  vessel.go      │
                        └─────────────────┘

Provider selection

  1. ConfigFromEnv() reads environment variables and returns a Config.
  2. NewProvider(cfg) uses cfg.Provider to create the correct implementation.
  3. main.go wires:  provider := infrastructure.NewProvider(cfg)
     service := application.NewService(provider, fallback, appCfg)

Adding a new provider

  To add a new AIS data source (e.g. MarineTraffic, FleetMon):

  1. Define a new ProviderType constant in infrastructure/config.go.
  2. Add fields to Config (API key, URL, etc.).
  3. Populate the new fields in ConfigFromEnv().
  4. Create a new file infrastructure/<name>.go with a struct that
     implements domain.Provider (FetchVessels + Name).
  5. Add a case to the switch in infrastructure/factory.go.

  No existing provider or the factory switch needs to be modified again
  after the new case is added — the factory is the sole extension point.

Cache semantics

  - Stale-while-revalidate: cached data is returned immediately while a
    background goroutine refreshes from the provider.
  - If refresh fails, stale data is preserved and returned on subsequent
    requests.
  - If the cache is empty and the provider is unavailable, the fallback
    provider (if configured) is tried before returning an error.

Health

  GET /api/v1/health returns the active provider name, online status,
  last success / error timestamps, and current cache age.
*/
package ais
