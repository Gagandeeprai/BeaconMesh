/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Maximize2, ZoomIn, ZoomOut, Compass, Search, Layers } from "lucide-react";
import L from "leaflet";
import "leaflet.markercluster";
import { Vessel, Alert, NetworkTrace } from "../types";
import { getDistanceKm, computeDTNLinks } from "../simulation/dtn";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ─── Layer Configuration ─────────────────────────────────────
interface LayerConfig {
  vesselLabels: boolean;
  vesselTracks: boolean;
  weather: boolean;
  wind: boolean;
  waveHeight: boolean;
  advisories: boolean;
  liveAIS: boolean;
  simFleet: boolean;
  gateways: boolean;
  coastGuard: boolean;
  links: boolean;
  sos: boolean;
  routes: boolean;
  ports: boolean;
}

const LAYER_LABELS: Record<keyof LayerConfig, string> = {
  vesselLabels: "Vessel Labels",
  vesselTracks: "Vessel Tracks",
  weather: "Weather Overlay",
  wind: "Wind Vectors",
  waveHeight: "Wave Height",
  advisories: "Marine Advisory Zone",
  liveAIS: "Live AIS Vessels",
  simFleet: "Simulated Fleet",
  gateways: "Gateways & HQ",
  coastGuard: "Coast Guard Assets",
  links: "DTN Mesh Links",
  sos: "SOS Beacons",
  routes: "Rescue Routes",
  ports: "Ports",
};

// ─── Visual Hierarchy Constants ──────────────────────────────
const ICON_SIZES = {
  sos: 40,
  selected: 28,
  support: 26,
  normal: 18,
  muted: 14,
} as const;

const ICON_OPACITY = {
  sos: 1.0,
  selected: 1.0,
  support: 0.95,
  normal: 0.6,
  muted: 0.35,
} as const;

// ─── Zoom-level LOD Thresholds ───────────────────────────────
const ZOOM_CLOSE = 12;
const ZOOM_MEDIUM = 10;

interface MapOverviewProps {
  vessels: Vessel[];
  alerts: Alert[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel) => void;
  networkTraces: NetworkTrace[];
  onTriggerPropagation: (vesselId: string) => void;
}

