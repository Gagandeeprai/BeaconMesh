/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Activity, Zap, AlertTriangle, Play, Square, BarChart3, Cpu, Radio } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const HISTORY_LEN = 60;

interface MetricsSnapshot {
  throughput: number;
  p50Us: number;
  p99Us: number;
  maxUs: number;
  benchmarkActive: boolean;
  totalProcessed?: number;
}

function mockSnapshot(prev: MetricsSnapshot, benchmarkActive: boolean): MetricsSnapshot {
  const base = benchmarkActive ? 48000 + Math.random() * 4000 : 1200 + Math.random() * 800;
  return {
    throughput: Math.round(base),
    p50Us: benchmarkActive ? 18 + Math.random() * 6 : 45 + Math.random() * 20,
    p99Us: benchmarkActive ? 80 + Math.random() * 40 : 180 + Math.random() * 60,
    maxUs: benchmarkActive ? 250 + Math.random() * 100 : 450 + Math.random() * 200,
    benchmarkActive,
    totalProcessed: (prev.totalProcessed ?? 0) + Math.round(base * 1.5),
  };
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

function latencyColor(us: number): string {
  if (us < 100) return "#10b981";
  if (us < 500) return "#f59e0b";
  return "#ef4444";
}

function LatencyGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.min(1, value / 1000);
  const color = latencyColor(value);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#0d2238" strokeWidth="6"
          strokeDasharray={`${circ * 0.75} ${circ}`} strokeDashoffset={circ * 0.125} strokeLinecap="round" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.125} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.4s ease" }} />
        <text x="40" y="38" textAnchor="middle" fill={color} fontSize="11" fontWeight="bold" fontFamily="monospace">
          {value < 1000 ? value.toFixed(0) : (value / 1000).toFixed(1) + "ms"}
        </text>
        <text x="40" y="52" textAnchor="middle" fill="#475569" fontSize="7" fontFamily="monospace">μs</text>
      </svg>
      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function Sparkline({ data, color, height = 80 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 100 / (data.length - 1);
  const pts = data.map((v, i) => `${i * w},${height - (v / max) * (height - 4)}`).join(" ");
  const last = data[data.length - 1];
  const dotY = height - (last / max) * (height - 4);
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1="0" y1={height * p} x2="100" y2={height * p} stroke="#0d2238" strokeWidth="0.5" />
      ))}
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} 100,${height}`} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="100" cy={dotY} r="2" fill={color} />
    </svg>
  );
}

export default function IngestionPanel() {
  const [metrics, setMetrics] = useState<MetricsSnapshot>({
    throughput: 0, p50Us: 0, p99Us: 0, maxUs: 0, benchmarkActive: false, totalProcessed: 0,
  });
  const [history, setHistory] = useState<number[]>(Array(HISTORY_LEN).fill(0));
  const [offline, setOffline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const benchRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/metrics`, { signal: AbortSignal.timeout(1200) });
        if (res.ok) {
          const d: MetricsSnapshot = await res.json();
          setMetrics(d);
          setHistory(h => [...h.slice(-(HISTORY_LEN - 1)), d.throughput]);
          setOffline(false);
          benchRef.current = d.benchmarkActive;
          return;
        }
      } catch { /* fall through to mock */ }
      setOffline(true);
      setMetrics(prev => {
        const snap = mockSnapshot(prev, benchRef.current);
        setHistory(h => [...h.slice(-(HISTORY_LEN - 1)), snap.throughput]);
        return snap;
      });
    };
    poll();
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, []);

  const toggleBench = async () => {
    setToggling(true);
    const next = !metrics.benchmarkActive;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/stress-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: next }),
      });
      const d = res.ok ? await res.json() : null;
      const active = d?.benchmarkActive ?? next;
      benchRef.current = active;
      setMetrics(p => ({ ...p, benchmarkActive: active }));
    } catch {
      benchRef.current = next;
      setMetrics(p => ({ ...p, benchmarkActive: next }));
    } finally { setToggling(false); }
  };

  const isActive = metrics.benchmarkActive;

  const kpis = [
    { label: "Throughput", value: formatNum(metrics.throughput) + " msg/s", Icon: Zap,      color: isActive ? "text-red-400" : "text-[#00e5ff]" },
    { label: "Total Processed",  value: formatNum(metrics.totalProcessed ?? 0), Icon: Cpu,  color: "text-emerald-400" },
    { label: "p99 Latency",  value: metrics.p99Us.toFixed(0) + " μs",  Icon: Activity,     color: metrics.p99Us < 100 ? "text-emerald-400" : metrics.p99Us < 500 ? "text-amber-400" : "text-red-400" },
    { label: "Engine Status", value: isActive ? "SAT TEST" : "LIVE",   Icon: Radio,         color: isActive ? "text-red-400" : "text-emerald-400" },
  ];

  return (
    <div id="ingest-monitor-view" className="p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00e5ff]" />
            Ingestion Performance Monitor
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Real-time telemetry pipeline statistics · Go processing engine</p>
        </div>
        <div className="flex items-center gap-3">
          {offline && (
            <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> SIMULATED DATA
            </span>
          )}
          <span className={`text-[10px] font-mono px-2 py-1 rounded border flex items-center gap-1.5 ${isActive ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" : "bg-slate-500/10 text-slate-400 border-slate-700"}`}>
            <Radio className="w-3 h-3" />{isActive ? "STRESS TEST ACTIVE" : "NORMAL OPERATION"}
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, Icon, color }, i) => (
          <div key={i} className="bg-[#020a14] border border-[#0d2238] rounded-xl p-4 flex items-center gap-3 shadow-md">
            <div className={`p-2.5 rounded-lg bg-[#05162a] border border-[#0d2238] ${color}`}><Icon className="w-4 h-4" /></div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">{label}</span>
              <span className={`text-base font-bold font-mono ${color} block mt-0.5`}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sparkline */}
        <div className="lg:col-span-2 bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00e5ff]" />Throughput — Last 90 Seconds
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Ingestion rate (msg/s) · 1.5s resolution</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-[#00e5ff]">{formatNum(metrics.throughput)}</span>
              <span className="text-xs text-slate-500 font-mono block">msg/s</span>
            </div>
          </div>
          <div className="bg-[#030d17] rounded-lg p-3 border border-[#0d2238]/60">
            <Sparkline data={history} color={isActive ? "#ef4444" : "#00e5ff"} height={80} />
            <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-1 px-1">
              <span>−90s</span><span>−60s</span><span>−30s</span><span>now</span>
            </div>
          </div>
          <p className="text-[9px] font-mono text-slate-600">
            Peak: {formatNum(Math.max(...history))} msg/s · Target floor: ≥50K msg/s (in-process only)
          </p>
        </div>

        {/* Latency Gauges */}
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Processing Latency</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">In-process path only</p>
          </div>
          <div className="flex items-center justify-around py-2">
            <LatencyGauge label="p50" value={Math.round(metrics.p50Us)} />
            <LatencyGauge label="p99" value={Math.round(metrics.p99Us)} />
            <LatencyGauge label="max" value={Math.round(metrics.maxUs)} />
          </div>
          <div className="space-y-1.5 text-[9.5px] font-mono">
            {[["bg-emerald-500","text-emerald-400","< 100 μs","Optimal"],["bg-amber-500","text-amber-400","100–500 μs","Caution"],["bg-red-500","text-red-400","> 500 μs","Overloaded"]].map(([bg,tc,l,n]) => (
              <div key={l} className="flex items-center gap-2 text-slate-500">
                <span className={`w-2 h-2 rounded-full ${bg} inline-block`} />
                <span>{l}</span><span className={`ml-auto ${tc}`}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stress-Test Control */}
      <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />SAT Stress-Test Controller
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-1 max-w-lg leading-relaxed">
              Activates the in-process unbounded generator pushing mock vessel coordinates into the engine's
              buffered jobs channel at maximum rate to verify the ≥ 50,000 msg/s throughput floor.
            </p>
          </div>
          <button
            id="btn-toggle-stress-test"
            onClick={toggleBench}
            disabled={toggling}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50 ${isActive ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20"}`}
          >
            {isActive ? <><Square className="w-4 h-4" /> Stop Stress Test</> : <><Play className="w-4 h-4" /> Start Stress Test</>}
          </button>
        </div>
        {isActive && (
          <div className="mt-4 grid grid-cols-3 gap-4 bg-red-500/5 border border-red-900/30 rounded-xl p-4 text-xs font-mono">
            <div><span className="text-slate-500 block">Current Rate</span><span className="text-red-400 font-bold text-base">{formatNum(metrics.throughput)} msg/s</span></div>
            <div><span className="text-slate-500 block">p99 Latency</span><span className="text-amber-400 font-bold text-base">{metrics.p99Us.toFixed(1)} μs</span></div>
            <div><span className="text-slate-500 block">Floor Target</span><span className={`font-bold text-base ${metrics.throughput >= 50000 ? "text-emerald-400" : "text-red-400"}`}>{metrics.throughput >= 50000 ? "✓ PASSING" : "✗ BELOW"}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
