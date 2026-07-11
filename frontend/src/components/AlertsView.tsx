/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Search, AlertTriangle, Flame, Heart, Anchor, Wrench, Zap, Ship } from "lucide-react";
import { Alert, AlertType, AlertSeverity, Vessel } from "../types";
import { EMERGENCY_TYPES } from "../data";

interface AlertsViewProps {
  alerts: Alert[];
  vessels: Vessel[];
  onTriggerAlert: (newAlert: Omit<Alert, "id" | "time" | "location">) => void;
  onSelectAlert: (alert: Alert) => void;
  setCurrentTab: (tab: string) => void;
}

export default function AlertsView({ 
  alerts,
  vessels,
  onTriggerAlert, 
  onSelectAlert,
  setCurrentTab 
}: AlertsViewProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Form states for triggering custom mock emergencies
  const [formVesselName, setFormVesselName] = useState("");
  const [formVesselId, setFormVesselId] = useState("");
  const [formType, setFormType] = useState<AlertType>("Engine Failure");
  const [formSeverity, setFormSeverity] = useState<AlertSeverity>("High");
  const [formPeopleOnboard, setFormPeopleOnboard] = useState(5);
  const [formLat, setFormLat] = useState(13.1);
  const [formLng, setFormLng] = useState(74.4);
  const [formDesc, setFormDesc] = useState("");
  const [showTriggerForm, setShowTriggerForm] = useState(false);

  // Vessel picker: auto-fill form fields from an existing fleet vessel
  const handlePickFleetVessel = (vesselId: string) => {
    if (!vesselId) return;
    const v = vessels.find(v => v.id === vesselId);
    if (v) {
      setFormVesselName(v.name);
      setFormVesselId(v.id);
      setFormLat(v.latitude);
      setFormLng(v.longitude);
      setFormPeopleOnboard(v.peopleOnboard);
    }
  };

  // Only vessels that are genuinely eligible to call for help:
  // must be Active, not already in Distress/Support/Completed/Offline, not LiveAIS
  const sosCandidates = vessels.filter(
    v => !v.isLiveAIS && v.status === "Active"
  );

  const handleSubmitMockAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVesselName || !formVesselId) return;

    onTriggerAlert({
      vesselId: formVesselId,
      vesselName: formVesselName,
      type: formType,
      latitude: Number(formLat),
      longitude: Number(formLng),
      status: "In Progress",
      severity: formSeverity,
      peopleOnboard: Number(formPeopleOnboard),
      description: formDesc || `Vessel reporting active ${formType} at maritime zone. Urgently requesting naval support.`
    });

    // Reset Form
    setFormVesselName("");
    setFormVesselId("");
    setFormDesc("");
    setShowTriggerForm(false);
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = a.vesselName.toLowerCase().includes(search.toLowerCase()) || 
                          a.vesselId.toLowerCase().includes(search.toLowerCase()) ||
                          a.type.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "All" || a.severity === severityFilter;
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div id="alerts-view-container" className="p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Search and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#020a14] border border-[#0d2238] p-4 rounded-xl shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search emergencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-64 text-xs rounded-lg bg-[#05162a] text-slate-200 border border-[#0d2238] focus:border-[#00e5ff] focus:outline-none transition-all font-sans"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#05162a] text-slate-200 border border-[#0d2238] text-xs font-medium px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00e5ff]"
          >
            <option value="All">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#05162a] text-slate-200 border border-[#0d2238] text-xs font-medium px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00e5ff]"
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Alerts List Grid */}
      <div id="alerts-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-[#020a14] border border-[#0d2238] rounded-xl text-slate-500">
            No maritime encroachments or violations matched your filter conditions.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isResolved = alert.status === "Resolved";

            // Per-AlertType icon mapping (covers every union member)
            const getAlertIcon = () => {
              const cls = "w-4 h-4";
              switch (alert.type) {
                case "Medical Emergency":  return <Heart className={cls} />;
                case "Fire Hazard":        return <Flame className={cls} />;
                case "Capsized":           return <Anchor className={cls} />;
                case "Mechanical Issue":   return <Wrench className={cls} />;
                case "Grounding":          return <Zap className={cls} />;
                case "Engine Failure":
                default:                  return <AlertTriangle className={cls} />;
              }
            };

            // Per-AlertSeverity badge colour (covers High / Medium / Low)
            const getSeverityStyle = () => {
              switch (alert.severity) {
                case "High":   return "bg-red-500/15 text-red-400";
                case "Medium": return "bg-yellow-500/15 text-yellow-400";
                case "Low":    return "bg-slate-500/15 text-slate-400";
              }
            };
            return (
              <div 
                key={alert.id}
                id={`alert-card-${alert.id}`}
                className={`border rounded-xl p-5 shadow-lg transition-all duration-300 flex flex-col justify-between ${
                  isSelectedAndPending(alert) 
                    ? "bg-[#18090f] border-red-900/50 shadow-[0_4px_25px_rgba(239,68,68,0.05)]" 
                    : "bg-[#020a14] border-[#0d2238] hover:border-[#1e4976]/60"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded ${getSeverityStyle()}`}>
                        {getAlertIcon()}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{alert.vesselName}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{alert.id}</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        alert.status === "Resolved" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : alert.status === "Acknowledged" 
                          ? "bg-orange-500/10 text-orange-400" 
                          : "bg-red-500/10 text-red-400 animate-pulse"
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[11px] font-mono border-b border-[#0d2238]/40 pb-1.5">
                      <span className="text-slate-500">Incident:</span>
                      <span className="text-slate-300 font-bold">{alert.type}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono border-b border-[#0d2238]/40 pb-1.5">
                      <span className="text-slate-500">Time / Location:</span>
                      <span className="text-slate-300">{alert.time} • {alert.location}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono border-b border-[#0d2238]/40 pb-1.5">
                      <span className="text-slate-500">Personnel:</span>
                      <span className="text-slate-300">{alert.peopleOnboard} Crew</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-3 mt-3 italic">
                      "{alert.description}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#0d2238] pt-4 mt-4">
                  <div className="text-[10px] font-mono text-slate-500">
                    {alert.responder ? (
                      <span>Assigned: <strong className="text-slate-300">{alert.responder}</strong></span>
                    ) : (
                      <span className="text-red-400">Awaiting Command Responder</span>
                    )}
                  </div>

                  <button
                    id={`btn-inspect-alert-${alert.id}`}
                    onClick={() => {
                      onSelectAlert(alert);
                      setCurrentTab("dashboard");
                    }}
                    className="py-1 px-3 bg-[#071d33] hover:bg-[#0b2240] border border-[#0d2238] hover:border-[#1e4976]/40 rounded text-xs font-semibold text-[#00e5ff] transition-all cursor-pointer"
                  >
                    Inspect Command Panel
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  function isSelectedAndPending(alert: Alert) {
    return alert.status !== "Resolved" && alert.severity === "High";
  }
}