export default function MapOverview({
  vessels,
  alerts,
  selectedVessel,
  onSelectVessel,
  networkTraces,
  onTriggerPropagation
}: MapOverviewProps) {
  const [filterType, setFilterType] = useState<string>("All Vessels");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(9);

  const [layers, setLayers] = useState<LayerConfig>({
    vesselLabels: false,
    vesselTracks: false,
    weather: true,
    wind: true,
    waveHeight: true,
    advisories: true,
    liveAIS: true,
    simFleet: true,
    gateways: true,
    coastGuard: true,
    links: true,
    sos: true,
    routes: true,
    ports: true,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const priorityGroupRef = useRef<L.LayerGroup | null>(null);
  const traceGroupRef = useRef<L.LayerGroup | null>(null);
  const selectedPopupRef = useRef<L.Popup | null>(null);

  const [zones, setZones] = useState<any[]>([]);

  // Fetch pre-defined geofence zones from Go backend processing engine
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/zones`);
        if (res.ok) {
          const data = await res.json();
          setZones(data);
        }
      } catch (err) {
        console.error("Failed to fetch zones in MapOverview:", err);
      }
    };
    fetchZones();
  }, []);

  // ─── Filter Vessels ──────────────────────────────────────────
  const filteredVessels = vessels.filter((vessel) => {
    if (filterType === "Violating Only" && vessel.status !== "Distress") return false;
    if (filterType === "Support Only" && vessel.status !== "Support") return false;
    if (filterType === "Cargo & Tankers" && vessel.type !== "Cargo" && vessel.type !== "Tanker") return false;
    if (filterType === "Fishing Craft" && vessel.type !== "Fishing") return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return vessel.name.toLowerCase().includes(q) || vessel.id.toLowerCase().includes(q);
    }
    return true;
  });

  // ─── Helper: Get vessel visual priority tier ─────────────────
  const getVesselTier = useCallback((v: Vessel): "sos" | "selected" | "support" | "normal" | "muted" => {
    if (v.status === "Distress") return "sos";
    if (selectedVessel?.id === v.id) return "selected";
    if (v.status === "Support") return "support";
    if (v.status === "Completed" || v.status === "Offline") return "muted";
    return "normal";
  }, [selectedVessel]);

  // ─── Helper: Get vessel dot color ────────────────────────────
  const getVesselColor = (v: Vessel): string => {
    if (v.status === "Distress") return "#ef4444";
    if (v.status === "Support") return "#10b981";
    if (v.isLiveAIS) return "#00e5ff";
    if (v.status === "Completed" || v.status === "Offline") return "#475569";
    if (v.type === "Cargo") return "#22c55e";
    if (v.type === "Tanker") return "#ef4444";
    if (v.type === "Fishing") return "#06b6d4";
    return "#0070f3";
  };

  // ─── Helper: Build vessel icon HTML ──────────────────────────
  const buildVesselIcon = useCallback((v: Vessel, zoom: number): L.DivIcon => {
    const tier = getVesselTier(v);
    const size = ICON_SIZES[tier];
    const opacity = ICON_OPACITY[tier];
    const color = getVesselColor(v);
    const isSelected = selectedVessel?.id === v.id;
    const showLabel = layers.vesselLabels || zoom >= ZOOM_CLOSE || tier === "sos" || (tier === "selected" && zoom >= ZOOM_MEDIUM);

    let html = "";

    if (tier === "sos") {
      // SOS Beacon — high-vis pulsing
      html = `
        <div style="position: relative; width: ${size}px; height: ${size}px;">
          <div style="position: absolute; inset: 0; border-radius: 50%; border: 2px solid #ef4444; animation: sosPulseRing 1.5s ease-out infinite;"></div>
          <div style="position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid rgba(239,68,68,0.4); animation: sosPulseRing 1.5s ease-out 0.5s infinite;"></div>
          <svg width="${size}" height="${size}" style="position: absolute; inset: 0;">
            <rect x="${size * 0.15}" y="${size * 0.325}" width="${size * 0.7}" height="${size * 0.35}" rx="3.5" fill="#1b0306" stroke="#ef4444" stroke-width="1.5" />
            <text x="${size / 2}" y="${size * 0.575}" text-anchor="middle" fill="#fca5a5" font-size="${size * 0.22}" font-weight="bold" font-family="monospace">SOS</text>
          </svg>
        </div>
      `;
    } else {
      // Directional arrow or anchored circle
      const rotation = v.heading || 0;
      const half = size / 2;
      const pathD = v.speed > 0
        ? `M${half},${size * 0.17} L${size * 0.79},${size * 0.71} L${half},${size * 0.625} L${size * 0.21},${size * 0.71} Z`
        : `M${half},${half} m-${size * 0.21},0 a${size * 0.21},${size * 0.21} 0 1,0 ${size * 0.42},0 a${size * 0.21},${size * 0.21} 0 1,0 -${size * 0.42},0`;

      const selRing = isSelected
        ? `<circle cx="${half}" cy="${half}" r="${half - 2}" fill="none" stroke="#00e5ff" stroke-width="1.5" stroke-dasharray="2,2" style="transform-origin: ${half}px ${half}px; animation: spin 8s linear infinite;" />`
        : "";

      html = `
        <div style="position: relative; width: ${size}px; height: ${size}px; opacity: ${opacity};">
          <svg width="${size}" height="${size}">
            ${selRing}
            <g transform="rotate(${rotation} ${half} ${half})">
              <path d="${pathD}" fill="${color}" stroke="${isSelected ? '#00e5ff' : '#020a14'}" stroke-width="0.8" />
            </g>
          </svg>
        </div>
      `;
    }

    // Add label below icon if zoom/layer conditions met
    if (showLabel) {
      const labelColor = tier === "sos" ? "#ef4444" : isSelected ? "#00e5ff" : "#94a3b8";
      const weight = isSelected || tier === "sos" ? "bold" : "normal";
      html += `
        <div style="position: absolute; top: ${size + 2}px; left: 50%; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: ${weight}; color: ${labelColor}; white-space: nowrap; background: rgba(2, 10, 20, 0.85); padding: 0.5px 4px; border: 0.5px solid #0d2238; border-radius: 2px; pointer-events: none;">
          ${v.name}
        </div>
      `;
    }

    return L.divIcon({
      html,
      className: `vessel-marker-${v.id}`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, [selectedVessel, layers.vesselLabels, getVesselTier]);

  // ─── 1. Initialize Map on Mount ─────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [12.9141, 78.0],
      zoom: 4,
      minZoom: 2,
      maxZoom: 14,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(mapInstance);

    // Create layer groups
    const overlayGroup = L.layerGroup().addTo(mapInstance);
    const priorityGroup = L.layerGroup().addTo(mapInstance);
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 45,
      disableClusteringAtZoom: 12,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        let size = "small";
        if (count > 20) size = "large";
        else if (count > 10) size = "medium";
        return L.divIcon({
          html: `<div>${count}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    }).addTo(mapInstance);

    mapRef.current = mapInstance;
    overlayGroupRef.current = overlayGroup;
    clusterGroupRef.current = clusterGroup;
    priorityGroupRef.current = priorityGroup;

    // Dedicated layer group for network propagation traces (redrawn each tick independently)
    const traceGroup = L.layerGroup().addTo(mapInstance);
    traceGroupRef.current = traceGroup;

    // Track zoom level for LOD
    mapInstance.on("zoomend", () => {
      setCurrentZoom(mapInstance.getZoom());
    });

    return () => {
      mapInstance.remove();
    };
  }, []);

  // ─── 2. Re-draw Overlays & Markers ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const overlayGroup = overlayGroupRef.current;
    const clusterGroup = clusterGroupRef.current;
    const priorityGroup = priorityGroupRef.current;
    if (!map || !overlayGroup || !clusterGroup || !priorityGroup) return;

    const zoom = map.getZoom();

    // Clear previous
    overlayGroup.clearLayers();
    clusterGroup.clearLayers();
    priorityGroup.clearLayers();

    // Close any previous selected popup
    if (selectedPopupRef.current) {
      map.closePopup(selectedPopupRef.current);
      selectedPopupRef.current = null;
    }

    // ═══ A. GEOFENCE ZONES ═══
    if (layers.advisories) {
      zones.forEach((z) => {
        const coords = z.boundary.map((c: any) => [c.latitude, c.longitude]);
        let color = "#ef4444"; // red for military/restricted
        let fillOpacity = 0.1;
        if (z.type === "fishing-ban") {
          color = "#eab308"; // yellow/orange for fishing ban
        } else if (z.type === "port-channel") {
          color = "#3b82f6"; // blue for port channel approach
        } else if (z.type === "eez-india") {
          color = "#22c55e"; // green
          fillOpacity = 0.05;
        } else if (z.type === "eez-srilanka") {
          color = "#64748b"; // grey
          fillOpacity = 0.05;
        } else if (z.type === "eez-maldives") {
          color = "#ec4899"; // pink
          fillOpacity = 0.05;
        }

        L.polygon(coords, {
          color: color,
          fillColor: color,
          fillOpacity: fillOpacity,
          weight: 1.2,
          dashArray: z.type === "military-restricted" ? "4, 4" : "",
          opacity: 0.6,
        })
          .addTo(overlayGroup)
          .bindTooltip(`<strong>${z.name}</strong><br/>${z.description}`, {
            sticky: true,
            className: "vessel-tooltip"
          });
      });
    }

    // ═══ B. WIND VECTORS (simplified — arrows only, no particles) ═══
    const gridPoints: [number, number][] = [
      [12.65, 73.65], [12.65, 74.25],
      [13.05, 73.65], [13.05, 74.25],
      [13.45, 73.65], [13.45, 74.25]
    ];

    if (layers.wind) {
      const windDeg = 225;
      const rad = (windDeg * Math.PI) / 180;
      const len = 0.12;

      gridPoints.forEach(([lat, lon]) => {
        const endLat = lat + Math.cos(rad) * len;
        const endLon = lon + Math.sin(rad) * len;
        const midLat = (lat + endLat) / 2 + Math.cos(rad + 0.8) * 0.03;
        const midLon = (lon + endLon) / 2 + Math.sin(rad + 0.8) * 0.03;

        L.polyline(
          [[lat, lon], [midLat, midLon], [endLat, endLon]],
          { color: "#00e5ff", weight: 1.2, opacity: 0.25 }
        ).addTo(overlayGroup);
      });
    }

    if (layers.waveHeight) {
      gridPoints.forEach(([lat, lon], idx) => {
        const waveIcon = L.divIcon({
          html: `
            <div style="transform: rotate(240deg); opacity: 0.3;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                <path d="M12,4 L12,20 M12,4 L6,10 M12,4 L18,10"></path>
              </svg>
            </div>
          `,
          className: `wave-arrow-${idx}`,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        });
        L.marker([lat + 0.1, lon - 0.1], { icon: waveIcon }).addTo(overlayGroup);
      });
    }

    // ═══ C. WEATHER OVERLAY ═══
    if (layers.weather) {
      L.rectangle(
        [[12.3, 73.3], [13.6, 74.95]],
        { color: "#080d1a", fillColor: "#051329", fillOpacity: 0.1, weight: 0 }
      ).addTo(overlayGroup);
    }

    // ═══ D. GATEWAYS (dark chip styling) ═══
    if (layers.gateways) {
      // Mangalore HQ
      const hqIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 14px; height: 14px; background: #020a14; border: 2px solid #00e5ff; border-radius: 50%; box-shadow: 0 0 6px rgba(0, 229, 255, 0.3);">
            <div style="position: absolute; top: -4px; left: -4px; width: 20px; height: 20px; border: 1px dashed rgba(0, 229, 255, 0.25); border-radius: 50%; animation: spin 16s linear infinite;" class="animate-spin"></div>
          </div>
        `,
        className: "custom-station-icon-hq",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([12.9141, 74.8560], { icon: hqIcon })
        .addTo(priorityGroup)
        .bindTooltip("Mangalore HQ (Gateway)", {
          permanent: true,
          direction: "right",
          className: "gateway-tooltip gateway-tooltip-hq"
        });

      // Malpe Ops
      const malpeIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 11px; height: 11px; background: #020a14; border: 2px solid #475569; border-radius: 50%;">
            <div style="position: absolute; top: -3px; left: -3px; width: 15px; height: 15px; border: 1px dashed rgba(71, 85, 105, 0.4); border-radius: 50%; animation: spin 20s linear infinite;" class="animate-spin"></div>
          </div>
        `,
        className: "custom-station-icon-malpe",
        iconSize: [11, 11],
        iconAnchor: [5, 5]
      });
      L.marker([13.3524, 74.7087], { icon: malpeIcon })
        .addTo(priorityGroup)
        .bindTooltip("Malpe Ops (Gateway)", {
          permanent: true,
          direction: "right",
          className: "gateway-tooltip"
        });
    }

    // ═══ E. RESCUE ROUTES (only for selected vessel) ═══
    if (layers.routes) {
      vessels.forEach((v) => {
        if (v.status !== "Support" || !v.destination?.includes("Intercept")) return;

        // Only show route if this support vessel or its target is the selected vessel
        const targetName = v.destination.split(" ")[0];
        const distressVessel = vessels.find(
          d => d.status === "Distress" && d.name.toLowerCase().includes(targetName.toLowerCase())
        );
        if (!distressVessel) return;

        const isRelevant = selectedVessel && (
          selectedVessel.id === v.id ||
          selectedVessel.id === distressVessel.id
        );

        if (isRelevant || layers.vesselTracks) {
          L.polyline(
            [[v.latitude, v.longitude], [distressVessel.latitude, distressVessel.longitude]],
            {
              color: "#10b981",
              weight: 1.5,
              dashArray: "6, 6",
              opacity: isRelevant ? 0.8 : 0.3,
            }
          ).addTo(overlayGroup);
        }
      });
    }

    // ═══ F. DTN MESH LINKS ═══
    if (layers.links) {
      const simVessels = vessels.filter(v => !v.isLiveAIS && v.status !== "Offline");
      const dtnLinks = computeDTNLinks(simVessels, 15.0);

      dtnLinks.forEach((link, idx) => {
        const isRouting = link.status === "routing";
        L.polyline(
          [link.fromCoords, link.toCoords],
          {
            color: isRouting ? "#ef4444" : "#0055aa",
            weight: isRouting ? 1.2 : 0.8,
            opacity: isRouting ? 0.5 : 0.2,
            dashArray: isRouting ? "3, 3" : ""
          }
        ).addTo(overlayGroup);

        // Animated packet pulse
        const progress = (Date.now() % 2000) / 2000.0;
        const lat = link.fromCoords[0] + (link.toCoords[0] - link.fromCoords[0]) * progress;
        const lon = link.fromCoords[1] + (link.toCoords[1] - link.fromCoords[1]) * progress;

        const pulseIcon = L.divIcon({
          html: `<div style="width: 4px; height: 4px; background: ${isRouting ? "#ef4444" : "#00e5ff"}; border-radius: 50%; box-shadow: 0 0 4px ${isRouting ? "#ef4444" : "#00e5ff"}; opacity: 0.7;"></div>`,
          className: `packet-pulse-${idx}`,
          iconSize: [4, 4],
          iconAnchor: [2, 2]
        });
        L.marker([lat, lon], { icon: pulseIcon }).addTo(overlayGroup);
      });
    }


    // ═══ G: Network traces moved to dedicated useEffect below ═══

    // ═══ H. VESSEL MARKERS ═══
    filteredVessels.forEach((v) => {
      // Layer visibility checks
      if (v.isLiveAIS && !layers.liveAIS) return;
      if (!v.isLiveAIS && v.type === "Fishing" && !layers.simFleet) return;
      if (v.status === "Support" && !layers.coastGuard) return;
      if (v.status === "Distress" && !layers.sos) return;

      const tier = getVesselTier(v);
      const icon = buildVesselIcon(v, zoom);

      // Build hover tooltip content
      const tooltipContent = `<strong>${v.name}</strong><br/>${v.type} • ${v.speed.toFixed(1)} kn`;

      const marker = L.marker([v.latitude, v.longitude], { icon })
        .on("click", () => {
          onSelectVessel(v);
          if (v.status === "Distress") {
            onTriggerPropagation(v.id);
          }
        })
        .bindTooltip(tooltipContent, {
          permanent: false,
          direction: "top",
          offset: [0, -ICON_SIZES[tier] / 2 - 4],
          className: "vessel-tooltip",
        });

      // Priority routing: SOS, Support, Selected go to priorityGroup (never clustered)
      if (tier === "sos" || tier === "support" || tier === "selected") {
        marker.addTo(priorityGroup);
      } else {
        // Normal and muted vessels go to cluster group
        marker.addTo(clusterGroup);
      }

      // Show compact selected vessel popup (chip)
      if (selectedVessel?.id === v.id) {
        const statusClass = v.status === "Distress" ? "distress" : v.status === "Support" ? "support" : "";
        const statusLabel = v.status === "Distress" ? "⚠ Violation" : v.status === "Support" ? "◉ Support" : v.status;

        const popupContent = `
          <div class="vessel-selected-chip">
            <span class="chip-name">${v.name}</span>
            <span class="chip-status ${statusClass}">${statusLabel} • ${v.type}</span>
            <span class="chip-link">▸ View Details</span>
          </div>
        `;

        const popup = L.popup({
          closeButton: false,
          autoPan: false,
          className: "vessel-selected-popup",
          offset: [0, -ICON_SIZES[tier] / 2 - 8],
        })
          .setLatLng([v.latitude, v.longitude])
          .setContent(popupContent)
          .openOn(map);

        selectedPopupRef.current = popup;
      }
    });

  }, [vessels, alerts, selectedVessel, filterType, searchQuery, layers, currentZoom, buildVesselIcon, getVesselTier, onSelectVessel, onTriggerPropagation, zones]);

  // ─── 3. Network Trace Animation (own useEffect — fires each tick without full map redraw) ───
  useEffect(() => {
    const traceGroup = traceGroupRef.current;
    if (!traceGroup) return;
    traceGroup.clearLayers();

    const activeTraces = networkTraces.filter(t => t.active);
    activeTraces.forEach((trace) => {
      trace.hops.forEach((hop, hopIdx) => {
        if (hopIdx >= trace.currentHopIndex + 1) {
          // Future hop — dim amber dashed line
          L.polyline([hop.fromCoords, hop.toCoords], {
            color: "#f59e0b", weight: 1, opacity: 0.15, dashArray: "2, 4",
          }).addTo(traceGroup);
        } else if (hopIdx < trace.currentHopIndex) {
          // Past hop — solid green + arrived dot
          L.polyline([hop.fromCoords, hop.toCoords], {
            color: "#10b981", weight: 2, opacity: 0.7,
          }).addTo(traceGroup);
          const arrivedIcon = L.divIcon({
            html: `<div style="width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></div>`,
            className: `trace-arrived-${trace.id}-${hopIdx}`,
            iconSize: [6, 6], iconAnchor: [3, 3],
          });
          L.marker(hop.toCoords, { icon: arrivedIcon }).addTo(traceGroup);
        } else {
          // Active hop — interpolated packet marker driven by hopProgress
          const from = hop.fromCoords;
          const to = hop.toCoords;
          const lat = from[0] + (to[0] - from[0]) * trace.hopProgress;
          const lon = from[1] + (to[1] - from[1]) * trace.hopProgress;

          L.polyline([from, to], {
            color: "#f59e0b", weight: 1.5, opacity: 0.8, dashArray: "4, 3",
          }).addTo(traceGroup);

          const packetIcon = L.divIcon({
            html: `<div style="width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; box-shadow: 0 0 12px #f59e0b;"></div>`,
            className: `trace-packet-${trace.id}`,
            iconSize: [8, 8], iconAnchor: [4, 4],
          });
          L.marker([lat, lon], { icon: packetIcon }).addTo(traceGroup);
        }
      });

      // Source node — 📡 beacon icon
      const sourceIcon = L.divIcon({
        html: `<div style="width: 12px; height: 12px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 16px #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 7px;">📡</div>`,
        className: `trace-source-${trace.id}`,
        iconSize: [12, 12], iconAnchor: [6, 6],
      });
      const source = vessels.find(v => v.id === trace.sourceId);
      if (source) {
        L.marker([source.latitude, source.longitude], { icon: sourceIcon }).addTo(traceGroup);
      }
    });
  }, [networkTraces, vessels]);

  // ─── Map Actions ────────────────────────────────────────────
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.setView([12.9141, 74.35], 9);
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div
      id="map-container-card"
      className={`bg-[#020a14] border border-[#0d2238] rounded-2xl overflow-hidden relative shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col transition-all duration-300 ${isFullscreen ? "fixed inset-4 z-50 h-[calc(100vh-32px)]" : "h-[560px]"
        }`}
    >
      {/* Map Header with Filters */}
      <div className="p-6 bg-[#031122] border-b border-[#0d2238] flex flex-wrap items-center justify-between gap-3.5 z-[1000]">
        <div className="flex items-center gap-3">
          <Compass className="w-4 h-4 text-[#00e5ff]" />
          <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
            Live Maritime Overview
          </h3>

          <div className="hidden lg:flex items-center gap-2.5 text-[10px] text-slate-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span>HQ Link: <span className="text-emerald-400 font-semibold">Active</span></span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search transponder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#051120] border border-[#0d2238] text-[11px] text-slate-200 placeholder-slate-500 rounded-lg pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:border-[#00e5ff] font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#051120] border border-[#0d2238] text-[11px] text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00e5ff] font-sans font-semibold cursor-pointer"
          >
            <option>All Vessels</option>
            <option>Violating Only</option>
            <option>Support Only</option>
            <option>Cargo &amp; Tankers</option>
            <option>Fishing Craft</option>
          </select>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-[#051120] hover:bg-[#081b33] border border-[#0d2238] text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
            title="Toggle fullscreen"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Main Map (Leaflet Mount Point) */}
      <div
        ref={mapContainerRef}
        className="flex-1 w-full h-full z-10"
        style={{ backgroundColor: "#010811" }}
      />

      {/* Floating Tactical Layers Control Panel */}
      {showLayersPanel && (
        <div className="absolute top-24 right-6 bg-[#031122]/95 border border-[#0d2238] rounded-xl p-4 shadow-2xl z-[500] w-56 font-sans backdrop-blur-md pointer-events-auto">
          <h4 className="text-[10px] font-bold text-slate-300 font-mono tracking-wider uppercase border-b border-[#0d2238]/60 pb-2 mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#00e5ff]" /> Tactical Overlay Layers
          </h4>
          <div className="space-y-2 text-[10.5px] font-mono text-slate-400">
            {(Object.keys(LAYER_LABELS) as Array<keyof LayerConfig>).map((key) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => setLayers(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="rounded border-[#0d2238] bg-[#020a14] text-[#00e5ff] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>{LAYER_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Floating Map Navigation controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2.5 z-[500] pointer-events-auto">
        <button
          onClick={() => setShowLayersPanel(!showLayersPanel)}
          className={`px-3 py-2 rounded-xl border text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer shadow-md ${
            showLayersPanel
              ? "bg-[#00e5ff] text-[#020a14] border-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.4)]"
              : "bg-[#031122]/90 border-[#0d2238] text-slate-300 hover:text-slate-100 hover:bg-[#07172a]"
          }`}
          title="Toggle Layers"
        >
          LAYERS
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2.5 bg-[#031122]/90 border border-[#0d2238] text-slate-300 hover:text-slate-100 hover:bg-[#07172a] rounded-xl shadow-md transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2.5 bg-[#031122]/90 border border-[#0d2238] text-slate-300 hover:text-slate-100 hover:bg-[#07172a] rounded-xl shadow-md transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleRecenter}
          className="p-2.5 bg-[#031122]/90 border border-[#0d2238] text-slate-300 hover:text-slate-100 hover:bg-[#07172a] rounded-xl shadow-md transition-all cursor-pointer text-xs font-mono font-bold"
          title="Recenter Map"
        >
          1:1
        </button>
      </div>
    </div>
  );
}
