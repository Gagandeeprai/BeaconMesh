/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Bell, Shield, Radio, CheckCircle, Clock } from "lucide-react";
import { Alert } from "../types";

interface HeaderProps {
  title: string;
  subtitle: string;
  activeAlerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
  setCurrentTab: (tab: string) => void;
  mode: "live" | "hybrid" | "simulation";
  onModeChange: (mode: "live" | "hybrid" | "simulation") => void;
}

export default function Header({ 
  title, 
  subtitle, 
  activeAlerts, 
  onSelectAlert,
  setCurrentTab,
  mode,
  onModeChange
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadAlerts = activeAlerts.filter(a => a.status !== "Resolved");

  return (
    <header id="beaconmesh-header" className="bg-[#020912]/80 backdrop-blur-md border-b border-[#0d2238] px-8 py-5 flex items-center justify-between relative z-40">
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight font-sans flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-6">
        {/* Live / Hybrid / Simulation Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#07172a] border border-[#0d2238]">
          {(["live", "hybrid", "simulation"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono uppercase transition-all cursor-pointer ${
                mode === m
                  ? "bg-[#00e5ff] text-[#020a14] shadow-[0_0_8px_rgba(0,229,255,0.4)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* System Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d2238]/40 border border-[#1e4976]/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-slate-400 font-mono tracking-wide uppercase">
            System Status: <span className="text-emerald-400">Online</span>
          </span>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            id="btn-bell-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-lg bg-[#07172a] hover:bg-[#0b2240] border border-[#0d2238] text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full animate-bounce shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-[#041221] border border-[#0e2946] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden z-50">
              <div className="px-4 py-3 bg-[#071d33] border-b border-[#0e2946] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Emergency Dispatches</span>
                <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-mono font-bold">
                  {unreadAlerts.length} Active
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#081e35]">
                {unreadAlerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No pending emergency alerts.
                  </div>
                ) : (
                  unreadAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => {
                        onSelectAlert(alert);
                        setCurrentTab("dashboard");
                        setShowNotifications(false);
                      }}
                      className="w-full text-left p-3 hover:bg-[#071d33]/50 transition-colors flex gap-2.5 items-start group"
                    >
                      <div className={`p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 mt-0.5`}>
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-[#00e5ff] transition-colors truncate">
                            {alert.type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{alert.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          Vessel: {alert.vesselName} ({alert.id})
                        </p>
                        <p className="text-[10px] text-red-400 font-mono mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ETA Responders: {alert.etaMin || "TBD"}m
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#0d2238]">
          <div className="text-right">
            <h4 className="text-xs font-semibold text-slate-200 font-sans leading-tight">
              Coast Guard Ops
            </h4>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">
              Mangalore Sector
            </p>
          </div>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#0b2240] border border-[#1e4976]/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)]">
            <Shield className="w-5 h-5 text-[#00e5ff]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-[#020912]"></div>
          </div>
        </div>
      </div>
    </header>
  );
}
