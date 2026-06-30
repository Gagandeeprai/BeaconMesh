import { Vessel } from "../types";

export interface Waypoint {
  latitude: number;
  longitude: number;
}

// Convert speed in knots to lat/lon change per second
// 1 knot = 1.852 km/h = 0.5144 m/s
// 1 degree latitude = 111,120 meters
// 1 degree longitude = 111,120 * cos(lat) meters
export function updatePosition(vessel: Vessel, deltaTimeSec: number = 1.0) {
  if (vessel.status === "Offline" || vessel.speed <= 0) return;

  const speedMps = vessel.speed * 0.51444;
  const distanceMoved = speedMps * deltaTimeSec;

  // Wander pattern (simple random walk for fishing vessels)
  if (vessel.type === "Fishing" && vessel.status === "Active") {
    // Wander direction change
    if (Math.random() < 0.15) {
      vessel.heading = (vessel.heading + (Math.random() * 30 - 15) + 360) % 360;
    }
    // Random speed change
    if (Math.random() < 0.10) {
      vessel.speed = Math.max(3.0, Math.min(10.0, vessel.speed + (Math.random() * 2 - 1)));
    }
  }

  // Convert heading to radians (0 is North, 90 is East, etc.)
  const headingRad = (vessel.heading * Math.PI) / 180;
  const dy = distanceMoved * Math.cos(headingRad);
  const dx = distanceMoved * Math.sin(headingRad);

  const latChange = dy / 111120.0;
  const lonChange = dx / (111120.0 * Math.cos((vessel.latitude * Math.PI) / 180));

  vessel.latitude += latChange;
  vessel.longitude += lonChange;

  // Boundary check to keep simulated vessels within the Mangalore area (lat 12.3 to 13.6, lon 73.3 to 74.95)
  if (vessel.latitude < 12.3 || vessel.latitude > 13.6 || vessel.longitude < 73.3 || vessel.longitude > 74.95) {
    vessel.heading = (vessel.heading + 180) % 360;
  }
}
