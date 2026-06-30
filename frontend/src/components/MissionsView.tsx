/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Radio, Plus, CheckCircle, Clock, ShieldAlert, FileText, ChevronRight } from "lucide-react";
import { Mission, Alert } from "../types";

interface MissionsViewProps {
  missions: Mission[];
  onAddMissionLog: (missionId: string, logText: string) => void;
  onCompleteMission: (missionId: string) => void;
  selectedAlert: Alert | null;
  onSelectAlert: (alert: Alert | null) => void;
  alerts: Alert[];
}

export default function MissionsView({ 
  missions, 
  onAddMissionLog, 
  onCompleteMission,
  selectedAlert,
  onSelectAlert,
  alerts
}: MissionsViewProps) {
  const [selectedMissionId, setSelectedMissionId] = useState<string>(missions[0]?.id || "");
  const [newLogText, setNewLogText] = useState("");

  const activeMission = missions.find(m => m.id === selectedMissionId) || missions[0];

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim() || !activeMission) return;
    onAddMissionLog(activeMission.id, newLogText.trim());
    setNewLogText("");
  };

  const handleResolve = () => {
    if (!activeMission) return;
    onCompleteMission(activeMission.id);
  };

  return (
    <div id="missions-view" className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Active Missions List (Left Column) */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">
          SAR Missions Index
        </h3>
        <div className="space-y-3">
          {missions.map((m) => {
            const isSelected = m.id === selectedMissionId;
            const isCompleted = m.status === "Completed";
            
            return (
              <div
                key={m.id}
                id={`mission-card-${m.id}`}
                onClick={() => setSelectedMissionId(m.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? "bg-[#0b2240]/40 border-[#00e5ff] shadow-[0_4px_15px_rgba(0,112,243,0.15)]" 
                    : "bg-[#020a14] border-[#0d2238] hover:border-[#1e4976]/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">{m.id}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isCompleted 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-blue-500/10 text-[#00e5ff] border border-blue-500/20 animate-pulse"
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 mt-2 font-sans">{m.vesselName} Rescue</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{m.type}</p>
                </div>

                <div className="flex items-center justify-between border-t border-[#0d2238]/60 pt-2.5 mt-3 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-[#00e5ff]" />
                    <span className="truncate max-w-[100px]">{m.responder}</span>
                  </div>
                  {!isCompleted && (
                    <span className="text-amber-400">ETA {m.etaMin}m</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mission Incident Log Monitor (Right 2 Columns) */}
      <div className="lg:col-span-2">
        {activeMission ? (
          <div className="bg-[#020a14] border border-[#0d2238] rounded-xl overflow-hidden shadow-xl flex flex-col h-[540px]">
            {/* Header detail */}
            <div className="p-4 bg-[#031122] border-b border-[#0d2238] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#00e5ff] animate-pulse" />
                  Mission Timeline Log: {activeMission.id}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Vessel: {activeMission.vesselName} ({activeMission.vesselId}) • Assigned: {activeMission.responder}
                </p>
              </div>

              {activeMission.status !== "Completed" && (
                <button
                  id="btn-resolve-mission"
                  onClick={handleResolve}
                  className="py-1.5 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Close Mission (Resolved)
                </button>
              )}
            </div>

            {/* Timeline log feed */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/20">
              <div className="relative border-l border-[#0e2c4c] ml-3 pl-6 space-y-5">
                {activeMission.logs.map((log, index) => (
                  <div key={index} className="relative group">
                    {/* Ring dot */}
                    <span className="absolute -left-[30px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#031122] border border-[#00e5ff]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00e5ff]"></span>
                    </span>
                    
                    <div className="bg-[#020a14] border border-[#0d2238]/60 rounded-lg p-3 shadow-sm hover:border-[#1e4976]/40 transition-colors">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                        <span>Command Dispatch Log</span>
                        <span>{log.time}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">{log.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Log block */}
            {activeMission.status !== "Completed" && (
              <form onSubmit={handleAddLog} className="p-4 bg-[#031122] border-t border-[#0d2238] flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Record transmission or operator observation... (e.g., Tug established towing wire)"
                  value={newLogText}
                  onChange={(e) => setNewLogText(e.target.value)}
                  className="flex-1 bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#00e5ff]"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-bold text-xs uppercase tracking-wide cursor-pointer transition-colors"
                >
                  Log Entry
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 flex flex-col items-center justify-center text-center h-[540px] shadow-lg">
            <Radio className="w-12 h-12 text-slate-600 mb-3 animate-ping" />
            <h3 className="text-slate-300 font-bold text-sm">No Missions Logged</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed font-sans">
              Deploy a responder to any distress alert in the Active Alerts panel to automatically register a Search and Rescue mission tracker.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
