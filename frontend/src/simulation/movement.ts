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

  // Determine regional bounds dynamically based on where the vessel is located
  let minLat = -90.0, maxLat = 90.0, minLon = -180.0, maxLon = 180.0;

  if (vessel.latitude > 12.0 && vessel.latitude < 14.0 && vessel.longitude > 73.0 && vessel.longitude < 75.0) {
    // Mangalore Region Bounds
    minLat = 12.3;
    maxLat = 13.6;
    minLon = 73.3;
    maxLon = 74.95;
  } else if (vessel.latitude > 0.0 && vessel.latitude < 3.0 && vessel.longitude > 102.0 && vessel.longitude < 105.0) {
    // Singapore Region Bounds
    minLat = 1.0;
    maxLat = 1.6;
    minLon = 103.5;
    maxLon = 104.2;
  } else if (vessel.latitude > 30.0 && vessel.latitude < 33.0 && vessel.longitude > 120.0 && vessel.longitude < 123.0) {
    // Shanghai Region Bounds
    minLat = 30.8;
    maxLat = 31.8;
    minLon = 121.2;
    maxLon = 122.3;
  } else if (vessel.latitude > 50.0 && vessel.latitude < 54.0 && vessel.longitude > 3.0 && vessel.longitude < 6.0) {
    // Rotterdam Region Bounds
    minLat = 51.5;
    maxLat = 52.5;
    minLon = 3.8;
    maxLon = 4.8;
  } else if (vessel.latitude > 32.0 && vessel.latitude < 35.0 && vessel.longitude > -120.0 && vessel.longitude < -117.0) {
    // Los Angeles Region Bounds
    minLat = 33.3;
    maxLat = 34.0;
    minLon = -118.8;
    maxLon = -117.8;
  } else if (vessel.latitude > 17.0 && vessel.latitude < 20.0 && vessel.longitude > 71.0 && vessel.longitude < 74.0) {
    // Mumbai Region Bounds
    minLat = 18.5;
    maxLat = 19.3;
    minLon = 72.3;
    maxLon = 73.2;
  }

  // Boundary check to keep simulated vessels within their regional operations sector
  if (vessel.latitude < minLat || vessel.latitude > maxLat || vessel.longitude < minLon || vessel.longitude > maxLon) {
    vessel.heading = (vessel.heading + 180) % 360;
  }
}
