/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vessel, Alert, Mission, WeatherCondition } from "./types";

export const INITIAL_VESSELS: Vessel[] = [
  {
    id: "IND-KA-07-1234",
    name: "Sea Breeze",
    type: "Fishing",
    status: "Distress",
    latitude: 13.2075, // Corresponds to 13° 12.45' N
    longitude: 74.7553, // Corresponds to 74° 45.32' E
    speed: 0,
    heading: 145,
    peopleOnboard: 7,
    cargo: "Trawled Mackerel (2.4 Tons)",
    destination: "Mangalore Fishing Harbor"
  },
  {
    id: "IND-KA-05-5678",
    name: "Maersk Devotion",
    type: "Tanker",
    status: "Distress",
    latitude: 13.0187, // Corresponds to 13° 01.12' N
    longitude: 74.3352, // Corresponds to 74° 20.11' E
    speed: 4,
    heading: 310,
    peopleOnboard: 22,
    cargo: "Crude Oil (45,000 Tons)",
    destination: "Mumbai High"
  },
  {
    id: "IND-KA-08-9101",
    name: "Sagar Samrat",
    type: "Cargo",
    status: "Completed",
    latitude: 12.7500, // Corresponds to 12° 45.00' N
    longitude: 73.8700, // Corresponds to 73° 52.20' E
    speed: 14,
    heading: 195,
    peopleOnboard: 18,
    cargo: "Steel Coils (12,000 Tons)",
    destination: "Colombo Port"
  },
  {
    id: "CGS-SAMUDRA-51",
    name: "CGS Samudra Paheredar",
    type: "Support",
    status: "Support",
    latitude: 13.1100, // En route to Sea Breeze
    longitude: 74.5800,
    speed: 22,
    heading: 295,
    peopleOnboard: 34,
    cargo: "Emergency Response & Rescue Gear",
    destination: "Sea Breeze Intercept"
  },
  {
    id: "CGS-KAVARATTI-52",
    name: "CGS Kavaratti",
    type: "Support",
    status: "Support",
    latitude: 12.9200,
    longitude: 74.6100,
    speed: 26,
    heading: 15,
    peopleOnboard: 28,
    cargo: "Medical Transport Equipment",
    destination: "Maersk Devotion Intercept"
  },
  {
    id: "IND-KA-01-9988",
    name: "Ocean Voyager",
    type: "Cargo",
    status: "Active",
    latitude: 13.3500,
    longitude: 74.1200,
    speed: 16,
    heading: 320,
    peopleOnboard: 15,
    cargo: "Automotive Parts & Electronics",
    destination: "Jawaharlal Nehru Port Trust"
  },
  {
    id: "IND-KA-02-4422",
    name: "Matsya Tara",
    type: "Fishing",
    status: "Active",
    latitude: 12.8500,
    longitude: 74.6500,
    speed: 8,
    heading: 45,
    peopleOnboard: 6,
    cargo: "Sardines & Shrimps",
    destination: "Malpe Fishing Harbor"
  },
  {
    id: "IND-KA-03-3311",
    name: "Pragati Gas Carrier",
    type: "Tanker",
    status: "Active",
    latitude: 12.6100,
    longitude: 74.2200,
    speed: 12,
    heading: 180,
    peopleOnboard: 20,
    cargo: "Liquefied Petroleum Gas (LPG)",
    destination: "Kochi Port"
  },
  {
    id: "IND-KA-04-1155",
    name: "Sagar Kanya",
    type: "Navy",
    status: "Active",
    latitude: 13.0500,
    longitude: 73.6800,
    speed: 15,
    heading: 220,
    peopleOnboard: 45,
    cargo: "Scientific Oceanographic Labs",
    destination: "Lakshadweep Waters"
  },
  {
    id: "IND-KA-06-7788",
    name: "Arabian Knight",
    type: "Fishing",
    status: "Active",
    latitude: 12.7100,
    longitude: 74.5200,
    speed: 10,
    heading: 30,
    peopleOnboard: 5,
    cargo: "Tuna & Mackerel",
    destination: "Malpe Fishing Harbor"
  },
  {
    id: "IND-KA-09-3344",
    name: "Coastal Queen",
    type: "Passenger",
    status: "Active",
    latitude: 12.8800,
    longitude: 74.3100,
    speed: 18,
    heading: 270,
    peopleOnboard: 85,
    cargo: "Passenger Ferry",
    destination: "Mangalore Port"
  },
  {
    id: "IND-KA-10-5566",
    name: "Indian Surveyor",
    type: "Research",
    status: "Active",
    latitude: 13.2800,
    longitude: 73.8200,
    speed: 6,
    heading: 180,
    peopleOnboard: 24,
    cargo: "Oceanographic Equipment",
    destination: "Lakshadweep Survey Grid"
  },
  {
    id: "IND-KA-12-9900",
    name: "Mangalore Express",
    type: "Cargo",
    status: "Active",
    latitude: 12.5600,
    longitude: 74.1100,
    speed: 14,
    heading: 150,
    peopleOnboard: 12,
    cargo: "Containerized Electronics",
    destination: "Cochin Port"
  },
  {
    id: "IND-KA-13-2211",
    name: "Sea Pearl",
    type: "Fishing",
    status: "Active",
    latitude: 13.4200,
    longitude: 74.4500,
    speed: 7,
    heading: 60,
    peopleOnboard: 4,
    cargo: "Shrimp & Lobster",
    destination: "Malpe Fishing Harbor"
  },
  {
    id: "IND-KA-14-3344",
    name: "Coastal Ranger",
    type: "Navy",
    status: "Active",
    latitude: 12.7700,
    longitude: 73.5800,
    speed: 20,
    heading: 340,
    peopleOnboard: 32,
    cargo: "Patrol & Surveillance Gear",
    destination: "Karwar Naval Base"
  },
  {
    id: "IND-KA-15-7789",
    name: "Oil Monarch",
    type: "Tanker",
    status: "Active",
    latitude: 13.5200,
    longitude: 74.0200,
    speed: 11,
    heading: 200,
    peopleOnboard: 19,
    cargo: "Refined Petroleum (22,000 Tons)",
    destination: "New Mangalore Port"
  },
  {
    id: "IND-KA-16-1122",
    name: "Matsya Ratna",
    type: "Fishing",
    status: "Active",
    latitude: 12.6300,
    longitude: 74.7800,
    speed: 9,
    heading: 310,
    peopleOnboard: 6,
    cargo: "Sardines & Anchovies",
    destination: "Mangalore Fishing Harbor"
  },
  {
    id: "IND-KA-17-4455",
    name: "Nethravathi Ferry",
    type: "Passenger",
    status: "Active",
    latitude: 12.9200,
    longitude: 74.4300,
    speed: 15,
    heading: 90,
    peopleOnboard: 60,
    cargo: "Passenger Ferry",
    destination: "Mangalore Port"
  },
  {
    id: "IND-KA-18-6677",
    name: "Deep Explorer",
    type: "Research",
    status: "Active",
    latitude: 13.0800,
    longitude: 73.5500,
    speed: 5,
    heading: 120,
    peopleOnboard: 18,
    cargo: "Subsea Sonar & Sampling Gear",
    destination: "Continental Shelf Study Area"
  },
  {
    id: "IND-KA-19-2233",
    name: "Sagar Tarang",
    type: "Fishing",
    status: "Active",
    latitude: 13.1800,
    longitude: 74.6000,
    speed: 8,
    heading: 45,
    peopleOnboard: 7,
    cargo: "Mixed Catch",
    destination: "Malpe Fishing Harbor"
  },
  {
    id: "IND-KA-20-8899",
    name: "Western Trader",
    type: "Cargo",
    status: "Active",
    latitude: 12.9800,
    longitude: 73.9200,
    speed: 13,
    heading: 350,
    peopleOnboard: 14,
    cargo: "Steel Pipes & Construction Material",
    destination: "Mumbai Port"
  },
  {
    id: "IND-KA-21-6655",
    name: "Mangala Tug",
    type: "Tug",
    status: "Active",
    latitude: 12.9100,
    longitude: 74.8100,
    speed: 4,
    heading: 0,
    peopleOnboard: 3,
    cargo: "Harbor Tow Services",
    destination: "Mangalore Port Approach"
  },
  {
    id: "IND-KA-22-4477",
    name: "Sea Guardian",
    type: "Navy",
    status: "Active",
    latitude: 13.3700,
    longitude: 73.7100,
    speed: 22,
    heading: 160,
    peopleOnboard: 40,
    cargo: "Coastal Defense Armament",
    destination: "Southern Patrol Sector"
  },
  {
    id: "IND-KA-23-9901",
    name: "Blue Marlin",
    type: "Fishing",
    status: "Active",
    latitude: 12.5500,
    longitude: 74.4400,
    speed: 11,
    heading: 80,
    peopleOnboard: 5,
    cargo: "Tuna & Billfish",
    destination: "Mangalore Fishing Harbor"
  },
  {
    id: "IND-KA-11-2020",
    name: "Blue Horizon",
    type: "Cargo",
    status: "Offline",
    latitude: 13.4800,
    longitude: 73.9500,
    speed: 0,
    heading: 0,
    peopleOnboard: 4,
    cargo: "None (Private Leisure Yacht)",
    destination: "Goa Marina"
  }
];

