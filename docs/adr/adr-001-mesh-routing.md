# ADR-001: Offline-First Mesh Routing Strategy

## Context
Vessels operating beyond cellular range need to communicate telemetry and critical distress calls to coastal gateways. Since vessels are sparsely distributed and dynamic, an end-to-end communication path between a source vessel and the internet gateway is rarely available. Traditional ad-hoc routing protocols (like AODV or DSR) fail in this scenario because they require a complete path to be active before transmission can begin.

## Decision
We will implement a **Delay-Tolerant Networking (DTN)** model using **Epidemic Routing** (a store-carry-forward mechanism). 

Under this model:
1. Every vessel maintains a local buffer of messages (telemetry packets, distress alerts) that need to be delivered.
2. When two vessels come within simulated radio range (LoRa line-of-sight threshold), they exchange metadata "summary vectors" representing the packets in their respective buffers.
3. Each node requests packets from the other that it does not already possess, replicating messages across the mesh.
4. When any vessel comes within range of a base station or internet-connected gateway, it uploads its entire buffer, flushing successfully delivered packets (or marking them as uploaded).

To optimize battery and bandwidth usage:
* **Distress Alerts** have infinite TTL (Time To Live) and are propagated immediately and unconditionally.
* **Telemetry Packets** have a short TTL (e.g. 1 hour) and are dropped if not delivered, preventing buffer overflow with stale position data.

## Consequences

### Positive
* **High Reliability**: Messages are guaranteed to propagate if a physical path exists over time (temporal connectivity).
* **Robustness**: Highly resilient to individual node failures or intermittent links.

### Negative
* **Redundant Traffic**: Multiple copies of the same packet will reach the gateway, requiring deduplication inside the Go backend.
* **Storage Cost**: Nodes must dedicate RAM/Flash buffer memory to store other vessels' packets.
