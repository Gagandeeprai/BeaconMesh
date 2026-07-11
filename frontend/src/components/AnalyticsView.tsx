/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { BarChart3, TrendingDown, Clock, ShieldAlert, Award, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ── Risk distribution donut ───────────────────────────────────────────────────
interface RiskSlice { label: string; pct: number; color: string; hex: string }
const RISK_SLICES: RiskSlice[] = [
  { label: "Critical", pct: 8,  color: "bg-red-600",    hex: "#dc2626" },
  { label: "High",     pct: 31, color: "bg-red-400",    hex: "#f87171" },
  { label: "Medium",   pct: 45, color: "bg-amber-400",  hex: "#fbbf24" },
  { label: "Low",      pct: 16, color: "bg-emerald-500",hex: "#10b981" },
];

function RiskDonut({ slices }: { slices: RiskSlice[] }) {
  const cx = 60, cy = 60, r = 48, stroke = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {slices.map((s, i) => {
          const dash = (s.pct / 100) * circ;
          const seg = (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={s.hex} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return seg;
        })}
        <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="#020a14" />
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">RISK</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold" fontFamily="monospace">MIX</text>
      </svg>
      <div className="space-y-1.5">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px] font-mono">
            <span className={`w-2 h-2 rounded-full ${s.color} inline-block shrink-0`} />
            <span className="text-slate-400">{s.label}</span>
            <span className="ml-auto text-slate-200 font-bold">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 7-day stacked violations ──────────────────────────────────────────────────
const DAILY_VIOLATIONS = [
  { day: "Mon", protectedArea: 3, loitering: 5, speedAnomaly: 2, aisSilence: 1 },
  { day: "Tue", protectedArea: 2, loitering: 3, speedAnomaly: 4, aisSilence: 2 },
  { day: "Wed", protectedArea: 5, loitering: 6, speedAnomaly: 3, aisSilence: 3 },
  { day: "Thu", protectedArea: 1, loitering: 4, speedAnomaly: 2, aisSilence: 1 },
  { day: "Fri", protectedArea: 4, loitering: 7, speedAnomaly: 5, aisSilence: 4 },
  { day: "Sat", protectedArea: 2, loitering: 3, speedAnomaly: 1, aisSilence: 2 },
  { day: "Sun", protectedArea: 3, loitering: 5, speedAnomaly: 3, aisSilence: 1 },
];
const STACKS = [
  { key: "protectedArea", label: "Protected Area",  color: "#10b981" },
  { key: "loitering",     label: "Loitering",        color: "#f59e0b" },
  { key: "speedAnomaly",  label: "Speed Anomaly",    color: "#3b82f6" },
  { key: "aisSilence",    label: "AIS Silence",      color: "#ef4444" },
];

function StackedViolationBar() {
  const maxTotal = Math.max(...DAILY_VIOLATIONS.map(d =>
    STACKS.reduce((sum, s) => sum + (d as any)[s.key], 0)
  ));
  const HEIGHT = 100;
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-28">
        {DAILY_VIOLATIONS.map((d, di) => {
          const total = STACKS.reduce((sum, s) => sum + (d as any)[s.key], 0);
          let bottom = 0;
          return (
            <div key={di} className="flex-1 flex flex-col-reverse gap-0 relative" style={{ height: HEIGHT }}>
              {STACKS.map(s => {
                const pct = ((d as any)[s.key] / maxTotal) * HEIGHT;
                return (
                  <div key={s.key} title={`${s.label}: ${(d as any)[s.key]}`}
                    style={{ height: pct, background: s.color, opacity: 0.85 }}
                    className="w-full transition-all hover:opacity-100"
                  />
                );
              })}
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-500">{total}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 justify-between text-[9px] font-mono text-slate-600">
        {DAILY_VIOLATIONS.map(d => <span key={d.day} className="flex-1 text-center">{d.day}</span>)}
      </div>
      <div className="flex flex-wrap gap-3">
        {STACKS.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mean response time SVG line graph ────────────────────────────────────────
const RESPONSE_TIMES = [
  { day: "Mon", min: 28 }, { day: "Tue", min: 22 }, { day: "Wed", min: 31 },
  { day: "Thu", min: 19 }, { day: "Fri", min: 24 }, { day: "Sat", min: 35 }, { day: "Sun", min: 21 },
];

function ResponseTimeLine() {
  const W = 100, H = 60;
  const max = 45, min = 0;
  const pts = RESPONSE_TIMES.map((d, i) => {
    const x = (i / (RESPONSE_TIMES.length - 1)) * W;
    const y = H - ((d.min - min) / (max - min)) * H;
    return { x, y, ...d };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const fill = `0,${H} ${polyline} ${W},${H}`;
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 80 }}>
        {/* thresholds */}
        <line x1="0" y1={H - (30 / max) * H} x2="100" y2={H - (30 / max) * H} stroke="#10b981" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
        <line x1="0" y1={H - (20 / max) * H} x2="100" y2={H - (20 / max) * H} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
        <defs>
          <linearGradient id="rt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0070f3" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0070f3" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={fill} fill="url(#rt-grad)" />
        <polyline points={polyline} fill="none" stroke="#0070f3" strokeWidth="1.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill={p.min <= 20 ? "#10b981" : p.min <= 30 ? "#f59e0b" : "#ef4444"} />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] font-mono text-slate-600">
        {RESPONSE_TIMES.map(d => <span key={d.day}>{d.day}</span>)}
      </div>
      <div className="flex gap-4 text-[9px] font-mono text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block" /> &lt;20 min OK</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 inline-block" /> &lt;30 min Target</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-500 inline-block" /> &gt;30 min Overdue</span>
      </div>
    </div>
  );
}

export default function AnalyticsView() {
  const [liveData, setLiveData] = useState<any>(null);

  // Try to fetch live analytics from Person 4's API
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/analytics`, { signal: AbortSignal.timeout(2000) })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setLiveData(d))
      .catch(() => {});
  }, []);

  // Static Analytics Data for Coast Guard Ops Mangalore (Past 12 Months)
  const incidentCategories = [
    { type: "Engine Failure",      count: 42, percentage: 40, color: "bg-red-500" },
    { type: "Medical Emergency",   count: 28, percentage: 26, color: "bg-orange-400" },
    { type: "Mechanical Issue",    count: 18, percentage: 17, color: "bg-yellow-400" },
    { type: "Capsized/Grounding",  count: 12, percentage: 11, color: "bg-blue-400" },
    { type: "Fire Hazard",         count:  6, percentage:  6, color: "bg-red-600" },
  ];

  const monthlyTrend = [
    { month: "Jan", count: 8  },
    { month: "Feb", count: 6  },
    { month: "Mar", count: 11 },
    { month: "Apr", count: 14 },
    { month: "May", count: 22 },
    { month: "Jun", count: 18 },
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

      {/* Row 2: Risk Donut + Stacked Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Donut */}
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Risk Level Distribution
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Across all processed vessel events (YTD)</p>
          </div>
          <RiskDonut slices={RISK_SLICES} />
        </div>

        {/* Daily Violations Stacked Bar */}
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Daily Violation Rate by Type (7-Day)
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Protected Area · Loitering · Speed · AIS Silence</p>
          </div>
          <StackedViolationBar />
        </div>
      </div>

      {/* Row 3: Incident Distribution + Mean Response Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Incident Type Allocation */}
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
                <div className="h-2 w-full bg-[#05162a] border border-[#0d2238] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cat.color} shadow-[0_0_8px_rgba(255,255,255,0.05)]`}
                    style={{ width: `${cat.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mean Response Time + Monthly Trend */}
        <div className="space-y-6">
          {/* Response Time Line */}
          <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00e5ff]" />
                Mean Response Time (7-Day)
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Minutes from SOS to responder on scene</p>
            </div>
            <ResponseTimeLine />
          </div>

          {/* Monthly Trend Bar */}
          <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00e5ff]" />
                Emergency Log Trend (Pre-Monsoon Delta)
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Operational load curve monitoring during swell transition months</p>
            </div>
            <div className="relative w-full h-32 bg-slate-950/20 border border-[#0d2238]/60 rounded-lg p-4 flex items-end justify-between overflow-hidden">
              <div className="absolute inset-x-0 top-1/4 border-b border-[#0d2238]/20 pointer-events-none" />
              <div className="absolute inset-x-0 top-2/4 border-b border-[#0d2238]/20 pointer-events-none" />
              <div className="absolute inset-x-0 top-3/4 border-b border-[#0d2238]/20 pointer-events-none" />
              {monthlyTrend.map((data, index) => {
                const heightRatio = (data.count / 25) * 100;
                return (
                  <div key={index} className="flex flex-col items-center gap-2 flex-1 z-10 group relative">
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#071d33] border border-[#0e2946] text-[#00e5ff] font-mono text-[9px] px-2 py-0.5 rounded shadow-lg transition-all duration-200 pointer-events-none">
                      {data.count} Calls
                    </span>
                    <div className="w-8 rounded-t bg-gradient-to-t from-[#0051ff]/30 to-[#00e5ff] border border-blue-500/40 hover:brightness-125 transition-all duration-300"
                      style={{ height: `${heightRatio}px` }} />
                    <span className="text-[10px] text-slate-400 font-mono">{data.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 font-sans flex items-start gap-2 border-t border-[#0d2238]/40 pt-3">
              <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />
              <span>METEOROLOGICAL OBS: May spikes correspond to transition swells prior to monsoon safety bans.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