export const INITIAL_ALERTS: Alert[] = [
  {
    id: "IND-KA-07-1234",
    vesselId: "IND-KA-07-1234",
    vesselName: "Sea Breeze",
    type: "Engine Failure",
    time: "12:43 PM",
    location: "13° 12.45' N, 74° 45.32' E",
    latitude: 13.2075,
    longitude: 74.7553,
    status: "In Progress",
    severity: "High",
    peopleOnboard: 7,
    responder: "CGS Samudra Paheredar",
    etaMin: 25,
    description: "Vessel reporting complete failure of its primary diesel engine and secondary generator. Heavy black smoke from the exhaust prior to cut-off. Currently drifting northeast towards rocky reef under moderate swell. Anchor has failed to catch bed. Urgent propulsion assistance or towing required."
  },
  {
    id: "IND-KA-05-5678",
    vesselId: "IND-KA-05-5678",
    vesselName: "Maersk Devotion",
    type: "Medical Emergency",
    time: "11:28 AM",
    location: "13° 01.12' N, 74° 20.11' E",
    latitude: 13.0187,
    longitude: 74.3352,
    status: "Acknowledged",
    severity: "High",
    peopleOnboard: 22,
    responder: "CGS Kavaratti",
    etaMin: 42,
    description: "Second mate suffered a severe crushing injury to his right leg during deck crane operations. Uncontrolled arterial bleeding has been temporarily bound with a tourniquet, but the patient is showing signs of critical hemorrhagic shock, cold extremities, and declining consciousness. Ship doctor requesting immediate medevac."
  },
  {
    id: "IND-KA-08-9101",
    vesselId: "IND-KA-08-9101",
    vesselName: "Sagar Samrat",
    type: "Mechanical Issue",
    time: "09:15 AM",
    location: "12° 45.00' N, 73° 52.20' E",
    latitude: 12.7500,
    longitude: 73.8700,
    status: "Resolved",
    severity: "Medium",
    peopleOnboard: 18,
    responder: "N/A",
    etaMin: 0,
    description: "Experienced a high-temperature alarm on cylinder 4 of the auxiliary generator. Power fluctuated for 10 minutes. Crew successfully bypassed the auxiliary line and engaged the emergency generator pack. Maintenance completed and temperature stabilized at normal parameters. No propulsion loss experienced."
  }
];

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: "MSN-2026-0043",
    alertId: "IND-KA-07-1234",
    vesselId: "IND-KA-07-1234",
    vesselName: "Sea Breeze",
    type: "Towing & Salvage",
    status: "Dispatched",
    responder: "CGS Samudra Paheredar",
    startTime: "12:45 PM",
    etaMin: 25,
    peopleOnboard: 7,
    logs: [
      { time: "12:43 PM", text: "Distress signal received. SOS activated at Coast Guard Operations Center Mangalore." },
      { time: "12:45 PM", text: "Mission MSN-2026-0043 chartered. CGS Samudra Paheredar ordered to intercept Sea Breeze." },
      { time: "12:50 PM", text: "CGS Samudra Paheredar reports underway. Max speed 22 knots, heading 295 degrees." },
      { time: "01:05 PM", text: "Radio communication established with Sea Breeze captain. Swell reported increasing to 1.8 meters. Crew is wearing life jackets." }
    ]
  },
  {
    id: "MSN-2026-0042",
    alertId: "IND-KA-05-5678",
    vesselId: "IND-KA-05-5678",
    vesselName: "Maersk Devotion",
    type: "Medical Evacuation (MEDEVAC)",
    status: "Dispatched",
    responder: "CGS Kavaratti",
    startTime: "11:35 AM",
    etaMin: 42,
    peopleOnboard: 22,
    logs: [
      { time: "11:28 AM", text: "Medical emergency reported. Crane accident on deck with arterial bleed." },
      { time: "11:32 AM", text: "Duty doctor brief completed. SAMU/Navy medical team requested to board responder vessel." },
      { time: "11:35 AM", text: "CGS Kavaratti dispatched with specialized medical kit and Navy surgeon aboard." },
      { time: "12:10 PM", text: "Telemetry checked. CGS Kavaratti traveling at 26 knots, current ETA in 42 mins." }
    ]
  }
];

