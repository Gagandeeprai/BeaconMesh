/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Ship, MapPin, Compass, Play, Edit2, ShieldCheck, Check } from "lucide-react";
import { Vessel, VesselType, VesselStatus } from "../types";

interface VesselsViewProps {
  vessels: Vessel[];
  onUpdateVesselCoords: (id: string, lat: number, lng: number, speed: number, heading: number) => void;
  onSelectVessel: (vessel: Vessel) => void;
  selectedVessel: Vessel | null;
}

export default function VesselsView({ 
  vessels, 
  onUpdateVesselCoords,
  onSelectVessel,
  selectedVessel 
}: VesselsViewProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  // Coordinate Adjuster states
  const [adjustSpeed, setAdjustSpeed] = useState<number>(10);
  const [adjustHeading, setAdjustHeading] = useState<number>(0);
  const [adjustLat, setAdjustLat] = useState<number>(13.0);
  const [adjustLng, setAdjustLng] = useState<number>(74.5);
  const [successMsg, setSuccessMsg] = useState(false);

  // Sync adjuster form when a vessel is selected
  React.useEffect(() => {
    if (selectedVessel) {
      setAdjustSpeed(selectedVessel.speed);
      setAdjustHeading(selectedVessel.heading);
      setAdjustLat(selectedVessel.latitude);
      setAdjustLng(selectedVessel.longitude);
      setSuccessMsg(false);
    }
  }, [selectedVessel?.id]);

  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVessel) return;
    onUpdateVesselCoords(selectedVessel.id, adjustLat, adjustLng, adjustSpeed, adjustHeading);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 2000);
  };

  const filteredVessels = vessels.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.id.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || v.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div id="vessels-view" className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Vessels List Table (Left 2 columns) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header/Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#020a14] border border-[#0d2238] p-4 rounded-xl shadow-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search fleet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-64 text-xs rounded-lg bg-[#05162a] text-slate-200 border border-[#0d2238] focus:border-[#00e5ff] focus:outline-none transition-all font-sans"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
          </div>

          <div className="flex gap-2">
            {["All", "Cargo", "Tanker", "Fishing", "Support", "Navy"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  typeFilter === t 
                    ? "bg-[#0b2240] text-slate-100 border border-[#1e4976]/40 shadow-sm" 
                    : "bg-[#05162a] text-slate-400 hover:text-slate-200 border border-[#0d2238]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Table container */}
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0d2238] text-[10px] text-slate-500 uppercase tracking-wider font-mono bg-[#020912]/50">
                  <th className="px-5 py-3">Vessel Info</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Speed / Hdg</th>
                  <th className="px-5 py-3">Threat</th>
                  <th className="px-5 py-3">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0d2238]/60 text-xs text-slate-300 font-sans">
                {filteredVessels.map((v) => {
                  const isSelected = selectedVessel?.id === v.id;

                  // Status Badge Customization
                  let statusColor = "bg-blue-500/10 text-[#00e5ff] border-blue-500/20";
                  if (v.status === "Distress") statusColor = "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse";
                  else if (v.status === "Support") statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  else if (v.status === "Offline") statusColor = "bg-slate-500/10 text-slate-500 border-slate-500/20";

                  return (
                    <tr
                      key={v.id}
                      id={`vessel-row-${v.id}`}
                      onClick={() => onSelectVessel(v)}
                      className={`hover:bg-[#07172a]/50 transition-all cursor-pointer ${
                        isSelected ? "bg-[#0b2240]/40 border-l-2 border-l-[#00e5ff]" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 flex items-center gap-3">
                        <div className="p-2 bg-[#05162a] border border-[#0d2238] rounded-lg text-[#00e5ff]">
                          <Ship className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-200 block">{v.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{v.id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-300">
                        {v.type}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[9px] px-2 py-0.5 font-bold font-mono border rounded uppercase ${statusColor}`}>
                          {v.status === "Distress" ? "Violating" : v.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">
                        {v.speed} kn / {v.heading}°
                      </td>
                      <td className="px-5 py-3.5">
                        {(() => {
                          const ts = v.threatScore ?? 0;
                          const c = ts >= 70 ? "bg-red-500/10 text-red-400 border-red-500/20" : ts >= 40 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          return <span className={`text-[9px] px-2 py-0.5 font-bold font-mono border rounded ${c}`}>{ts}</span>;
                        })()}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {v.latitude.toFixed(4)}° N, {v.longitude.toFixed(4)}° E
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fleet Telemetry Inspector (Right Column) */}
      <div className="lg:col-span-1 space-y-6">
        {selectedVessel ? (
          <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-5 shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-[#0d2238] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#00e5ff] border border-blue-500/20">
                    <Ship className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{selectedVessel.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedVessel.id}</p>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 font-bold font-mono border rounded uppercase ${
                  selectedVessel.status === "Distress" 
                    ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" 
                    : selectedVessel.status === "Support" 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-blue-500/10 text-[#00e5ff] border-blue-500/20"
                }`}>
                  {selectedVessel.status === "Distress" ? "Violating" : selectedVessel.status}
                </span>
              </div>

              {/* Technical Specifications */}
              <div className="space-y-3.5 text-xs font-mono">
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-2">
                  <span className="text-slate-500">Registry Type</span>
                  <span className="text-slate-300 font-semibold">{selectedVessel.type}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-2">
                  <span className="text-slate-500">Authorized Cargo</span>
                  <span className="text-slate-300 truncate max-w-[150px]" title={selectedVessel.cargo}>{selectedVessel.cargo || "None"}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-2">
                  <span className="text-slate-500">Destination</span>
                  <span className="text-slate-300 truncate max-w-[150px]" title={selectedVessel.destination}>{selectedVessel.destination || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-[#0d2238]/40 pb-2">
                  <span className="text-slate-500">Crew Size Onboard</span>
                  <span className="text-slate-300 font-semibold">{selectedVessel.peopleOnboard} Persons</span>
                </div>
              </div>
            </div>

            {/* Vessel Intelligence Engine — Threat Assessment */}
            <div className="border-t border-[#0d2238] pt-4 space-y-3">
              <h4 className="text-xs font-bold text-[#00e5ff] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Threat Intelligence
              </h4>

              {/* Threat Score Bar */}
              {(() => {
                const score = selectedVessel.threatScore ?? 0;
                const barColor = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-amber-500" : "bg-emerald-500";
                const textColor = score >= 70 ? "text-red-400" : score >= 40 ? "text-amber-400" : "text-emerald-400";
                const label = score >= 70 ? "HIGH RISK" : score >= 40 ? "ELEVATED" : "LOW";
                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Threat Score</span>
                      <span className={`font-bold ${textColor}`}>{score}/100 — {label}</span>
                    </div>
                    <div className="w-full h-2 bg-[#05162a] rounded-full overflow-hidden border border-[#0d2238]">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Threat Indicators */}
              {selectedVessel.threatIndicators && selectedVessel.threatIndicators.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-500">Active Indicators</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVessel.threatIndicators.map((ind, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono font-bold">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Violations */}
              {selectedVessel.activeViolations && selectedVessel.activeViolations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-500">Active Violations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVessel.activeViolations.map((v, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Live Telemetry Controller */}
            <form onSubmit={handleApplyCoordinates} className="border-t border-[#0d2238] pt-4 space-y-4">
              <h4 className="text-xs font-bold text-[#00e5ff] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />
                Vessel Transponder Controls
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal font-sans">
                Adjust sliders to simulate a live change in telemetry transmission over AIS (Automatic Identification System).
              </p>

              {/* Speed Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Speed Over Ground</span>
                  <span className="text-slate-200 font-bold">{adjustSpeed} kn</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={adjustSpeed}
                  onChange={(e) => setAdjustSpeed(Number(e.target.value))}
                  className="w-full accent-[#00e5ff] bg-[#05162a]"
                />
              </div>

              {/* Heading Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>True Heading (Hdg)</span>
                  <span className="text-slate-200 font-bold">{adjustHeading}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={adjustHeading}
                  onChange={(e) => setAdjustHeading(Number(e.target.value))}
                  className="w-full accent-[#00e5ff] bg-[#05162a]"
                />
              </div>

              {/* Latitude Coord */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Latitude Coordinates</span>
                  <span className="text-slate-200 font-bold">{adjustLat.toFixed(4)}° N</span>
                </div>
                <input
                  type="range"
                  min="12.4"
                  max="13.7"
                  step="0.005"
                  value={adjustLat}
                  onChange={(e) => setAdjustLat(Number(e.target.value))}
                  className="w-full accent-[#00e5ff] bg-[#05162a]"
                />
              </div>

              {/* Longitude Coord */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Longitude Coordinates</span>
                  <span className="text-slate-200 font-bold">{adjustLng.toFixed(4)}° E</span>
                </div>
                <input
                  type="range"
                  min="73.4"
                  max="75.1"
                  step="0.005"
                  value={adjustLng}
                  onChange={(e) => setAdjustLng(Number(e.target.value))}
                  className="w-full accent-[#00e5ff] bg-[#05162a]"
                />
              </div>

              {/* Apply Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-gradient-to-r from-blue-700 to-[#0070f3] hover:from-blue-600 hover:to-[#0070f3] text-white font-bold text-xs uppercase cursor-pointer transition-all"
              >
                {successMsg ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Check className="w-4 h-4" /> AIS Signal Updated
                  </span>
                ) : (
                  <span>Inject AIS Telemetry</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 flex flex-col items-center justify-center text-center h-[420px] shadow-lg">
            <Ship className="w-10 h-10 text-slate-600 mb-3 animate-bounce" style={{ animationDuration: "3s" }} />
            <h3 className="text-slate-300 font-bold text-sm">Select Fleet Vessel</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed font-sans">
              Click on any registered maritime vessel from the fleet registry table to audit full structural logs, transponder metrics, and broadcast details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
