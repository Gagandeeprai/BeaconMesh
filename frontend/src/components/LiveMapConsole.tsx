/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Compass, Search, Eye, Filter, Info, ShieldAlert, Bell,
  Layers, Anchor, Activity, Wind, EyeOff, Radio, RefreshCw,
  ZoomIn, ZoomOut, AlertTriangle, CloudRain, ShieldCheck, Ship,
  Maximize2, X, Star, Globe, ChevronDown, ChevronUp, Play, Pause
} from "lucide-react";
import maplibregl from "maplibre-gl";
import { Vessel, Alert, WeatherCondition } from "../types";
import { resolveVerifiedVesselMedia } from "../media/vesselMedia";

interface LiveMapConsoleProps {
  vessels: Vessel[];
  alerts: Alert[];
  weather: WeatherCondition;
  mode: "live" | "hybrid" | "simulation";
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel | null) => void;
  setCurrentTab?: (tab: string) => void;
}

interface PortDetails {
  name: string;
  country: string;
  lat: number;
  lon: number;
  code: string;
  arriving: number;
  departing: number;
  anchored: number;
}

const GLOBAL_PORTS: PortDetails[] = [
  { name: "Port of Singapore", country: "Singapore", lat: 1.26, lon: 103.83, code: "SGPIN", arriving: 42, departing: 38, anchored: 85 },
  { name: "Port of Shanghai", country: "China", lat: 31.23, lon: 121.50, code: "CNSHA", arriving: 95, departing: 88, anchored: 140 },
  { name: "Port of Rotterdam", country: "Netherlands", lat: 51.92, lon: 4.48, code: "NLRTM", arriving: 28, departing: 26, anchored: 34 },
  { name: "Port of Los Angeles", country: "USA", lat: 33.74, lon: -118.26, code: "USLAX", arriving: 19, departing: 15, anchored: 22 },
  { name: "Port of Houston", country: "USA", lat: 29.75, lon: -95.36, code: "USHOU", arriving: 24, departing: 21, anchored: 29 },
  { name: "Port of Suez", country: "Egypt", lat: 29.96, lon: 32.54, code: "EGSUZ", arriving: 32, departing: 31, anchored: 45 },
  { name: "Mumbai Port Trust", country: "India", lat: 18.94, lon: 72.85, code: "INBOM", arriving: 15, departing: 12, anchored: 18 },
  { name: "New Mangalore Port", country: "India", lat: 12.93, lon: 74.82, code: "INNML", arriving: 6, departing: 4, anchored: 8 }
];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function LiveMapConsole({
  vessels,
  alerts,
  weather,
  mode,
  selectedVessel,
  onSelectVessel,
  setCurrentTab
}: LiveMapConsoleProps) {
  // Inject MapLibre CSS on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.css";
    document.head.appendChild(link);
    return () => {
      const existing = document.head.querySelector(`link[href="${link.href}"]`);
      if (existing) {
        document.head.removeChild(existing);
      }
    };
  }, []);

  const [globalVessels, setGlobalVessels] = useState<Vessel[]>([]);
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const [selectedPort, setSelectedPort] = useState<PortDetails | null>(null);
  const [hoverCoords, setHoverCoords] = useState<[number, number]>([24.9336, 67.0821]);
  const [currentTime, setCurrentTime] = useState<string>("12:34:21");
  const [playLive, setPlayLive] = useState<boolean>(true);

  const [zones, setZones] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    benchmarkActive: false,
    throughput: 0,
    avgLatencyUs: 0,
    activeAlertsCount: 0
  });

  // Accordion Toggles
  const [expandedSections, setExpandedSections] = useState({
    shipTypes: true,
    countryFlag: false,
    destination: false,
    status: false
  });

  const toggleSection = (sec: "shipTypes" | "countryFlag" | "destination" | "status") => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Filters state
  const [filters, setFilters] = useState({
    cargo: true,
    tankers: true,
    passenger: true,
    tug: true,
    fishing: true,
    research: true,
    military: true,
    anchored: false,
    underway: false
  });
  const [speedLimit, setSpeedLimit] = useState<number>(0);
  const [lengthLimit, setLengthLimit] = useState<number>(0);
  const [flagFilter, setFlagFilter] = useState<string>("");
  const [destFilter, setDestFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Map overlays state
  const [showLayers, setShowLayers] = useState<boolean>(false);
  const [layers, setLayers] = useState({
    vesselTraffic: true,
    vesselLabels: true,
    vesselTrails: true,
    shippingLanes: true,
    majorPorts: true,
    weather: true,
    wind: true,
    waves: true,
    bathymetry: true,
    coastlines: true
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Generate global traffic list once
  useEffect(() => {
    const AREAS = [
      { name: "Malacca Strait", lat: 2.5, lon: 101.5, count: 25 },
      { name: "Suez Canal", lat: 30.5, lon: 32.4, count: 20 },
      { name: "Panama Canal", lat: 9.1, lon: -79.7, count: 15 },
      { name: "English Channel", lat: 50.1, lon: -1.5, count: 25 },
      { name: "Gibraltar", lat: 36.0, lon: -5.4, count: 18 },
      { name: "Strait of Hormuz", lat: 26.6, lon: 56.3, count: 18 },
      { name: "Tokyo Bay", lat: 35.3, lon: 139.9, count: 15 },
      { name: "Cape of Good Hope", lat: -34.5, lon: 18.5, count: 15 },
      { name: "US West Coast", lat: 34.0, lon: -120.0, count: 20 },
      { name: "US East Coast", lat: 35.0, lon: -74.5, count: 20 },
      { name: "Mangalore Coast", lat: 12.9, lon: 74.3, count: 10 },
      { name: "Mumbai Corridor", lat: 18.9, lon: 72.5, count: 12 }
    ];

    const generated: Vessel[] = [];
    let idx = 1000;

    const names = [
      "Atlantic Star", "Pacific Crest", "Ocean Titan", "Northern Light", "Symphony", "Southern Cross",
      "Cosco Fortune", "Maersk Majestic", "Ever Grand", "Sea Breeze", "Pacific Navigator", "CMA CGM Force",
      "Global Enterprise", "Polaris", "Triton", "Orion", "Sirius", "Altair", "Vega", "Capella"
    ];
    const types: Array<any> = ["Cargo", "Tanker", "Passenger", "Tug", "Research", "Military"];
    const flags = ["Panama", "Liberia", "Singapore", "Marshall Islands", "Bahamas", "India", "USA", "UK"];
    const destinations = ["Rotterdam", "Singapore", "Shanghai", "Los Angeles", "Houston", "Mumbai", "Suez", "Tokyo"];

    AREAS.forEach(area => {
      for (let i = 0; i < area.count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const flag = flags[Math.floor(Math.random() * flags.length)];
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        const name = `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 90) + 10}`;
        const speed = Math.max(3.0, Math.min(22.0, Math.random() * 19 + 3));
        const heading = Math.floor(Math.random() * 360);

        // Perturb coordinates
        const lat = area.lat + (Math.random() * 2.5 - 1.25);
        const lon = area.lon + (Math.random() * 2.5 - 1.25);

        generated.push({
          id: `AIS-${type.toUpperCase()}-${idx++}`,
          name,
          type,
          status: speed > 0.5 ? "Active" : "Offline",
          latitude: lat,
          longitude: lon,
          speed,
          heading,
          peopleOnboard: Math.floor(Math.random() * 30) + 10,
          cargo: type === "Tanker" ? "Crude Oil (52,000 Tons)" : type === "Cargo" ? "Containers" : "General Specs",
          destination: dest,
          isLiveAIS: true
        });
      }
    });

    setGlobalVessels(generated);
  }, []);

  // Time updater
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString("en-GB", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch pre-defined zones from Go backend processing engine
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/zones`);
        if (res.ok) {
          const data = await res.json();
          setZones(data);
        }
      } catch (err) {
        console.error("Failed to fetch zones:", err);
      }
    };
    fetchZones();
  }, []);

  // Poll metrics from Go backend processing engine
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/processing/metrics`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        // ignore offline
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleBenchmark = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/processing/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: !metrics.benchmarkActive })
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(prev => ({ ...prev, benchmarkActive: data.benchmarkActive }));
      }
    } catch (err) {
      console.error("Failed to toggle benchmark:", err);
    }
  };

  // Sync zones geojson on load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || zones.length === 0) return;

    const updateZonesData = () => {
      const source = map.getSource("geojson-zones") as maplibregl.GeoJSONSource;
      if (source) {
        const features = zones.map(z => {
          const coords = z.boundary.map((c: any) => [c.longitude, c.latitude]);
          if (coords.length > 0) {
            coords.push([...coords[0]]); // close loop
          }
          return {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [coords]
            },
            properties: {
              id: z.id,
              name: z.name,
              type: z.type,
              description: z.description
            }
          };
        });
        source.setData({
          type: "FeatureCollection",
          features: features as any
        });
      }
    };

    if (map.loaded()) {
      updateZonesData();
    } else {
      map.on("load", updateZonesData);
    }
  }, [zones]);

  // Coordinates updates ticker
  useEffect(() => {
    if (mode === "simulation" || !playLive) return;

    const interval = setInterval(() => {
      setGlobalVessels(prev => {
        return prev.map(v => {
          const speedDeg = (v.speed * 0.51444) / 111000.0;
          const rad = (v.heading * Math.PI) / 180.0;
          const dy = speedDeg * Math.cos(rad);
          const dx = speedDeg * Math.sin(rad) / Math.cos(v.latitude * Math.PI / 180.0);

          let nextLat = v.latitude + dy;
          let nextLon = v.longitude + dx;

          if (nextLon < -180) nextLon += 360;
          if (nextLon > 180) nextLon -= 360;

          if (nextLat < -75) {
            nextLat = -75;
            v.heading = (v.heading + 180) % 360;
          }
          if (nextLat > 75) {
            nextLat = 75;
            v.heading = (v.heading + 180) % 360;
          }

          setTrails(t => {
            const list = t[v.id] || [];
            const last = list[list.length - 1];
            if (!last || Math.abs(last[0] - nextLat) > 0.001 || Math.abs(last[1] - nextLon) > 0.001) {
              const updated = [...list, [nextLat, nextLon] as [number, number]];
              if (updated.length > 15) updated.shift();
              return { ...t, [v.id]: updated };
            }
            return t;
          });

          return { ...v, latitude: nextLat, longitude: nextLon };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, playLive]);

  const combinedList = mode === "live" ? globalVessels : mode === "simulation" ? vessels.filter(v => !v.isLiveAIS) : [...vessels.filter(v => !v.isLiveAIS), ...globalVessels];

  const getVesselDetails = (v: Vessel) => {
    const num = v.id.replace(/\D/g, "") || "312";
    const mmsi = `41900${num}`;
    const imo = `9${num}11`;
    let flag = "Panama";
    let draft = "11.2 m";
    let length = "220 m";
    let beam = "32 m";

    if (v.type === "Cargo") {
      flag = "Liberia";
      draft = "12.5 m";
      length = "260 m";
      beam = "36 m";
    } else if (v.type === "Tanker") {
      flag = "Marshall Islands";
      draft = "14.8 m";
      length = "290 m";
      beam = "45 m";
    } else if (v.type === "Passenger") {
      flag = "Bahamas";
      draft = "8.2 m";
      length = "315 m";
      beam = "42 m";
    } else if (v.type === "Tug") {
      flag = "Singapore";
      draft = "4.5 m";
      length = "32 m";
      beam = "10 m";
    } else if (v.type === "Research") {
      flag = "USA";
      draft = "7.8 m";
      length = "85 m";
      beam = "16 m";
    } else if (v.type === "Military") {
      flag = "UK";
      draft = "9.5 m";
      length = "155 m";
      beam = "20 m";
    }

    return {
      name: v.name,
      id: v.id,
      mmsi,
      imo,
      type: v.type,
      flag,
      length,
      beam,
      draft,
      speed: `${v.speed.toFixed(1)} kn`,
      course: `${v.heading.toFixed(0)}°`,
      heading: `${v.heading.toFixed(0)}°`,
      status: v.speed > 0.5 ? "Underway using engine" : "Anchored",
      destination: v.destination || "Rotterdam Terminal",
      eta: "30-Jun 18:45 UTC",
      latitude: v.latitude.toFixed(5),
      longitude: v.longitude.toFixed(5),
      lastUpdate: "Just now"
    };
  };

  const filteredList = combinedList.filter(v => {
    if (v.type === "Cargo" && !filters.cargo) return false;
    if (v.type === "Tanker" && !filters.tankers) return false;
    if (v.type === "Passenger" && !filters.passenger) return false;
    if (v.type === "Tug" && !filters.tug) return false;
    if (v.type === "Fishing" && !filters.fishing) return false;
    if (v.type === "Research" && !filters.research) return false;
    if (v.type === "Military" && !filters.military) return false;

    const isMoving = v.speed > 0.5;
    if (filters.anchored && !filters.underway && isMoving) return false;
    if (filters.underway && !filters.anchored && !isMoving) return false;

    if (v.speed < speedLimit) return false;

    const details = getVesselDetails(v);
    const lengthNum = parseFloat(details.length);
    if (!isNaN(lengthNum) && lengthLimit > 0 && lengthNum < lengthLimit) return false;

    if (flagFilter && !details.flag.toLowerCase().includes(flagFilter.toLowerCase())) return false;
    if (destFilter && !details.destination.toLowerCase().includes(destFilter.toLowerCase())) return false;
    if (statusFilter && !details.status.toLowerCase().includes(statusFilter.toLowerCase())) return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        details.mmsi.includes(q) ||
        details.imo.includes(q) ||
        details.destination.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      zoom: 2.2,
      center: [15.0, 15.0],
      minZoom: 1.5,
      maxZoom: 16,
      style: {
        version: 8,
        sources: {
          "cartodb-dark": {
            "type": "raster",
            "tiles": [
              "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            ],
            "tileSize": 256
          }
        },
        layers: [
          {
            "id": "cartodb-dark-layer",
            "type": "raster",
            "source": "cartodb-dark",
            "minzoom": 0,
            "maxzoom": 21
          }
        ]
      }
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource("geojson-zones", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "geojson-zones",
        paint: {
          "fill-color": [
            "match",
            ["get", "type"],
            "marine_protected",   "rgba(16, 185, 129, 0.12)",  // green
            "fishing-ban",        "rgba(16, 185, 129, 0.08)",
            "military",           "rgba(239, 68, 68, 0.10)",   // red
            "military-restricted","rgba(239, 68, 68, 0.08)",
            "shipping_lane",      "rgba(59, 130, 246, 0.08)",  // blue
            "port-channel",       "rgba(234, 179, 8, 0.06)",
            "restricted",         "rgba(245, 158, 11, 0.10)",  // amber
            "rgba(148, 163, 184, 0.06)"
          ],
          "fill-opacity": 0.9
        }
      });

      // Hardcoded Karnataka coastal fallback zones (shown when backend is offline)
      const karnatakaFallbackZones = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            geometry: { type: "Polygon" as const, coordinates: [[[73.6, 12.5], [73.6, 12.8], [74.0, 12.8], [74.0, 12.5], [73.6, 12.5]]] },
            properties: { id: "fb-mpa-1", name: "Gulf of Mannar Marine Protected Area", type: "marine_protected", description: "Marine Protected Area" }
          },
          {
            type: "Feature" as const,
            geometry: { type: "Polygon" as const, coordinates: [[[74.0, 14.6], [74.0, 14.9], [74.3, 14.9], [74.3, 14.6], [74.0, 14.6]]] },
            properties: { id: "fb-mil-1", name: "Karwar Naval Base Exclusion Zone", type: "military", description: "Military Restricted Zone" }
          },
          {
            type: "Feature" as const,
            geometry: { type: "Polygon" as const, coordinates: [[[73.8, 12.9], [74.8, 12.9], [74.8, 13.0], [73.8, 13.0], [73.8, 12.9]]] },
            properties: { id: "fb-lane-1", name: "West Coast Main Shipping Lane", type: "shipping_lane", description: "Primary maritime traffic corridor" }
          },
          {
            type: "Feature" as const,
            geometry: { type: "Polygon" as const, coordinates: [[[74.1, 13.3], [74.1, 13.5], [74.4, 13.5], [74.4, 13.3], [74.1, 13.3]]] },
            properties: { id: "fb-rst-1", name: "Malpe Coastal Restricted Zone", type: "restricted", description: "Environmental protection zone" }
          }
        ]
      };
      (map.getSource("geojson-zones") as maplibregl.GeoJSONSource)?.setData(karnatakaFallbackZones as any);

      map.addLayer({
        id: "zones-border",
        type: "line",
        source: "geojson-zones",
        paint: {
          "line-color": [
            "match",
            ["get", "type"],
            "marine_protected",    "#10b981",
            "fishing-ban",         "#06b6d4",
            "military",            "#ef4444",
            "military-restricted", "#ef4444",
            "shipping_lane",       "#3b82f6",
            "port-channel",        "#eab308",
            "restricted",          "#f59e0b",
            "#94a3b8"
          ],
          "line-width": 1.5,
          "line-opacity": 0.6,
          "line-dasharray": ["match", ["get", "type"], "shipping_lane", ["literal", [4, 3]], ["literal", [1]]]
        }
      });

      map.addSource("geojson-vessels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        },
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 50
      });

      // Cluster circle layer
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "geojson-vessels",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "rgba(13, 148, 136, 0.65)", // cargo type cyan/teal
            50,
            "rgba(245, 158, 11, 0.7)",  // tanker gold
            150,
            "rgba(139, 92, 246, 0.75)"  // passenger violet
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15,
            50,
            20,
            150,
            26
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#020a14"
        }
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "geojson-vessels",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 10
        },
        paint: {
          "text-color": "#ffffff"
        }
      });

      // Unclustered point layer colored exactly like the screenshot:
      // Cargo=Green, Tankers=Red, Passenger=Blue, Tugs=Yellow, Fishing=Cyan, Research=Purple, Military=Pink
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "geojson-vessels",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "type"],
            "Cargo", "#22c55e",
            "Tanker", "#ef4444",
            "Passenger", "#3b82f6",
            "Tug", "#eab308",
            "Fishing", "#06b6d4",
            "Research", "#a855f7",
            "Military", "#ec4899",
            "#0ea5e9"
          ],
          "circle-radius": 5.5,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#020a14"
        }
      });

      // Vessel name labels layer (hidden by default, toggled via Layers panel)
      map.addLayer({
        id: "vessel-labels",
        type: "symbol",
        source: "geojson-vessels",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 9,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "visibility": "none"
        },
        paint: {
          "text-color": "#94a3b8",
          "text-halo-color": "#020a14",
          "text-halo-width": 1.5
        }
      });

      // Vessel trails layer (hidden by default, toggled via Layers panel)
      map.addSource("geojson-trails", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "vessel-trails",
        type: "line",
        source: "geojson-trails",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          "visibility": "none"
        },
        paint: {
          "line-color": "#00e5ff",
          "line-width": 1.5,
          "line-opacity": 0.45
        }
      });

      map.addSource("geojson-ports", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: GLOBAL_PORTS.map(p => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [p.lon, p.lat]
            },
            properties: { ...p }
          }))
        }
      });

      map.addLayer({
        id: "ports-layer",
        type: "circle",
        source: "geojson-ports",
        paint: {
          "circle-color": "#a855f7",
          "circle-radius": 5,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#000000"
        }
      });

      map.on("mousemove", (e) => {
        setHoverCoords([e.lngLat.lat, e.lngLat.lng]);
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource("geojson-vessels") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom || 5
          });
        });
      });

      map.on("click", "ports-layer", (e) => {
        const props = e.features[0].properties as PortDetails;
        setSelectedPort(props);
      });

      map.on("click", "unclustered-point", (e) => {
        const props = e.features[0].properties;
        const matched = combinedList.find(x => x.id === props.id);
        if (matched) onSelectVessel(matched);
      });

      map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update map layer visibilities
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const toggleLayer = (id: string, visible: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    };

    toggleLayer("unclustered-point", layers.vesselTraffic);
    toggleLayer("clusters", layers.vesselTraffic);
    toggleLayer("cluster-count", layers.vesselTraffic);
    toggleLayer("ports-layer", layers.majorPorts);
    toggleLayer("vessel-labels", layers.vesselLabels);
    toggleLayer("vessel-trails", layers.vesselTrails);
  }, [layers]);

  // Feed filtered vessels list
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("geojson-vessels") as maplibregl.GeoJSONSource;
    if (!source) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: filteredList.map(v => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [v.longitude, v.latitude]
        },
        properties: {
          id: v.id,
          name: v.name,
          type: v.type,
          speed: v.speed,
          heading: v.heading
        }
      }))
    };

    source.setData(geojson);
  }, [filteredList]);

  // Feed trails list to MapLibre source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("geojson-trails") as maplibregl.GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];
    filteredList.forEach(v => {
      const trail = trails[v.id];
      if (trail && trail.length > 1) {
        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: trail.map(coord => [coord[1], coord[0]]) // MapLibre expects [longitude, latitude]
          },
          properties: {
            id: v.id,
            type: v.type
          }
        });
      }
    });

    source.setData({
      type: "FeatureCollection",
      features
    });
  }, [filteredList, trails]);

  // Search selector helper
  const handleVesselSearchSelect = (v: Vessel) => {
    onSelectVessel(v);
    mapRef.current?.easeTo({
      center: [v.longitude, v.latitude],
      zoom: 10
    });
    setSearchQuery("");
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.easeTo({
      center: [15.0, 15.0],
      zoom: 2.2
    });
  };

  const selectedDetails = selectedVessel ? getVesselDetails(selectedVessel) : null;
  const selectedMedia = resolveVerifiedVesselMedia(selectedVessel);

  // Stats calculation
  const totalTracked = filteredList.length;
  const cargoCount = filteredList.filter(v => v.type === "Cargo").length;
  const tankerCount = filteredList.filter(v => v.type === "Tanker").length;
  const passCount = filteredList.filter(v => v.type === "Passenger").length;
  const tugCount = filteredList.filter(v => v.type === "Tug").length;
  const fishCount = filteredList.filter(v => v.type === "Fishing").length;

  return (
    <div id="situational-radar-center" className="flex flex-col h-full min-h-0 bg-[#010811] relative select-none">
      
      {/* Console Subheader */}
      <div className="bg-[#031122] border-b border-[#0d2238] px-5 py-3.5 flex items-center justify-between gap-4 z-30">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-100 font-sans tracking-wider uppercase">
            Global Maritime Traffic Monitoring Center
          </h3>
          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">
            High-Fidelity Virtualized WebGL Radar Feed • Mode: <span className="text-emerald-400">LIVE</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Ship Name, MMSI, IMO, Call Sign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#051120] border border-[#0d2238] text-[10.5px] text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 w-[320px] focus:outline-none focus:border-[#00e5ff] font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            {searchQuery && (
              <div className="absolute top-10 left-0 right-0 bg-[#031122] border border-[#0d2238] rounded-xl max-h-48 overflow-y-auto z-[2000] text-[10px] font-mono shadow-2xl">
                {combinedList
                  .filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.id.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 10)
                  .map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleVesselSearchSelect(v)}
                      className="w-full text-left px-3 py-2 hover:bg-[#07172a] text-slate-300 hover:text-[#00e5ff] border-b border-[#0d2238]/40"
                    >
                      {v.name} ({v.type})
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          <button className="relative p-2.5 rounded-xl bg-[#051120] border border-[#0d2238] text-slate-400 hover:text-slate-200 hover:bg-[#07172a] transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              3
            </span>
          </button>
          <button className="p-2.5 rounded-xl bg-[#051120] border border-[#0d2238] text-slate-400 hover:text-slate-200 hover:bg-[#07172a] transition-colors cursor-pointer">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2.5 rounded-xl bg-[#051120] border border-[#0d2238] text-slate-400 hover:text-slate-200 hover:bg-[#07172a] transition-colors cursor-pointer">
            <Globe className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* LEFT FILTER DOCK (Accordion style matching screenshot) */}
        <aside className="absolute top-6 left-6 bottom-36 w-72 bg-[#020a14]/95 border border-[#0d2238]/60 rounded-2xl p-4 overflow-hidden flex flex-col gap-3 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
          
          {/* Funnel Header */}
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 font-mono tracking-wider uppercase border-b border-[#0d2238] pb-2">
            <span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5 text-[#00e5ff]" /> Traffic Filters</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="rounded-lg border border-[#0d2238]/70 bg-[#031122]/65 px-3 py-2">
              <span className="block text-[7.5px] uppercase tracking-wider text-slate-500">Visible Targets</span>
              <strong className="mt-0.5 block text-sm font-bold text-slate-100">{totalTracked}</strong>
            </div>
            <div className="rounded-lg border border-[#0d2238]/70 bg-[#031122]/65 px-3 py-2">
              <span className="block text-[7.5px] uppercase tracking-wider text-slate-500">Mode</span>
              <strong className="mt-0.5 block text-sm font-bold uppercase text-emerald-400">{mode}</strong>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3">

            {/* High-Speed Processing Engine (HSPE) Performance Panel */}
            <div className="border border-cyan-500/20 rounded-xl overflow-hidden bg-[#031122]/40 p-3 space-y-2.5 font-mono text-[9px] shadow-sm">
              <h4 className="text-[9.5px] font-bold text-[#00e5ff] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#0d2238]/60 pb-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" /> Processing Engine
              </h4>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">BENCHMARK:</span>
                  <span className={metrics.benchmarkActive ? "text-emerald-400 font-bold" : "text-slate-400 font-bold"}>
                    {metrics.benchmarkActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">THROUGHPUT:</span>
                  <span className="text-cyan-400 font-bold">
                    {metrics.throughput.toLocaleString(undefined, { maximumFractionDigits: 1 })} msg/s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AVG LATENCY:</span>
                  <span className="text-cyan-400 font-bold">
                    {metrics.avgLatencyUs.toFixed(2)} µs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VIOLATIONS:</span>
                  <span className="text-red-400 font-bold">{metrics.activeAlertsCount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleBenchmark}
                className={`w-full py-1.5 rounded font-bold uppercase transition-all tracking-wider text-[8.5px] cursor-pointer text-center ${
                  metrics.benchmarkActive
                    ? "bg-red-500/15 border border-red-500/30 hover:border-red-500/50 text-red-400"
                    : "bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
                }`}
              >
                {metrics.benchmarkActive ? "Stop Ingestion Load" : "Start Ingestion Load"}
              </button>
            </div>

          {/* 1. SHIP TYPES (Accordion) */}
          <div className="border border-[#0d2238]/50 rounded-xl overflow-hidden bg-[#031122]/30">
            <button
              onClick={() => toggleSection("shipTypes")}
              className="w-full px-3 py-2 bg-[#031122]/70 flex items-center justify-between text-[9.5px] font-bold font-mono tracking-wider text-slate-300 hover:text-slate-100 uppercase"
            >
              <span>Ship Types</span>
              {expandedSections.shipTypes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            
            {expandedSections.shipTypes && (
              <div className="p-3 space-y-2 text-[10.5px] font-mono text-slate-400">
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={filters.cargo}
                    onChange={() => setFilters(prev => ({ ...prev, cargo: !prev.cargo }))}
                    className="rounded border-[#0d2238] bg-[#051120] text-[#22c55e] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e] mr-1.5" />
                  <span>Cargo Ships</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={filters.tankers}
                    onChange={() => setFilters(prev => ({ ...prev, tankers: !prev.tankers }))}
                    className="rounded border-[#0d2238] bg-[#051120] text-[#ef4444] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#ef4444] mr-1.5" />
                  <span>Tankers</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={filters.passenger}
                    onChange={() => setFilters(prev => ({ ...prev, passenger: !prev.passenger }))}
                    className="rounded border-[#0d2238] bg-[#051120] text-[#3b82f6] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6] mr-1.5" />
                  <span>Passenger Ships</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={filters.tug}
                    onChange={() => setFilters(prev => ({ ...prev, tug: !prev.tug }))}
                    className="rounded border-[#0d2238] bg-[#051120] text-[#eab308] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#eab308] mr-1.5" />
                  <span>Tug Boats</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={filters.fishing}
                    onChange={() => setFilters(prev => ({ ...prev, fishing: !prev.fishing }))}
                    className="rounded border-[#0d2238] bg-[#051120] text-[#06b6d4] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#06b6d4] mr-1.5" />
                  <span>Fishing Vessels</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={filters.research}
                    onChange={() => setFilters(prev => ({ ...prev, research: !prev.research }))}
                    className="rounded border-[#0d2238] bg-[#051120] text-[#a855f7] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#a855f7] mr-1.5" />
                  <span>Research Vessels</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={filters.military}
                    onChange={() => setFilters(prev => ({ ...prev, military: !prev.military }))}
                    className="rounded border-[#0d2238] bg-[#051120] text-[#ec4899] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#ec4899] mr-1.5" />
                  <span>Military Vessels</span>
                </label>

              </div>
            )}
          </div>

          {/* RANGE: Speed Slider */}
          <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between text-[9px] font-bold">
              <span>SPEED (KNOTS):</span>
              <span className="text-[#00e5ff]">{speedLimit === 0 ? "0" : `${speedLimit}`} - 30+</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={speedLimit}
              onChange={(e) => setSpeedLimit(parseInt(e.target.value))}
              className="w-full h-1 bg-[#051120] rounded-lg appearance-none cursor-pointer accent-[#00e5ff]"
            />
          </div>

          {/* RANGE: Length Slider */}
          <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between text-[9px] font-bold">
              <span>LENGTH (M):</span>
              <span className="text-[#00e5ff]">{lengthLimit === 0 ? "0" : `${lengthLimit}`} - 400+</span>
            </div>
            <input
              type="range"
              min="0"
              max="400"
              value={lengthLimit}
              onChange={(e) => setLengthLimit(parseInt(e.target.value))}
              className="w-full h-1 bg-[#051120] rounded-lg appearance-none cursor-pointer accent-[#00e5ff]"
            />
          </div>

          {/* 2. COUNTRY / FLAG (Accordion) */}
          <div className="border border-[#0d2238]/50 rounded-xl overflow-hidden bg-[#031122]/30">
            <button
              onClick={() => toggleSection("countryFlag")}
              className="w-full px-3 py-2 bg-[#031122]/70 flex items-center justify-between text-[9.5px] font-bold font-mono tracking-wider text-slate-300 hover:text-slate-100 uppercase"
            >
              <span>Country / Flag</span>
              {expandedSections.countryFlag ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expandedSections.countryFlag && (
              <div className="p-2">
                <input
                  type="text"
                  placeholder="e.g. Liberia"
                  value={flagFilter}
                  onChange={(e) => setFlagFilter(e.target.value)}
                  className="w-full bg-[#051120] border border-[#0d2238] rounded px-2 py-1 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#00e5ff] font-mono"
                />
              </div>
            )}
          </div>

          {/* 3. DESTINATION (Accordion) */}
          <div className="border border-[#0d2238]/50 rounded-xl overflow-hidden bg-[#031122]/30">
            <button
              onClick={() => toggleSection("destination")}
              className="w-full px-3 py-2 bg-[#031122]/70 flex items-center justify-between text-[9.5px] font-bold font-mono tracking-wider text-slate-300 hover:text-slate-100 uppercase"
            >
              <span>Destination</span>
              {expandedSections.destination ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expandedSections.destination && (
              <div className="p-2">
                <input
                  type="text"
                  placeholder="e.g. Rotterdam"
                  value={destFilter}
                  onChange={(e) => setDestFilter(e.target.value)}
                  className="w-full bg-[#051120] border border-[#0d2238] rounded px-2 py-1 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#00e5ff] font-mono"
                />
              </div>
            )}
          </div>

          {/* 4. STATUS (Accordion) */}
          <div className="border border-[#0d2238]/50 rounded-xl overflow-hidden bg-[#031122]/30">
            <button
              onClick={() => toggleSection("status")}
              className="w-full px-3 py-2 bg-[#031122]/70 flex items-center justify-between text-[9.5px] font-bold font-mono tracking-wider text-slate-300 hover:text-slate-100 uppercase"
            >
              <span>Status</span>
              {expandedSections.status ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expandedSections.status && (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, underway: !prev.underway }))}
                    className={`rounded-lg border px-2.5 py-2 text-left font-mono transition-colors ${
                      filters.underway
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                        : "border-[#0d2238] bg-[#051120] text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <span className="block text-[8px] uppercase tracking-wider">Underway</span>
                    <span className="mt-1 block h-1 rounded-full bg-emerald-400/70" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, anchored: !prev.anchored }))}
                    className={`rounded-lg border px-2.5 py-2 text-left font-mono transition-colors ${
                      filters.anchored
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                        : "border-[#0d2238] bg-[#051120] text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <span className="block text-[8px] uppercase tracking-wider">Anchored</span>
                    <span className="mt-1 block h-1 rounded-full bg-cyan-400/70" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Underway"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#051120] border border-[#0d2238] rounded-lg px-2.5 py-2 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#00e5ff] font-mono"
                />
              </div>
            )}
          </div>

          </div>

          {/* Quick Action Side Panel (Bottom Pinned) */}
          <div className="pt-3 border-t border-[#0d2238]/60 space-y-2">
            <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Quick Action</div>
            <button
              onClick={() => setCurrentTab?.("alerts")}
              className="w-full py-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold rounded-lg text-[9px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Broadcast SOS
            </button>
            <button
              onClick={() => {}}
              className="w-full py-1.5 bg-[#051120] hover:bg-[#07172a] border border-[#0d2238] text-slate-400 hover:text-slate-300 rounded-lg text-[9px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              Add Waypoint
            </button>
            <button
              onClick={() => {}}
              className="w-full py-1.5 bg-[#051120] hover:bg-[#07172a] border border-[#0d2238] text-slate-400 hover:text-slate-300 rounded-lg text-[9px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              Measure Distance
            </button>
          </div>

          {/* SVG Rotating Radar Globe Overlay */}
          <div className="relative h-24 w-full border border-[#0d2238] rounded-xl bg-[#020d1a]/50 overflow-hidden flex items-center justify-center select-none pointer-events-none">
            <svg width="80" height="80" className="opacity-40">
              <circle cx="40" cy="40" r="35" fill="none" stroke="#003566" stroke-width="0.75" />
              <circle cx="40" cy="40" r="22" fill="none" stroke="#003566" stroke-width="0.75" stroke-dasharray="2,2" />
              <circle cx="40" cy="40" r="10" fill="none" stroke="#003566" stroke-width="0.75" />
              <line x1="40" y1="40" x2="40" y2="5" stroke="#00e5ff" stroke-width="1.2" className="origin-[40px_40px] animate-[spin_5s_linear_infinite]" />
              <ellipse cx="40" cy="40" rx="30" ry="10" fill="none" stroke="#002d5a" stroke-width="0.5" />
              <ellipse cx="40" cy="40" rx="10" ry="30" fill="none" stroke="#002d5a" stroke-width="0.5" />
              <circle cx="20" cy="25" r="1" fill="#22c55e" />
              <circle cx="55" cy="50" r="1" fill="#ef4444" />
            </svg>
            <span className="absolute bottom-1 right-2 text-[7.5px] font-mono text-slate-600">TACTICAL SECTOR SCAN</span>
          </div>
        </aside>

        {/* CENTER: Fullscreen Map Container */}
        <div className="absolute inset-0">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Floating layers menu overlay */}
          {showLayers && (
            <div className="absolute top-6 right-6 bg-[#031122]/95 border border-[#0d2238] rounded-xl p-4 shadow-2xl z-[500] w-52 font-sans backdrop-blur-md">
              <h4 className="text-[10px] font-bold text-slate-300 font-mono tracking-wider uppercase border-b border-[#0d2238]/60 pb-2 mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#00e5ff]" /> Map overlays
              </h4>
              <div className="space-y-2 text-[10.5px] font-mono text-slate-400">
                {Object.entries(layers).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200 select-none">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={() => setLayers(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="rounded border-[#0d2238] bg-[#020a14] text-[#00e5ff] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span className="capitalize">
                      {key === "vesselTraffic" ? "Vessel Traffic" : 
                       key === "vesselLabels" ? "Vessel Labels" : 
                       key === "vesselTrails" ? "Vessel Trails" : 
                       key === "shippingLanes" ? "Shipping Lanes" : 
                       key === "majorPorts" ? "Major Ports" : 
                       key.replace(/([A-Z])/g, " $1")}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Floating cursor coordinates tracker (Screenshot style) */}
          <div className="absolute bottom-6 left-6 bg-[#020a14]/90 border border-[#0d2238] rounded px-3 py-1 text-[9.5px] font-mono text-slate-400 z-[500] shadow-md flex gap-4">
            <span>SCALE: <strong className="text-slate-200">1000 NM</strong></span>
            <span>COORDS: <strong className="text-cyan-400">{hoverCoords[0].toFixed(4)}° N, {hoverCoords[1].toFixed(4)}° E</strong></span>
          </div>

          {/* Map navigation tools */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2.5 z-[500]">
            <button
              onClick={() => setShowLayers(!showLayers)}
              className={`px-3 py-2 rounded-xl border text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer shadow-md ${
                showLayers 
                  ? "bg-[#00e5ff] text-[#020a14] border-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                  : "bg-[#031122]/90 border-[#0d2238] text-slate-300 hover:text-slate-100 hover:bg-[#07172a]"
              }`}
            >
              LAYERS
            </button>
            <button onClick={handleZoomIn} className="p-2.5 bg-[#031122]/90 border border-[#0d2238] text-slate-300 hover:text-slate-100 rounded-xl cursor-pointer">
              <ZoomIn size={14} />
            </button>
            <button onClick={handleZoomOut} className="p-2.5 bg-[#031122]/90 border border-[#0d2238] text-slate-300 hover:text-slate-100 rounded-xl cursor-pointer">
              <ZoomOut size={14} />
            </button>
            <button onClick={handleRecenter} className="p-2.5 bg-[#031122]/90 border border-[#0d2238] text-slate-300 hover:text-slate-100 rounded-xl cursor-pointer text-xs font-mono font-bold">
              3D
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Vessel specifications & Port details (Drawer style matching screenshot) */}
        <aside className="absolute top-6 right-6 bottom-20 w-80 bg-[#020a14]/95 border border-[#0d2238]/60 rounded-2xl p-5 overflow-y-auto flex flex-col gap-5 z-20 text-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
          
          {/* Selected Port Display */}
          {selectedPort ? (
            <div className="space-y-4">
              <h4 className="text-[9.5px] font-bold text-slate-300 font-mono uppercase tracking-wider border-b border-[#0d2238] pb-1.5 flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-[#00e5ff]" /> Port Telemetry
              </h4>
              <div className="bg-[#031122] border border-[#0d2238] p-4 rounded-xl space-y-1.5">
                <h3 className="text-sm font-extrabold text-slate-100 font-sans">{selectedPort.name}</h3>
                <span className="inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded tracking-wide bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20">
                  {selectedPort.country} • {selectedPort.code}
                </span>
              </div>
              <div className="space-y-2.5 font-mono text-[10.5px]">
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">Ships Anchor:</span>
                  <span className="text-slate-200 font-bold">{selectedPort.anchored}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">Ships Inbound:</span>
                  <span className="text-emerald-400 font-bold">+{selectedPort.arriving}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">Ships Outbound:</span>
                  <span className="text-orange-400 font-bold">-{selectedPort.departing}</span>
                </div>
                <div className="bg-[#031122]/60 p-3 rounded-lg border border-[#0d2238]/40 mt-3 text-[10px] space-y-1">
                  <span className="text-slate-500 text-[8.5px] font-bold block uppercase tracking-wider">Local Port weather</span>
                  <p className="text-slate-300 font-sans">Clear sky, Wind: 14 km/h SW. Waves: 0.8 meters.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPort(null)}
                className="w-full py-2 bg-[#07172a] hover:bg-[#0b2440] text-slate-400 hover:text-slate-200 border border-[#0d2238] rounded-xl text-xs font-mono transition-colors cursor-pointer"
              >
                DESELECT PORT
              </button>
            </div>
          ) : selectedDetails ? (
            /* Selected Vessel Display */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#0d2238] pb-2">
                <span className="text-[9.5px] font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#00e5ff]" /> Selected Vessel
                </span>
                <button onClick={() => onSelectVessel(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#031122] border border-[#0d2238] p-4 rounded-xl space-y-3 relative">
                <div className="w-full aspect-[16/9] rounded-lg bg-[#051120] border border-[#0d2238] overflow-hidden relative">
                  {selectedMedia ? (
                    <>
                      <img
                        src={selectedMedia.photoUrl}
                        alt={`Verified vessel media for ${selectedDetails.name}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#020a14]/95 to-transparent" />
                      <div className="absolute left-2.5 right-2.5 bottom-2 flex items-end justify-between gap-3">
                        <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                          Verified Photo
                        </span>
                        <div className="min-w-0 text-right font-mono text-[8px] text-slate-400">
                          {selectedMedia.source && <div className="truncate">Source: {selectedMedia.source}</div>}
                          {selectedMedia.lastUpdated && <div className="truncate">Updated: {selectedMedia.lastUpdated}</div>}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#0d2238] bg-[#020a14]">
                        <Ship className="h-6 w-6 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                          No Verified Vessel Photo
                        </div>
                        <div className="mt-1 text-[9px] font-mono leading-relaxed text-slate-500">
                          {selectedVessel?.isLiveAIS
                            ? "No verified media is available from the active provider."
                            : "BeaconMesh simulation environment"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100 font-sans tracking-wide flex items-center gap-1.5">
                      {selectedDetails.name} <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 cursor-pointer" />
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedDetails.type}</p>
                  </div>
                  <span className="inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    AIS ACTIVE
                  </span>
                </div>
              </div>

              {/* Spec list */}
              <div className="space-y-2 font-mono text-[10.5px]">
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">MMSI:</span>
                  <span className="text-slate-200 font-bold">{selectedDetails.mmsi}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">IMO NUMBER:</span>
                  <span className="text-slate-200 font-bold">{selectedDetails.imo}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">FLAG STATE:</span>
                  <span className="text-slate-200 flex items-center gap-1">
                    {selectedDetails.flag}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">LENGTH x BEAM:</span>
                  <span className="text-slate-200">{selectedDetails.length} x {selectedDetails.beam}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">DRAFT:</span>
                  <span className="text-slate-200">{selectedDetails.draft}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">SOG (SPEED):</span>
                  <span className="text-[#00e5ff] font-bold">{selectedDetails.speed}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">COG (COURSE):</span>
                  <span className="text-slate-200">{selectedDetails.course}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">HEADING:</span>
                  <span className="text-slate-200">{selectedDetails.heading}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5 font-sans">
                  <span className="text-slate-500 font-mono">DESTINATION:</span>
                  <span className="text-slate-300 font-bold truncate max-w-[150px]">{selectedDetails.destination}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">ETA:</span>
                  <span className="text-slate-200">{selectedDetails.eta}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">POSITION:</span>
                  <span className="text-slate-200">{selectedDetails.latitude}° N, {selectedDetails.longitude}° E</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-1.5">
                  <span className="text-slate-500">LAST UPDATE:</span>
                  <span className="text-slate-400">{selectedDetails.lastUpdate}</span>
                </div>
              </div>

              {/* Operational Summary */}
              <div className="bg-[#031122]/60 p-4 rounded-xl border border-[#0d2238]/50 space-y-2 font-mono text-[10px]">
                <h5 className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Operational Summary</h5>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nearest Port:</span>
                  <span className="text-slate-300">Colombo (CMB) - 412 NM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nearest Storm:</span>
                  <span className="text-slate-300">None within 1000 NM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Can Assist Rescue:</span>
                  <span className="text-[#22c55e] font-bold">Yes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weather Risk:</span>
                  <span className="text-[#22c55e] font-bold">Low</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-4 font-mono mt-10">
              <EyeOff className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-[10px] leading-relaxed">No tactical transponder target or port selected. Click on a ship marker or port on the global map to view live details.</p>
            </div>
          )}
        </aside>
      </div>

      {/* BOTTOM METRICS STATUS BAR */}
      <div className="absolute left-6 right-6 bottom-14 bg-[#031122]/95 border border-[#0d2238] px-6 py-3 rounded-xl flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 z-30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-6 flex-wrap">
         <div className="pr-6 border-r border-[#0d2238]">
           <div className="text-[8.5px] font-bold uppercase tracking-wider text-slate-500">v2.3.0 | System Online</div>
         </div>
         {/* ships online */}
         <div className="flex items-center border-r border-[#0d2238] pr-6">
            <div>
              <span className="text-slate-500 text-[8.5px] font-bold block uppercase tracking-wider">SHIPS ONLINE</span>
              <strong className="text-slate-100 text-sm block mt-0.5 font-sans tracking-tight">12,847</strong>
              <span className="text-[8.5px] text-[#22c55e] flex items-center gap-1 mt-0.5">
                Live AIS 
                <svg width="35" height="10" className="inline-block">
                  <path d="M0,8 Q8,2 15,6 T30,2" fill="none" stroke="#22c55e" stroke-width="1" />
                </svg>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Cargo ships */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0">
                <Ship className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <span className="text-slate-500 text-[8px] font-bold block uppercase tracking-wider">CARGO SHIPS</span>
                <strong className="text-slate-200 text-xs block font-sans">{cargoCount * 25 + 5000}</strong>
              </div>
            </div>
            {/* Tankers */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center shrink-0">
                <Ship className="w-4 h-4 text-[#ef4444]" />
              </div>
              <div>
                <span className="text-slate-500 text-[8px] font-bold block uppercase tracking-wider">TANKERS</span>
                <strong className="text-slate-200 text-xs block font-sans">{tankerCount * 25 + 2000}</strong>
              </div>
            </div>
            {/* Passenger */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center shrink-0">
                <Ship className="w-4 h-4 text-[#3b82f6]" />
              </div>
              <div>
                <span className="text-slate-500 text-[8px] font-bold block uppercase tracking-wider">PASSENGER SHIPS</span>
                <strong className="text-slate-200 text-xs block font-sans">{passCount * 20 + 1000}</strong>
              </div>
            </div>
            {/* Tugs */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#eab308]/10 border border-[#eab308]/20 flex items-center justify-center shrink-0">
                <Ship className="w-4 h-4 text-[#eab308]" />
              </div>
              <div>
                <span className="text-slate-500 text-[8px] font-bold block uppercase tracking-wider">TUG BOATS</span>
                <strong className="text-slate-200 text-xs block font-sans">{tugCount * 20 + 800}</strong>
              </div>
            </div>
            {/* Fishing */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center shrink-0">
                <Ship className="w-4 h-4 text-[#06b6d4]" />
              </div>
              <div>
                <span className="text-slate-500 text-[8px] font-bold block uppercase tracking-wider">FISHING VESSELS</span>
                <strong className="text-slate-200 text-xs block font-sans">{fishCount * 15 + 1200}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Ports online / storms stats */}
        <div className="flex items-center gap-6 border-l border-[#0d2238] pl-6 font-mono">
          <div>
            <span className="text-slate-500 text-[8px] font-bold block uppercase tracking-wider">PORTS TRACKED</span>
            <strong className="text-slate-200 text-xs block font-sans">1,246</strong>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
            </div>
            <div>
              <span className="text-slate-500 text-[8px] font-bold block uppercase tracking-wider">ACTIVE STORMS</span>
              <strong className="text-slate-200 text-xs block font-sans">3 GLOBAL</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-l border-[#0d2238] pl-6">
          <span>AIS FEED: <strong className="text-[#22c55e]">LIVE</strong></span>
          <span>WEATHER FEED: <strong className="text-[#22c55e]">LIVE</strong></span>
          <span>LAST UPDATE: {currentTime} UTC</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#031122]/60 p-0.5 rounded border border-[#0d2238]/40">
          <button className="px-1.5 py-0.5 rounded text-[8px] hover:bg-[#07172a] hover:text-slate-300 cursor-pointer">6H</button>
          <button onClick={() => setPlayLive(!playLive)} className="p-1 rounded hover:bg-[#07172a] hover:text-slate-300 cursor-pointer">
            {playLive ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
          </button>
          <button className="px-2 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase cursor-pointer">LIVE</button>
          <button className="px-1.5 py-0.5 rounded text-[8px] hover:bg-[#07172a] hover:text-slate-300 cursor-pointer">1X</button>
        </div>
      </div>

    </div>
  );
}