export const DEFAULT_WEATHER: WeatherCondition = {
  condition: "Moderate Rain",
  temp: 27,
  windSpeed: 18,
  windDirection: "SW",
  waveHeight: 1.6,
  wavePeriod: 8.5,
  waveDirection: 240,
  visibility: 6,
  seaState: "Moderate",
  advisory: "Small fishing vessels should exercise caution due to 1.6 m waves and 18 km/h southwest winds.",
};

export const MOCK_STATIONS = [
  { name: "Mangalore Ops Station", lat: 12.9141, lng: 74.8560, active: true },
  { name: "Malpe Signal Tower", lat: 13.3524, lng: 74.6987, active: true },
  { name: "Karwar Naval Base", lat: 14.8055, lng: 74.1283, active: true }
];

export const EMERGENCY_TYPES = [
  { name: "Engine Failure", icon: "Anchor", severity: "High", color: "text-red-500 hover:bg-red-950/20" },
  { name: "Medical Emergency", icon: "Heart", severity: "High", color: "text-orange-500 hover:bg-orange-950/20" },
  { name: "Mechanical Issue", icon: "Wrench", severity: "Medium", color: "text-yellow-500 hover:bg-yellow-950/20" },
  { name: "Fire Hazard", icon: "Flame", severity: "High", color: "text-red-500 hover:bg-red-950/20" },
  { name: "Capsized", icon: "ShieldAlert", severity: "High", color: "text-red-600 hover:bg-red-950/30" },
  { name: "Grounding", icon: "Compass", severity: "Medium", color: "text-blue-500 hover:bg-blue-950/20" }
];
