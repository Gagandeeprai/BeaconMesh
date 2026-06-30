import { Vessel, Mission, Alert } from "../types";
import { getDistanceKm } from "./dtn";

export function tickMissions(
  vessels: Vessel[],
  missions: Mission[],
  alerts: Alert[],
  deltaTimeSec: number = 1.0,
  onMissionCompleted?: (missionId: string) => void
) {
  missions.forEach((m) => {
    if (m.status !== "Dispatched" && m.status !== "On Scene") return;

    const responder = vessels.find(v => v.name === m.responder || v.id === m.responder);
    const target = vessels.find(v => v.id === m.vesselId);

    if (responder && target) {
      const distance = getDistanceKm(responder.latitude, responder.longitude, target.latitude, target.longitude);

      if (distance < 0.4) {
        // Arrived on scene
        if (m.status === "Dispatched") {
          m.status = "On Scene";
          m.etaMin = 0;
          m.logs.push({
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Rescue unit '${responder.name}' arrived on scene. Coordinates: ${target.latitude.toFixed(4)} N, ${target.longitude.toFixed(4)} E. Commencing stabilization and medical evac protocols.`
          });

          // Sync alert
          const alert = alerts.find(a => a.id === m.alertId);
          if (alert) {
            alert.status = "Acknowledged";
            alert.etaMin = 0;
          }
        }
      } else {
        // Direct heading steering towards distress target
        const dy = target.latitude - responder.latitude;
        const dx = (target.longitude - responder.longitude) * Math.cos((target.latitude * Math.PI) / 180);

        let heading = (Math.atan2(dx, dy) * 180) / Math.PI;
        if (heading < 0) heading += 360;

        responder.heading = heading;
        responder.status = "Support";
        
        // Speed check - ensure it's moving
        if (responder.speed <= 0) {
          responder.speed = 22.0;
        }

        // Calculate dynamic weather-penalized ETA
        // (will be updated when weather updates)
        const speedKmh = responder.speed * 1.852;
        const etaHours = distance / speedKmh;
        const etaMins = Math.max(1, Math.round(etaHours * 60));
        m.etaMin = etaMins;

        const alert = alerts.find(a => a.id === m.alertId);
        if (alert) {
          alert.etaMin = etaMins;
        }
      }
    }
  });
}
