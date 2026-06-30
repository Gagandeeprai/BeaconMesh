/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VesselType = "Cargo" | "Fishing" | "Tanker" | "Navy" | "Support" | "Distress" | "Passenger" | "Tug" | "BaseStation";
export type VesselStatus = "Distress" | "Active" | "Support" | "Completed" | "Offline" | "LiveAIS";

export interface Vessel {
  id: string;
  name: string;
  type: VesselType;
  status: VesselStatus;
  latitude: number;
  longitude: number;
  speed: number; // knots
  heading: number; // degrees
  peopleOnboard: number;
  cargo?: string;
  destination?: string;
  isLiveAIS?: boolean;
}

export type AlertType = "Engine Failure" | "Medical Emergency" | "Mechanical Issue" | "Fire Hazard" | "Capsized" | "Grounding";
export type AlertStatus = "In Progress" | "Acknowledged" | "Resolved";
export type AlertSeverity = "High" | "Medium" | "Low";

export interface Alert {
  id: string;
  vesselId: string;
  vesselName: string;
  type: AlertType;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  status: AlertStatus;
  severity: AlertSeverity;
  peopleOnboard: number;
  responder?: string;
  etaMin?: number;
  description: string;
}

export type MissionStatus = "Dispatched" | "On Scene" | "Completed" | "Suspended";

export interface Mission {
  id: string;
  alertId: string;
  vesselId: string;
  vesselName: string;
  type: string;
  status: MissionStatus;
  responder: string;
  startTime: string;
  etaMin: number;
  peopleOnboard: number;
  logs: { time: string; text: string }[];
}

export interface WeatherCondition {
  condition: string;
  temp: number;
  windSpeed: number; // km/h
  windDirection: string;
  waveHeight: number; // meters
  wavePeriod?: number; // seconds
  waveDirection?: number; // degrees
  visibility: number; // km
  seaState: string;
  updatedAt?: string;
  advisory?: {
    severity: string;
    message: string;
  };
  status?: "online" | "offline";
}
