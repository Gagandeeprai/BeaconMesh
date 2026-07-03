import { Vessel, Alert, Mission, WeatherCondition } from "../types";
import { updatePosition } from "./movement";
import { computeDTNLinks, Link } from "./dtn";
import { tickMissions } from "./mission";
import { eventBus } from "./eventBus";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export class SimulationEngine {
  public vessels: Vessel[] = [];
  public alerts: Alert[] = [];
  public missions: Mission[] = [];
  public links: Link[] = [];
  
  private lastTickTime: number = Date.now();
  private sosSpawnTimer: number = 0;

  constructor(vessels: Vessel[], alerts: Alert[], missions: Mission[]) {
    this.vessels = [...vessels];
    this.alerts = [...alerts];
    this.missions = [...missions];
  }

  public tick(weather: WeatherCondition, mode: "live" | "hybrid" | "simulation") {
    if (mode === "live") {
      this.links = [];
      return;
    }

    const now = Date.now();
    const dt = (now - this.lastTickTime) / 1000.0;
    this.lastTickTime = now;

    // 1. Move simulated vessels
    this.vessels.forEach((vessel) => {
      if (vessel.isLiveAIS) return;
      updatePosition(vessel, dt);
    });

    // 2. Tick dispatches and steer responders
    tickMissions(this.vessels, this.missions, this.alerts, dt);

    // 3. Compute DTN radio mesh links
    const simVessels = this.vessels.filter(v => !v.isLiveAIS);
    this.links = computeDTNLinks(simVessels, 15.0);

    // 4. Random SOS Spawner (every ~90 seconds in hybrid/simulation modes)
    if (mode === "hybrid" || mode === "simulation") {
      this.sosSpawnTimer += dt;
      if (this.sosSpawnTimer >= 90) {
        this.sosSpawnTimer = 0;
        this.spawnRandomSOS(weather);
      }
    }
  }

  private spawnRandomSOS(weather: WeatherCondition) {
    const candidates = this.vessels.filter(
      (v) => v.type === "Fishing" && v.status === "Active"
    );
    if (candidates.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const types: Array<any> = ["Engine Failure", "Medical Emergency", "Mechanical Issue", "Fire Hazard", "Capsized", "Grounding"];
    const descriptions: Record<string, string> = {
      "Engine Failure": "Complete failure of primary propulsion. Drifting coordinates.",
      "Medical Emergency": "Crew member suffered crushing chest pain. EVAC required.",
      "Mechanical Issue": "Water pump malfunction, flooding deck.",
      "Fire Hazard": "Galley fire contained, electrical wiring damaged.",
      "Capsized": "Hit rogue swell, vessel listing heavily.",
      "Grounding": "Hull struck shoal. Structural damage suspected."
    };

    const type = types[Math.floor(Math.random() * types.length)];
    const desc = descriptions[type];

    this.triggerSOS(chosen.id, type, desc, weather);
  }

  public async triggerSOS(vesselId: string, type: any, description: string, weather?: WeatherCondition) {
    const vessel = this.vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    // Set to distress
    vessel.status = "Distress";
    vessel.speed = 0;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedLocation = `${vessel.latitude.toFixed(4)}° N, ${vessel.longitude.toFixed(4)}° E`;

    const newAlert: Alert = {
      id: vessel.id,
      vesselId: vessel.id,
      vesselName: vessel.name,
      type,
      time: timestamp,
      location: formattedLocation,
      latitude: vessel.latitude,
      longitude: vessel.longitude,
      status: "In Progress",
      severity: "High",
      peopleOnboard: vessel.peopleOnboard,
      description
    };

    this.alerts = [newAlert, ...this.alerts];
    eventBus.publish("SOSCreated", newAlert);

    // Call optimizer
    await this.assignOptimalResponder(newAlert, weather);
  }

  private async assignOptimalResponder(alert: Alert, weather?: WeatherCondition) {
    const activeResponders = this.vessels.filter(
      (v) => v.status === "Support" && !this.missions.some((m) => m.responder === v.name && m.status !== "Completed")
    );

    if (activeResponders.length === 0) {
      console.warn("No available responders for SOS.");
      return;
    }

    const payload = {
      sos_coords: { latitude: alert.latitude, longitude: alert.longitude },
      responders: activeResponders.map((r) => ({
        id: r.id,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        speed_knots: r.speed || 25.0
      })),
      weather: weather ? {
        waveHeight: weather.waveHeight,
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        visibility: weather.visibility
      } : {
        waveHeight: 1.0,
        windSpeed: 10.0,
        windDirection: "N",
        visibility: 10.0
      }
    };

    let optimizationResult: any = null;

    try {
      const res = await fetch(`${API_BASE}/api/v1/optimize/rescue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        optimizationResult = await res.json();
      }
    } catch (err) {
      console.warn("OR-Tools Optimizer offline. Running Javascript solver fallback.");
    }

    // Run fallback if optimization fails
    if (!optimizationResult || optimizationResult.error) {
      optimizationResult = this.runFallbackSolver(alert, activeResponders, weather);
    }

    if (optimizationResult && !optimizationResult.error) {
      const missionId = `MSN-2026-${Math.floor(Math.random() * 9000) + 1000}`;
      const newMission: Mission = {
        id: missionId,
        alertId: alert.id,
        vesselId: alert.vesselId,
        vesselName: alert.vesselName,
        type: alert.type === "Medical Emergency" ? "Medical Evacuation (MEDEVAC)" : "Towing & Search-and-Rescue (SAR)",
        status: "Dispatched",
        responder: optimizationResult.vessel_name,
        startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        etaMin: Math.round(optimizationResult.eta_minutes),
        peopleOnboard: alert.peopleOnboard,
        logs: [
          {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Command center routed responder '${optimizationResult.vessel_name}' to distress target. Calculated ETA: ${Math.round(optimizationResult.eta_minutes)} mins. Weather multiplier: ${optimizationResult.weather_multiplier || 1.0}x.`
          }
        ]
      };

      this.missions = [newMission, ...this.missions];
      
      // Update Alert state
      alert.responder = optimizationResult.vessel_name;
      alert.etaMin = Math.round(optimizationResult.eta_minutes);
      alert.status = "Acknowledged";

      // Set responder destination
      const responder = this.vessels.find(v => v.id === optimizationResult.vessel_id || v.name === optimizationResult.vessel_name);
      if (responder) {
        responder.destination = `${alert.vesselName} Intercept`;
        responder.status = "Support";
      }

      eventBus.publish("MissionAssigned", newMission);
    }
  }

  private runFallbackSolver(alert: Alert, responders: Vessel[], weather?: WeatherCondition): any {
    let bestResponder: Vessel | null = null;
    let minTime = Infinity;
    let bestDist = 0;
    
    let multiplier = 1.0;
    if (weather) {
      if (weather.waveHeight > 4.0 || weather.windSpeed > 60 || weather.visibility < 0.5) {
        return { error: "Operations blocked by severe weather." };
      }
      if (weather.waveHeight > 1.2) {
        multiplier += (weather.waveHeight - 1.2) * 0.15;
      }
      if (weather.windSpeed > 15) {
        multiplier += ((weather.windSpeed - 15) / 10) * 0.05;
      }
      if (weather.visibility < 2.0) {
        multiplier += 0.30;
      }
    }

    responders.forEach((r) => {
      const R = 6371.0;
      const dLat = ((alert.latitude - r.latitude) * Math.PI) / 180;
      const dLon = ((alert.longitude - r.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((r.latitude * Math.PI) / 180) *
          Math.cos((alert.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;

      const speedKnots = r.speed || 25.0;
      const effSpeedKmh = (speedKnots / multiplier) * 1.852;
      const travelTimeMin = (dist / effSpeedKmh) * 60;

      if (travelTimeMin < minTime) {
        minTime = travelTimeMin;
        bestResponder = r;
        bestDist = dist;
      }
    });

    if (!bestResponder) return { error: "No responders found." };

    return {
      vessel_id: (bestResponder as Vessel).id,
      vessel_name: (bestResponder as Vessel).name,
      eta_minutes: minTime,
      distance_km: bestDist,
      weather_multiplier: multiplier
    };
  }
}
