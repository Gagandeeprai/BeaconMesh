/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertTriangle, Ship, Radio, Clock } from "lucide-react";
import { Alert, Vessel, Mission } from "../types";

interface SummaryCardsProps {
  alerts: Alert[];
  vessels: Vessel[];
  missions: Mission[];
}

export default function SummaryCards({ alerts, vessels, missions }: SummaryCardsProps) {
  const activeAlertsCount = alerts.filter(a => a.status !== "Resolved").length;
  const highPriorityCount = alerts.filter(a => a.status !== "Resolved" && a.severity === "High").length;
  
  const vesselsOnlineCount = vessels.filter(v => v.status !== "Offline").length;
  const activeMissionsCount = missions.filter(m => m.status !== "Completed").length;
  const avgResponseTime = 28; // Standard from image

  const cards = [
    {
      id: "summary-active-alerts",
      title: "Active Alerts",
      value: activeAlertsCount,
      subtext: `${highPriorityCount} High Priority`,
      icon: AlertTriangle,
      color: "red",
      themeClass: {
        card: "bg-[#18090f] border-red-900/30 hover:border-red-500/30",
        iconContainer: "bg-red-500/10 text-red-400 border border-red-500/20",
        valueText: "text-red-400",
        glow: "shadow-[0_0_20px_rgba(239,68,68,0.05)]"
      }
    },
    {
      id: "summary-vessels-online",
      title: "Vessels Online",
      value: vesselsOnlineCount,
      subtext: "Across 3 Regions",
      icon: Ship,
      color: "emerald",
      themeClass: {
        card: "bg-[#041512] border-emerald-950/40 hover:border-emerald-500/20",
        iconContainer: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        valueText: "text-emerald-400",
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.05)]"
      }
    },
    {
      id: "summary-active-missions",
      title: "Active Missions",
      value: activeMissionsCount,
      subtext: "In Progress",
      icon: Radio,
      color: "blue",
      themeClass: {
        card: "bg-[#050f1f] border-blue-950/40 hover:border-blue-500/20",
        iconContainer: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        valueText: "text-blue-400",
        glow: "shadow-[0_0_20px_rgba(59,130,246,0.05)]"
      }
    },
    {
      id: "summary-avg-response",
      title: "Avg. Response Time",
      value: `${avgResponseTime} min`,
      subtext: "This Month",
      icon: Clock,
      color: "purple",
      themeClass: {
        card: "bg-[#0e091b] border-purple-950/40 hover:border-purple-500/20",
        iconContainer: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        valueText: "text-purple-400",
        glow: "shadow-[0_0_20px_rgba(168,85,247,0.05)]"
      }
    }
  ];

  return (
    <div id="summary-cards-container" className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className={`py-7 px-6 min-h-[154px] rounded-2xl border transition-all duration-300 flex flex-col justify-between ${card.themeClass.card} ${card.themeClass.glow} hover:translate-y-[-2px]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                {card.title}
              </span>
              <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center ${card.themeClass.iconContainer}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
            </div>
            
            <div className="mt-5">
              <div className={`text-3xl font-bold font-sans tracking-tight ${card.themeClass.valueText}`}>
                {card.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 font-mono flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
