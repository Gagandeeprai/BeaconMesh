import { Vessel } from "../types";

export interface Link {
  fromId: string;
  toId: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  status: "active" | "routing";
}

export interface PacketPulse {
  id: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  progress: number; // 0 to 1
  vesselId: string;
}

// Calculate Haversine distance in km
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function computeDTNLinks(vessels: Vessel[], rangeKm: number = 15.0): Link[] {
  const links: Link[] = [];
  const n = vessels.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v1 = vessels[i];
      const v2 = vessels[j];
      if (v1.status === "Offline" || v2.status === "Offline") continue;
      
      const distance = getDistanceKm(v1.latitude, v1.longitude, v2.latitude, v2.longitude);
      if (distance <= rangeKm) {
        links.push({
          fromId: v1.id,
          toId: v2.id,
          fromCoords: [v1.latitude, v1.longitude],
          toCoords: [v2.latitude, v2.longitude],
          status: (v1.status === "Distress" || v2.status === "Distress") ? "routing" : "active"
        });
      }
    }
  }
  return links;
}
