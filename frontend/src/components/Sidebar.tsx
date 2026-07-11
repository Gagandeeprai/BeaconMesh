/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Compass, 
  AlertOctagon, 
  Ship, 
  Radio, 
  Map, 
  CloudRain, 
  Anchor,
  BarChart3, 
  FileText, 
  Settings,
  Bell,
  ChevronRight,
  AlertTriangle,
  Activity,
  History,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onSendBroadcastClick: () => void;
  activeAlertsCount: number;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  onSendBroadcastClick,
  activeAlertsCount 
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard",   label: "Dashboard",        icon: Compass },
    { id: "alerts",      label: "Alerts",            icon: AlertOctagon, badge: activeAlertsCount },
    { id: "vessels",     label: "Vessels",           icon: Ship },
    { id: "missions",    label: "Missions",          icon: Radio },
    { id: "map",         label: "Live Map",           icon: Map },
    { id: "weather",     label: "Weather",            icon: CloudRain },
    { id: "ports",       label: "Ports",              icon: Anchor },
    { id: "analytics",   label: "Analytics",          icon: BarChart3 },
    { id: "performance", label: "Ingest Monitor",     icon: Activity },
    { id: "replay",      label: "Incident Replay",    icon: History },
    { id: "reports",     label: "Reports",            icon: FileText },
    { id: "settings",    label: "Settings",           icon: Settings },
    { id: "admin",       label: "Admin Settings",     icon: ShieldCheck },
  ];

  return (
    <aside id="beaconmesh-sidebar" className="w-[280px] bg-[#030d1a] border-r border-[#0d2238] flex flex-col h-screen overflow-y-auto">
      {/* Brand Section */}
      <div className="p-6 border-b border-[#0d2238] flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#0070f3]/10 border border-[#0070f3]/40">
          <Radio className="w-5 h-5 text-[#00e5ff] animate-pulse" />
          <div className="absolute inset-0 rounded-xl bg-[#00e5ff]/5 blur-sm animate-pulse"></div>
        </div>
        <div>
          <h1 className="text-[19px] font-bold text-slate-100 tracking-tight font-sans">
            Beacon<span className="text-[#00e5ff]">Mesh</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
            Maritime Emergency OS
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-6 py-8 space-y-2">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive 
                  ? "bg-[#0b2240] text-slate-100 border border-[#1e4976]/40 shadow-[0_0_15px_rgba(0,112,243,0.15)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#07172a] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <IconComponent className={`w-4 h-4 transition-colors ${
                  isActive ? "text-[#00e5ff]" : "text-slate-400 group-hover:text-slate-200"
                }`} />
                <span className="font-sans text-sm tracking-wide">{item.label}</span>
              </div>
              
              {item.badge && item.badge > 0 ? (
                <span className="bg-red-500 text-white text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Quick Action Box */}
      <div className="p-6 border-t border-[#0d2238] bg-[#020912]">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 font-mono">
          Quick Action
        </div>
        <button
          id="btn-quick-broadcast"
          onClick={onSendBroadcastClick}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-[#18090f] hover:bg-[#220c15] border border-red-900/50 hover:border-red-500/60 text-red-400 hover:text-red-300 transition-colors cursor-pointer text-sm font-semibold"
        >
          <AlertTriangle className="w-4 h-4" />
          Broadcast SOS
        </button>

        <button className="mt-3 w-full py-3 rounded-xl bg-[#07172a] hover:bg-[#0b2240] border border-[#0d2238] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-sm font-semibold">
          Add Waypoint
        </button>

        <button className="mt-3 w-full py-3 rounded-xl bg-[#07172a] hover:bg-[#0b2240] border border-[#0d2238] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-sm font-semibold">
          Measure Distance
        </button>
      </div>
    </aside>
  );
}
