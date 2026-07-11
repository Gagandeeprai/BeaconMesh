/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertCircle, Clock, Users, Navigation, Shield, CheckCircle, Brain, Radio, ArrowRight, Activity } from "lucide-react";
import { Alert, Vessel } from "../types";

interface ActiveMissionPanelProps {
  selectedAlert: Alert | null;
  onAssignResponder: (alertId: string, responderName: string, eta: number) => void;
  supportVessels: Vessel[];
  onViewMissionDetails: (alert: Alert) => void;
}

interface GeminiAssessment {
  riskAnalysis: string;
  priorityChecklist: string[];
  responderInstructions: string[];
  radioAdvisory: string;
  simulated?: boolean;
}

export default function ActiveMissionPanel({ 
  selectedAlert, 
  onAssignResponder, 
  supportVessels,
  onViewMissionDetails
}: ActiveMissionPanelProps) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAssessment, setAiAssessment] = useState<GeminiAssessment | null>(null);
  const [activeAITab, setActiveAITab] = useState<"risk" | "tasks" | "radio">("risk");

  if (!selectedAlert) {
    return (
      <div id="active-mission-empty" className="bg-[#020a14] border border-[#0d2238] rounded-2xl p-8 flex flex-col items-center justify-center text-center h-[380px] shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <Activity className="w-10 h-10 text-slate-600 animate-pulse mb-4" />
        <h3 className="text-slate-300 font-bold text-sm">No Active Encroachment Inspected</h3>
        <p className="text-xs text-slate-500 mt-2.5 max-w-xs font-sans leading-relaxed">
          Select any violating vessel from the Live Map or Recent Alerts table to initiate active incident command monitoring.
        </p>
      </div>
    );
  }

  const { id, vesselId, vesselName, type, time, location, status, severity, peopleOnboard, responder, etaMin, description } = selectedAlert;

  const isResolved = status === "Resolved";

  // Trigger server-side Gemini intelligence assessment
  const handleGenerateAIEmergencyDirective = async () => {
    setLoadingAI(true);
    setAiAssessment(null);
    try {
      const res = await fetch("/api/gemini/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertType: type,
          vesselName,
          description,
          coordinates: location,
          severity,
          peopleOnboard,
          weatherCondition: "Moderate Rain, Wave height 1.6m, Wind 18 km/h SW"
        })
      });
      const data = await res.json();
      setAiAssessment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div id="active-mission-card" className="bg-[#020a14] border border-[#0d2238] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col">
      {/* Panel Header */}
      <div className="p-6 bg-[#031122] border-b border-[#0d2238] flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
          Active Mission
        </h3>
        
        <div className="flex gap-2">
          <span className={`text-[9px] px-2 py-0.5 font-bold rounded-sm uppercase tracking-wider font-mono ${
            severity === "High" 
              ? "bg-red-500/10 text-red-400 border border-red-500/20" 
              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          }`}>
            {severity} Priority
          </span>
          <span className={`text-[9px] px-2 py-0.5 font-bold rounded-sm uppercase tracking-wider font-mono ${
            isResolved 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-blue-500/10 text-[#00e5ff] border border-blue-500/20 animate-pulse"
          }`}>
            {status}
          </span>
        </div>
      </div>

      {/* Distress Vessel Block */}
      <div className="p-6 border-b border-[#0d2238] bg-gradient-to-br from-[#040f1a] to-transparent">
        <div className="flex gap-3.5 items-start">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 animate-pulse">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200 font-sans">{type}</h4>
            <p className="text-xs text-slate-400 font-mono mt-1">{vesselName} • {vesselId}</p>
          </div>
        </div>

        {/* Short details grid */}
        <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 mt-5 text-[11px] font-mono border-t border-[#0d2238]/60 pt-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Navigation className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate" title={location}>{location}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{peopleOnboard} Onboard</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">{responder || "Unassigned"}</span>
          </div>
        </div>
      </div>

      {/* Dispatch Actions & Responders Assignment */}
      <div className="p-6 border-b border-[#0d2238] bg-[#020912]/40">
        {!isResolved && !responder ? (
          <div>
            <label className="text-[10px] text-slate-500 font-mono font-bold uppercase block mb-2">
              Assign Command Responder
            </label>
            <div className="flex gap-2">
              <select
                id="select-responder-assign"
                className="flex-1 bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-xl px-3 py-2 focus:outline-none focus:border-[#00e5ff] font-sans"
                onChange={(e) => {
                  if (e.target.value) {
                    onAssignResponder(id, e.target.value, 25);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select rescue ship...</option>
                {supportVessels.map(v => (
                  <option key={v.id} value={v.name}>{v.name} ({v.speed} kn)</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2 text-[#00e5ff]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Rescue Mission Active</span>
            </div>
            {responder && (etaMin ?? 0) > 0 ? (
              <span className="bg-blue-500/10 text-[#00e5ff] border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                ETA {etaMin} min
              </span>
            ) : responder && etaMin === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> On Scene
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Resolved
              </span>
            )}
          </div>
        )}
      </div>

      {/* Gemini AI Assistant Block */}
      <div className="p-6 flex-1 flex flex-col justify-between min-h-[200px] bg-[#030d17]/50 border-b border-[#0d2238]">
        {!aiAssessment ? (
          <div className="text-center py-4 flex flex-col items-center justify-center h-full">
            <div className="p-3 rounded-full bg-[#00e5ff]/5 border border-[#00e5ff]/20 text-[#00e5ff] mb-3 animate-pulse">
              <Brain className="w-5 h-5" />
            </div>
            <h5 className="text-[11px] font-bold text-slate-300">AI Tactical Intercept Directives</h5>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1.5 leading-relaxed font-sans">
              Deploy Gemini server-side models to analyze encroachment coordinates, wind/wave vectors, and generate tactical intercept directives.
            </p>
            <button
              id="btn-generate-ai-directives"
              onClick={handleGenerateAIEmergencyDirective}
              disabled={loadingAI}
              className="mt-4 w-full max-w-[210px] flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-semibold text-[10px] uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 font-sans"
            >
              {loadingAI ? "Analyzing Situation..." : "Generate AI Directives"}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* AI Custom Header */}
            <div className="flex items-center justify-between border-b border-[#0d2238] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#00e5ff]" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Gemini Tactical Report</span>
              </div>
              {aiAssessment.simulated && (
                <span className="text-[8px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1 py-0.5 rounded font-mono font-bold">
                  SIMULATED
                </span>
              )}
            </div>

            {/* AI Tabs */}
            <div className="flex gap-1.5 border-b border-[#0d2238]/60 pb-2 text-[9px] font-mono">
              <button
                id="ai-tab-risk"
                onClick={() => setActiveAITab("risk")}
                className={`px-2.5 py-1 rounded uppercase font-bold transition-all ${
                  activeAITab === "risk" ? "bg-[#0b2240] text-[#00e5ff] border border-[#1e4976]/40" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Risk Analysis
              </button>
              <button
                id="ai-tab-tasks"
                onClick={() => setActiveAITab("tasks")}
                className={`px-2.5 py-1 rounded uppercase font-bold transition-all ${
                  activeAITab === "tasks" ? "bg-[#0b2240] text-[#00e5ff] border border-[#1e4976]/40" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Checklist
              </button>
              <button
                id="ai-tab-radio"
                onClick={() => setActiveAITab("radio")}
                className={`px-2.5 py-1 rounded uppercase font-bold transition-all ${
                  activeAITab === "radio" ? "bg-[#0b2240] text-[#00e5ff] border border-[#1e4976]/40" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                VHF Script
              </button>
            </div>

            {/* AI Tabs Content */}
            <div className="flex-1 mt-3 overflow-y-auto max-h-[140px] text-[10px] font-sans leading-relaxed text-slate-300">
              {activeAITab === "risk" && (
                <p className="italic bg-[#040e1a]/40 p-3 rounded-xl border border-[#0d2238]">{aiAssessment.riskAnalysis}</p>
              )}
              {activeAITab === "tasks" && (
                <ul className="space-y-2">
                  {aiAssessment.priorityChecklist.map((task, i) => (
                    <li key={i} className="flex gap-2.5 items-start bg-[#040e1a]/20 p-2 rounded-lg border border-[#0d2238]/40">
                      <span className="text-red-400 font-mono font-bold shrink-0">{i+1}.</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activeAITab === "radio" && (
                <p className="font-mono bg-slate-950 p-3 rounded-xl border border-slate-900 text-emerald-400 text-[9.5px]">
                  {aiAssessment.radioAdvisory}
                </p>
              )}
            </div>

            {/* Clear button */}
            <button
              id="ai-btn-reset"
              onClick={() => setAiAssessment(null)}
              className="mt-3 text-right text-[9px] text-[#00e5ff]/70 hover:text-[#00e5ff] uppercase font-mono tracking-wider font-bold"
            >
              Recalculate AI Directives
            </button>
          </div>
        )}
      </div>

      {/* Command Details Action Button */}
      <div className="p-6 bg-[#031122]">
        <button
          id="btn-view-mission-details"
          onClick={() => onViewMissionDetails(selectedAlert)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-bold text-xs shadow-md shadow-[#0070f3]/10 cursor-pointer group transition-all"
        >
          View Mission Control Center
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
