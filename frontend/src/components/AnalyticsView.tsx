/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BarChart3, TrendingDown, Clock, ShieldAlert, Award } from "lucide-react";

export default function AnalyticsView() {
  // Static Analytics Data for Coast Guard Ops Mangalore (Past 12 Months)
  const incidentCategories = [
    { type: "Engine Failure", count: 42, percentage: 40, color: "bg-red-500" },
    { type: "Medical Emergency", count: 28, percentage: 26, color: "bg-orange-400" },
    { type: "Mechanical Issue", count: 18, percentage: 17, color: "bg-yellow-400" },
    { type: "Capsized/Grounding", count: 12, percentage: 11, color: "bg-blue-400" },
    { type: "Fire Hazard", count: 6, percentage: 6, color: "bg-red-600" }
  ];

  const monthlyTrend = [
    { month: "Jan", count: 8 },
    { month: "Feb", count: 6 },
    { month: "Mar", count: 11 },
    { month: "Apr", count: 14 },
    { month: "May", count: 22 }, // Pre-monsoon swells
    { month: "Jun", count: 18 }  // Current
  ];

  return (
    <div id="analytics-view" className="p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingDown className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold block">Incident Rate Delta</span>
            <span className="text-xl font-bold text-slate-100 font-sans mt-0.5 block">-14.2%</span>
            <span className="text-[10px] text-emerald-400 font-mono">VS PRE-MONSOON CLUSTER</span>
          </div>
        </div>

        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#00e5ff]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold block">Mean Rescue Intercept</span>
            <span className="text-xl font-bold text-slate-100 font-sans mt-0.5 block">24.5 min</span>
            <span className="text-[10px] text-slate-400 font-mono">TARGET: 30.0 min</span>
          </div>
        </div>

        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold block">Successful Salvage Ratio</span>
            <span className="text-xl font-bold text-slate-100 font-sans mt-0.5 block">98.2%</span>
            <span className="text-[10px] text-purple-400 font-mono">104 SUCCESSFUL MISSIONS YTD</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Incident Type Allocation (Custom visual bar charts) */}
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#00e5ff]" />
              Annual Incident Distribution (YTD)
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Classification index for emergency logs registered under Mangalore Division</p>
          </div>

          <div className="space-y-4">
            {incidentCategories.map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-slate-300 font-semibold">{cat.type}</span>
                  <span className="text-slate-400 font-mono">{cat.count} Incidents ({cat.percentage}%)</span>
                </div>
                {/* Visual bar tracker */}
                <div className="h-2 w-full bg-[#05162a] border border-[#0d2238] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${cat.color} shadow-[0_0_8px_rgba(255,255,255,0.05)]`}
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Incident Frequency (Interactive Custom Vector Line Graph) */}
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00e5ff]" />
              Emergency Log Trend (Pre-Monsoon Delta)
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Operational load curve monitoring during swell transition months</p>
          </div>

          {/* Fully custom-drawn responsive vector line graph */}
          <div className="relative w-full h-44 bg-slate-950/20 border border-[#0d2238]/60 rounded-lg p-4 flex items-end justify-between overflow-hidden">
            {/* Grid Line lines behind */}
            <div className="absolute inset-x-0 top-1/4 border-b border-[#0d2238]/20 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-2/4 border-b border-[#0d2238]/20 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-3/4 border-b border-[#0d2238]/20 pointer-events-none"></div>

            {/* Render the Monthly graph bars/labels */}
            {monthlyTrend.map((data, index) => {
              // Calculate responsive height ratio
              const heightRatio = (data.count / 25) * 100; // max count is around 22

              return (
                <div key={index} className="flex flex-col items-center gap-2 flex-1 z-10 group relative">
                  {/* Tooltip on Hover */}
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[#071d33] border border-[#0e2946] text-[#00e5ff] font-mono text-[9px] px-2 py-0.5 rounded shadow-lg transition-all duration-200 pointer-events-none">
                    {data.count} Calls
                  </span>

                  {/* Vertical bar */}
                  <div 
                    className="w-8 rounded-t bg-gradient-to-t from-[#0051ff]/30 to-[#00e5ff] border border-blue-500/40 hover:brightness-125 transition-all duration-300"
                    style={{ height: `${heightRatio}px` }}
                  ></div>

                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-mono">{data.month}</span>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-500 font-sans flex items-start gap-2 border-t border-[#0d2238]/40 pt-3">
            <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />
            <span>METEOROLOGICAL OBS: May spikes correspond to transition swells prior to monsoon safety bans. Heavy maritime enforcement deployed successfully.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
