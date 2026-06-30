/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ChevronRight, ArrowRight, ShieldAlert, CheckCircle, Radio, Clock } from "lucide-react";
import { Alert } from "../types";

interface RecentAlertsPanelProps {
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
  selectedAlertId: string | undefined;
  onViewAllClick: () => void;
}

export default function RecentAlertsPanel({ 
  alerts, 
  onSelectAlert, 
  selectedAlertId,
  onViewAllClick 
}: RecentAlertsPanelProps) {
  
  // Sort alerts so active/unresolved are at the top, followed by resolved
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.status !== "Resolved" && b.status === "Resolved") return -1;
    if (a.status === "Resolved" && b.status !== "Resolved") return 1;
    return 0; // maintain original order (newest first)
  }).slice(0, 5); // Show top 5 recent alerts

  return (
    <div id="recent-alerts-card" className="bg-[#020a14] border border-[#0d2238] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Header */}
      <div className="p-6 bg-[#031122] border-b border-[#0d2238] flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
          Recent Alerts
        </h3>
        <button
          id="btn-view-all-alerts"
          onClick={onViewAllClick}
          className="text-xs text-[#00e5ff] hover:text-cyan-400 font-medium flex items-center gap-1 transition-colors cursor-pointer"
        >
          View All Alerts
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Alerts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#0d2238] text-[10px] text-slate-500 uppercase tracking-wider font-mono bg-[#020912]/50">
              <th className="px-6 py-4.5">Time</th>
              <th className="px-6 py-4.5">Vessel ID</th>
              <th className="px-6 py-4.5">Type</th>
              <th className="px-6 py-4.5">Location</th>
              <th className="px-6 py-4.5">Status</th>
              <th className="px-6 py-4.5 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0d2238]/60 text-xs text-slate-300 font-sans">
            {sortedAlerts.map((alert) => {
              const isSelected = selectedAlertId === alert.id;

              // Type colors
              let typeColor = "text-slate-300";
              if (alert.type === "Engine Failure") typeColor = "text-red-400 font-semibold";
              else if (alert.type === "Medical Emergency") typeColor = "text-orange-400 font-semibold";
              else if (alert.type === "Mechanical Issue" || alert.type === "Grounding") typeColor = "text-yellow-400";
              else if (alert.type === "Fire Hazard") typeColor = "text-red-500 font-bold";

              // Status badges
              let statusBadge = (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono font-bold w-max">
                  <Radio className="w-3 h-3 animate-pulse shrink-0" />
                  In Progress
                </span>
              );

              if (alert.status === "Acknowledged") {
                statusBadge = (
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-mono font-bold w-max">
                    <Clock className="w-3 h-3 shrink-0" />
                    Acknowledged
                  </span>
                );
              } else if (alert.status === "Resolved") {
                statusBadge = (
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold w-max">
                    <CheckCircle className="w-3 h-3 shrink-0" />
                    Resolved
                  </span>
                );
              }

              return (
                <tr
                  key={alert.id}
                  id={`alert-row-${alert.id}`}
                  onClick={() => onSelectAlert(alert)}
                  className={`hover:bg-[#07172a]/50 transition-colors cursor-pointer group ${
                    isSelected ? "bg-[#0b2240]/40 border-l-2 border-l-[#00e5ff]" : ""
                  }`}
                >
                  <td className="px-6 py-5 font-mono text-slate-400">
                    {alert.time}
                  </td>
                  <td className="px-6 py-5 font-mono text-slate-300 font-medium">
                    {alert.vesselId}
                  </td>
                  <td className={`px-6 py-5 ${typeColor}`}>
                    <div className="flex items-center gap-2">
                      {alert.status !== "Resolved" && (
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                      )}
                      {alert.type}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-mono text-slate-400">
                    {alert.location}
                  </td>
                  <td className="px-6 py-5">
                    {statusBadge}
                  </td>
                  <td className="px-6 py-5 text-right text-slate-500 group-hover:text-[#00e5ff] transition-colors">
                    <ChevronRight className="w-4 h-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
