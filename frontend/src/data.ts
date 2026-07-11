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
    status: "Active",
    latitude: 13.2075, // Corresponds to 13° 12.45' N
    longitude: 74.6553, // Corresponds to 74° 39.32' E
    speed: 8,
    heading: 145,
    peopleOnboard: 7,
    cargo: "Trawled Mackerel (2.4 Tons)",
    destination: "Mangalore Fishing Harbor"
  },
  {
    id: "IND-KA-05-5678",
    name: "Maersk Devotion",
    type: "Tanker",
    status: "Active",
    latitude: 13.0187, // Corresponds to 13° 01.12' N
    longitude: 74.3352, // Corresponds to 74° 20.11' E
    speed: 12,
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
    longitude: 74.7500,
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
  },
  {
    id: "AIS-CARGO-GP01",
    name: "Singa Pioneer",
    type: "Cargo",
    status: "Active",
    latitude: 1.22,
    longitude: 103.88,
    speed: 12.5,
    heading: 90,
    peopleOnboard: 24,
    cargo: "Containers",
    destination: "Port of Singapore"
  },
  {
    id: "AIS-TANK-GP02",
    name: "Merlion Ocean",
    type: "Tanker",
    status: "Active",
    latitude: 1.18,
    longitude: 103.78,
    speed: 10.0,
    heading: 270,
    peopleOnboard: 28,
    cargo: "Crude Oil",
    destination: "Port of Singapore"
  },
  {
    id: "AIS-CARGO-GP03",
    name: "Yangtze Fortune",
    type: "Cargo",
    status: "Active",
    latitude: 31.25,
    longitude: 121.75,
    speed: 15.2,
    heading: 110,
    peopleOnboard: 20,
    cargo: "Electronics",
    destination: "Port of Shanghai"
  },
  {
    id: "AIS-CARGO-GP04",
    name: "Euro Carrier",
    type: "Cargo",
    status: "Active",
    latitude: 51.98,
    longitude: 4.22,
    speed: 14.0,
    heading: 240,
    peopleOnboard: 18,
    cargo: "Machinery",
    destination: "Port of Rotterdam"
  },
  {
    id: "AIS-CARGO-GP05",
    name: "Pacific Sovereign",
    type: "Cargo",
    status: "Active",
    latitude: 33.68,
    longitude: -118.35,
    speed: 16.5,
    heading: 150,
    peopleOnboard: 22,
    cargo: "General Cargo",
    destination: "Port of Los Angeles"
  },
  {
    id: "AIS-CARGO-GP06",
    name: "Gateway Voyager",
    type: "Cargo",
    status: "Active",
    latitude: 18.90,
    longitude: 72.78,
    speed: 13.0,
    heading: 260,
    peopleOnboard: 16,
    cargo: "Steel Billets",
    destination: "Mumbai Port"
  }
];

export const INITIAL_ALERTS: Alert[] = [];

export const INITIAL_MISSIONS: Mission[] = [];

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
  advisory: { severity: "Caution", message: "Small fishing vessels should exercise caution due to 1.6 m waves and 18 km/h southwest winds." },
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
