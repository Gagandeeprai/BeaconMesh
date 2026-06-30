/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Maximize2, ZoomIn, ZoomOut, Compass, Search, Eye, Navigation } from "lucide-react";
import L from "leaflet";
import { Vessel, Alert } from "../types";
import { getDistanceKm, Link, computeDTNLinks } from "../simulation/dtn";

interface MapOverviewProps {
  vessels: Vessel[];
  alerts: Alert[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel) => void;
}

export default function MapOverview({
  vessels,
  alerts,
  selectedVessel,
  onSelectVessel
}: MapOverviewProps) {
  const [filterType, setFilterType] = useState<string>("All Vessels");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Tactical layers state
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(false);
  const [layers, setLayers] = useState({
    weather: true,
    wind: true,
    waveHeight: true,
    advisories: true,
    liveAIS: true,
    simFleet: true,
    gateways: true,
    links: true,
    sos: true,
    routes: true,
    heatmap: false
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // Filter vessels based on type selection and search query
  const filteredVessels = vessels.filter((vessel) => {
    // Dropdown Filters
    if (filterType === "Distress Only" && vessel.status !== "Distress") return false;
    if (filterType === "Support Only" && vessel.status !== "Support") return false;
    if (filterType === "Cargo & Tankers" && vessel.type !== "Cargo" && vessel.type !== "Tanker") return false;
    if (filterType === "Fishing Craft" && vessel.type !== "Fishing") return false;

    // Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return vessel.name.toLowerCase().includes(q) || vessel.id.toLowerCase().includes(q);
    }

    return true;
  });

  // 1. Initialize Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center map around Mangalore sector
    const mapInstance = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [12.9141, 74.35],
      zoom: 9,
      minZoom: 7,
      maxZoom: 14
    });

    // CartoDB Dark Matter tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(mapInstance);

    // Layer group for dynamic items
    const layersGroup = L.layerGroup().addTo(mapInstance);

    mapRef.current = mapInstance;
    layersGroupRef.current = layersGroup;

    // Cleanup on unmount
    return () => {
      mapInstance.remove();
    };
  }, []);

  // 2. Re-draw Markers & Support Paths when state variables change
  useEffect(() => {
    const map = mapRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    // Clear previous markers & paths
    layersGroup.clearLayers();

    // A. DRAW ADVISORY OVERLAYS (1. Coastline / Base level)
    if (layers.advisories) {
      // Find current advisory severity to determine color
      const activeSOS = vessels.some(v => v.status === "Distress");
      const advColor = activeSOS ? "#ef4444" : "#10b981"; // Red if SOS, otherwise green
      
      // Render marine advisory polygon over coastal sector
      const advZone = L.polygon(
        [
          [12.45, 73.40],
          [13.55, 73.40],
          [13.55, 74.83],
          [12.45, 74.83]
        ],
        {
          color: advColor,
          fillColor: advColor,
          fillOpacity: activeSOS ? 0.08 : 0.03,
          weight: 1,
          dashArray: "3, 6"
        }
      ).addTo(layersGroup);

      advZone.bindTooltip(activeSOS ? "⚠ RESTRICTED OPERATIONS: SOS IN PROGRESS" : "✅ ADVISORY: NORMAL OPERATION STATUS", {
        sticky: true,
        className: "bg-slate-950 border border-[#0d2238] text-[9px] font-mono text-slate-300"
      });
    }

    // B. DRAW WIND & WAVE ARROWS (2. Meteorological vector overlays)
    // We draw arrows in a grid across the ocean sector
    const gridPoints: [number, number][] = [
      [12.65, 73.65], [12.65, 74.25],
      [13.05, 73.65], [13.05, 74.25],
      [13.45, 73.65], [13.45, 74.25]
    ];

    if (layers.wind) {
      gridPoints.forEach(([lat, lon], idx) => {
        // Wind direction SW is approx 225 degrees rotation
        const windIcon = L.divIcon({
          html: `
            <div style="transform: rotate(225deg); opacity: 0.45; filter: drop-shadow(0 0 4px #00e5ff);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19,12 12,5 5,12"></polyline>
              </svg>
            </div>
          `,
          className: `wind-arrow-${idx}`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker([lat, lon], { icon: windIcon }).addTo(layersGroup);
      });
    }

    if (layers.waveHeight) {
      gridPoints.forEach(([lat, lon], idx) => {
        // Wave direction 240 degrees rotation (shifted slightly to avoid overlap)
        const waveIcon = L.divIcon({
          html: `
            <div style="transform: rotate(240deg); opacity: 0.4; filter: drop-shadow(0 0 4px #8b5cf6);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                <path d="M12,4 L12,20 M12,4 L6,10 M12,4 L18,10"></path>
              </svg>
            </div>
          `,
          className: `wave-arrow-${idx}`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        L.marker([lat + 0.1, lon - 0.1], { icon: waveIcon }).addTo(layersGroup);
      });
    }

    // C. DRAW RAIN & VISIBILITY OVERLAY OVER COGNITIVE GRID
    if (layers.weather) {
      // Draw grid line borders for visibility
      L.rectangle(
        [[12.3, 73.3], [13.6, 74.95]],
        {
          color: "#080d1a",
          fillColor: "#051329",
          fillOpacity: 0.15, // fog density
          weight: 0
        }
      ).addTo(layersGroup);
    }

    // D. DRAW GATEWAYS (HQ & Malpe Stations)
    if (layers.gateways) {
      // 1. Mangalore HQ
      const hqIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 14px; height: 14px; background: #ffffff; border: 2.5px solid #010811; border-radius: 50%; box-shadow: 0 0 10px #ffffff;">
            <div style="position: absolute; top: -5px; left: -5px; width: 20px; height: 20px; border: 1.5px dashed #ffffff; border-radius: 50%; animation: spin 16s linear infinite;" class="animate-spin"></div>
          </div>
        `,
        className: "custom-station-icon-hq",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([12.9141, 74.8560], { icon: hqIcon })
        .addTo(layersGroup)
        .bindTooltip("Mangalore HQ (Gateway)", { permanent: true, direction: "right", className: "bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-200 font-sans" });

      // 2. Malpe Ops
      const malpeIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 11px; height: 11px; background: #94a3b8; border: 2px solid #010811; border-radius: 50%; box-shadow: 0 0 6px #94a3b8;">
            <div style="position: absolute; top: -4px; left: -4px; width: 16px; height: 16px; border: 1px dashed #94a3b8; border-radius: 50%; animation: spin 20s linear infinite;" class="animate-spin"></div>
          </div>
        `,
        className: "custom-station-icon-malpe",
        iconSize: [11, 11],
        iconAnchor: [5, 5]
      });
      L.marker([13.3524, 74.7087], { icon: malpeIcon })
        .addTo(layersGroup)
        .bindTooltip("Malpe Ops (Gateway)", { permanent: true, direction: "right", className: "bg-slate-950 border border-slate-800 text-[9px] text-slate-400 font-sans" });
    }

    // E. DRAW RESCUE ROUTES (Active Dispatches)
    if (layers.routes) {
      vessels.forEach((v) => {
        if (v.status === "Support" && v.destination && v.destination.includes("Intercept")) {
          const targetName = v.destination.split(" ")[0];
          const distressVessel = vessels.find(
            d => d.status === "Distress" && d.name.toLowerCase().includes(targetName.toLowerCase())
          );
          if (distressVessel) {
            L.polyline(
              [
                [v.latitude, v.longitude],
                [distressVessel.latitude, distressVessel.longitude]
              ],
              {
                color: "#10b981", // Emerald rescue route
                weight: 2,
                dashArray: "6, 6",
                opacity: 0.8
              }
            ).addTo(layersGroup);
          }
        }
      });
    }

    // F. DRAW DTN MESH COMMUNICATION LINKS & PACKET ANIMATIONS
    if (layers.links) {
      // Calculate links between simulated vessels (within 15km range)
      const simVessels = vessels.filter(v => !v.isLiveAIS && v.status !== "Offline");
      const dtnLinks = computeDTNLinks(simVessels, 15.0);

      dtnLinks.forEach((link, idx) => {
        // Draw physical link
        const isRouting = link.status === "routing";
        L.polyline(
          [link.fromCoords, link.toCoords],
          {
            color: isRouting ? "#ef4444" : "#0055aa",
            weight: isRouting ? 1.5 : 1.0,
            opacity: isRouting ? 0.6 : 0.35,
            dashArray: isRouting ? "3, 3" : ""
          }
        ).addTo(layersGroup);

        // Animate packet propagation (dots moving along lines)
        // Uses the current seconds tick to translate the dot position dynamically
        const progress = (Date.now() % 2000) / 2000.0;
        const lat = link.fromCoords[0] + (link.toCoords[0] - link.fromCoords[0]) * progress;
        const lon = link.fromCoords[1] + (link.toCoords[1] - link.fromCoords[1]) * progress;

        const pulseIcon = L.divIcon({
          html: `
            <div style="position: relative; width: 6px; height: 6px; background: ${isRouting ? "#ef4444" : "#00e5ff"}; border-radius: 50%; box-shadow: 0 0 6px ${isRouting ? "#ef4444" : "#00e5ff"};">
            </div>
          `,
          className: `packet-pulse-${idx}`,
          iconSize: [6, 6],
          iconAnchor: [3, 3]
        });

        L.marker([lat, lon], { icon: pulseIcon }).addTo(layersGroup);
      });
    }

    // G. DRAW VESSEL MARKERS (Live AIS & Simulated Fishing)
    filteredVessels.forEach((v) => {
      // Render layer toggling checks
      if (v.isLiveAIS && !layers.liveAIS) return;
      if (!v.isLiveAIS && v.type === "Fishing" && !layers.simFleet) return;

      const isSelected = selectedVessel?.id === v.id;
      
      // Determine colors based on status and types
      let dotColor = "#0070f3"; // Active/Cargo (blue)
      if (v.status === "Distress") dotColor = "#ef4444"; // Distress (red)
      else if (v.status === "Support") dotColor = "#10b981"; // Support (green)
      else if (v.isLiveAIS) dotColor = "#00e5ff"; // Live Commercial Vessels (cyan/blue)
      else if (v.status === "Completed" || v.status === "Offline") dotColor = "#64748b";

      let innerHTML = "";
      
      if (v.status === "Distress" && layers.sos) {
        // High-vis pulsing red beacon with double pulse rings
        innerHTML = `
          <div style="position: relative; width: 40px; height: 40px; transform: translate(-20px, -20px);">
            <svg width="40" height="40" style="overflow: visible;">
              <circle cx="20" cy="20" r="18" fill="none" stroke="#ef4444" stroke-width="1.5" class="animate-pulse" style="animation-duration: 2s; opacity: 0.35;"></circle>
              <circle cx="20" cy="20" r="10" fill="none" stroke="#ef4444" stroke-width="2" class="animate-ping" style="animation-duration: 1.2s;"></circle>
              <rect x="6" y="13" width="28" height="14" rx="3.5" fill="#1b0306" stroke="#ef4444" stroke-width="1.5" />
              <text x="20" y="23" text-anchor="middle" fill="#fca5a5" font-size="8.5" font-weight="bold" font-family="monospace">SOS</text>
            </svg>
            <div style="position: absolute; top: 32px; left: 50%; transform: translateX(-50%); font-family: monospace; font-size: 8px; font-weight: bold; color: #ef4444; white-space: nowrap; background: rgba(15, 3, 5, 0.9); padding: 1px 4px; border: 1px solid #ef4444; border-radius: 2px;">
              ${v.name}
            </div>
          </div>
        `;
      } else {
        // Directional rotated arrow icon
        const rotation = v.heading || 0;
        const pathD = v.speed > 0 ? "M12,4 L19,17 L12,15 L5,17 Z" : "M12,12 A5,5 0 1,0 12,12.01";
        const ring = isSelected ? `<circle cx="12" cy="12" r="9.5" fill="none" stroke="#00e5ff" stroke-width="1.5" stroke-dasharray="2,2" class="animate-spin" style="transform-origin: 12px 12px; animation-duration: 8s;"></circle>` : "";
        
        innerHTML = `
          <div style="position: relative; width: 24px; height: 24px; transform: translate(-12px, -12px);">
            <svg width="24" height="24">
              ${ring}
              <g transform="rotate(${rotation} 12 12)">
                <path d="${pathD}" fill="${dotColor}" stroke="${isSelected ? "#00e5ff" : "#020a14"}" stroke-width="1" />
              </g>
            </svg>
            <div style="position: absolute; top: 22px; left: 50%; transform: translateX(-50%); font-family: monospace; font-size: 8px; font-weight: ${isSelected ? "bold" : "normal"}; color: ${isSelected ? "#00e5ff" : "#94a3b8"}; white-space: nowrap; background: rgba(2, 10, 20, 0.85); padding: 0.5px 4px; border: 0.5px solid ${isSelected ? "#00e5ff/40" : "#0d2238"}; border-radius: 2px; pointer-events: none;">
              ${v.name} ${v.isLiveAIS ? "📡" : ""}
            </div>
          </div>
        `;
      }

      const icon = L.divIcon({
        html: innerHTML,
        className: `vessel-marker-${v.id}`,
        iconSize: v.status === "Distress" ? [40, 40] : [24, 24],
        iconAnchor: [0, 0]
      });

      L.marker([v.latitude, v.longitude], { icon })
        .addTo(layersGroup)
        .on("click", () => {
          onSelectVessel(v);
        });
    });

  }, [vessels, alerts, selectedVessel, filterType, searchQuery, layers]);

  // Leaflet instance actions
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.setView([12.9141, 74.35], 9);
  };

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
            <option>Distress Only</option>
            <option>Support Only</option>
            <option>Cargo & Tankers</option>
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

      {/* Main Map Visual Canvas (Leaflet Mount Point) */}
      <div
        ref={mapContainerRef}
        className="flex-1 w-full h-full z-10"
        style={{ backgroundColor: "#010811" }}
      />

      {/* Floating Tactical Layers Control Panel */}
      {showLayersPanel && (
        <div className="absolute top-24 right-6 bg-[#031122]/95 border border-[#0d2238] rounded-xl p-4 shadow-2xl z-[500] w-56 font-sans backdrop-blur-md pointer-events-auto">
          <h4 className="text-[10px] font-bold text-slate-300 font-mono tracking-wider uppercase border-b border-[#0d2238]/60 pb-2 mb-3 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#00e5ff]" /> Tactical Overlay Layers
          </h4>
          <div className="space-y-2 text-[10.5px] font-mono text-slate-400">
            {Object.entries(layers).map(([key, val]) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer hover:text-slate-200 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={val}
                  onChange={() => setLayers(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="rounded border-[#0d2238] bg-[#020a14] text-[#00e5ff] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="capitalize">
                  {key === "simFleet" ? "Simulated Fishing Fleet" : 
                   key === "liveAIS" ? "Live AIS Vessels" : 
                   key === "advisories" ? "Marine Advisories" : 
                   key.replace(/([A-Z])/g, " $1")}
                </span>
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

      {/* Tooltip Hover Overlay (Top-Left corner) */}
      {selectedVessel && (
        <div className="absolute top-32 left-6 bg-[#031122]/95 border border-[#0d2238] rounded-2xl p-4 shadow-xl max-w-sm font-sans backdrop-blur-sm z-[500] pointer-events-auto">
          <div className="flex items-start justify-between gap-4 mb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-200">{selectedVessel.name}</h4>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedVessel.id}</p>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-sm uppercase font-mono ${selectedVessel.status === "Distress"
              ? "bg-red-500/10 text-red-400"
              : selectedVessel.status === "Support"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-blue-500/10 text-[#00e5ff]"
              }`}>
              {selectedVessel.status}
            </span>
          </div>
          <div className="space-y-1.5 text-[10px] font-mono text-slate-400 border-t border-[#0d2238] pt-2">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="text-slate-300 font-semibold">{selectedVessel.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Speed / Hdg:</span>
              <span className="text-slate-300 font-semibold">{selectedVessel.speed} kn / {selectedVessel.heading}°</span>
            </div>
            <div className="flex justify-between">
              <span>Coordinates:</span>
              <span className="text-slate-300 font-semibold">
                {selectedVessel.latitude.toFixed(4)}° N, {selectedVessel.longitude.toFixed(4)}° E
              </span>
            </div>
            {selectedVessel.cargo && (
              <div className="flex justify-between gap-2">
                <span className="shrink-0">Cargo:</span>
                <span className="text-slate-300 truncate max-w-[120px]">{selectedVessel.cargo}</span>
              </div>
            )}
            {selectedVessel.destination && (
              <div className="flex justify-between gap-2">
                <span className="shrink-0">Bound:</span>
                <span className="text-slate-300 truncate max-w-[120px]">{selectedVessel.destination}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
