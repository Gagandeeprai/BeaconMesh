# Product Requirement Document (PRD)

## 1. Overview
BeaconMesh is an offline-first maritime emergency coordination platform designed for small fishing vessels operating beyond cellular coverage. Small fishing vessels frequently operate in remote ocean areas without cellular/internet access. In the event of a vessel breakdown, medical emergency, or sinking, alerting rescue authorities is challenging.

BeaconMesh addresses this by leveraging a mesh-networking architecture. Nearby fishing vessels act as relay nodes, carrying and forwarding distress signals and telemetry packets via simulated low-bandwidth channels (LoRa, SMS, satellite transceivers) until a message reaches a gateway node with active cellular or internet connectivity. Coastal Search and Rescue (SAR) centers can then deploy and optimize rescue routing using optimized coordinate guidance.

## 2. Target Audience & Personas
* **Fishermen (Vessel Operators)**: Operating small vessels, equipped with low-cost hardware (e.g., LoRa transceivers, basic GPS). Need simple, automated SOS trigger mechanisms, and a basic dashboard to view weather alerts or nearby vessels.
* **Search and Rescue (SAR) Coordinators**: Located at coastal command centers. They have high-speed internet, monitor the Mapbox-based visual dashboard, coordinate rescue resources, and launch optimized rescue routing plans.
* **Rescue Vessel Operators**: Captains of Coast Guard or volunteer rescue ships. They receive optimized routing targets to reach distressed vessels quickly.

## 3. Core Functional Requirements
### F-1: Vessel Telemetry Tracking
* Vessels must periodically log GPS coordinates, heading, speed, battery, and distress status.
* When offline, telemetry is saved locally and periodically broadcasted to nearby nodes.

### F-2: Mesh Network SOS Propagation
* If a vessel triggers an SOS (manually or via sensor triggers like capsize), a high-priority distress packet is generated.
* The message must propagate node-by-node (vessel-to-vessel) using a store-carry-forward epidemic routing protocol.
* Once any vessel in the mesh moves within range of a coastal base station or cellular network, the SOS message is instantly uploaded to the central database.

### F-3: Search & Rescue (SAR) Routing Optimization
* Using Google OR-Tools, the platform must optimize the paths of available rescue vessels to reach distressed vessels.
* Constraints: Rescue vessel speed, fuel capacity, patient occupancy capacity, distress priority levels, and sea state coefficients.
* Output: Visualized optimized routes for rescue vessels on the dispatcher map.

### F-4: Simulation Engine
* A Python-based simulation engine to model:
  * Vessel movements (synthetic trajectories based on typical fishing patterns).
  * Radio transceiver ranges (e.g., LoRa line-of-sight propagation, path loss, and message collision).
  * Gateway upload mechanisms.
  * Triggering simulated emergencies.

### F-5: Coastal Monitoring Dashboard
* A web interface using Mapbox GL JS to display:
  * Known positions of all vessels (with last-seen timestamps and relay path history).
  * Active emergency alerts.
  * Live updates of optimization routes generated for rescue missions.

## 4. Non-Functional Requirements
* **Offline-First Resilience**: All vessel software must function completely offline. Database sync should resume immediately upon mesh connection.
* **Data Security & Integrity**: Every distress packet must be cryptographically signed by the originating vessel's private key to prevent spoofing or false distress alarms.
* **Low Bandwidth Optimization**: Telemetry and distress payloads must be serialized using a compact binary format (e.g., Protocol Buffers or custom binary packing) to fit within LoRa's small MTU (Maximum Transmission Unit ~222 bytes).
* **Fault Tolerance**: No single point of failure in the mesh. The protocol must run decentralized.
