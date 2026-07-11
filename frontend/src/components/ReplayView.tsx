/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, FastForward,
  Clock, Radio, AlertTriangle, ChevronDown, MapPin, FileText
} from "lucide-react";
import { Vessel } from "../types";
import { INITIAL_VESSELS } from "../data";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface ReplaySession {
  id: string;
  label: string;
  duration: number; // seconds
  vesselCount: number;
  date: string;
  description: string;
}

interface ReplayFrame {
  timestamp: number; // seconds from start
  vesselId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  event?: string; // e.g. "SOS Triggered", "Responder Dispatched"
}

interface ReplayEvent {
  timestamp: number;
  label: string;
  type: "sos" | "dispatch" | "arrival" | "resolve" | "info";
}

// ── Mock data (used offline) ─────────────────────────────────────────────────
const MOCK_SESSIONS: ReplaySession[] = [
  { id: "replay-001", label: "MV Kavaratti Engine Failure", duration: 3600, vesselCount: 4, date: "2026-07-08", description: "Engine failure 28 km off Mangalore coast. CGS Samudra dispatched." },
  { id: "replay-002", label: "Fisherman Medical Emergency", duration: 2700, vesselCount: 2, date: "2026-07-05", description: "Medical emergency on fishing vessel MFV-Sea Eagle. Navy helicopter scrambled." },
  { id: "replay-003", label: "Capsizing Incident — Karwar", duration: 1800, vesselCount: 6, date: "2026-06-28", description: "Fishing vessel capsized 12 km off Karwar in gale conditions." },
];

function buildMockFrames(durationSec: number): ReplayFrame[] {
  const frames: ReplayFrame[] = [];
  const vessels = INITIAL_VESSELS.slice(0, 4);
  const step = 30; // one frame every 30s
  for (let t = 0; t <= durationSec; t += step) {
    vessels.forEach(v => {
      const frac = t / durationSec;
      frames.push({
        timestamp: t,
        vesselId: v.id,
        lat: v.latitude + Math.sin(frac * Math.PI * 2) * 0.05,
        lng: v.longitude + Math.cos(frac * Math.PI * 2) * 0.05,
        heading: (v.heading + frac * 20) % 360,
        speed: v.speed,
        event: t === 300 ? "SOS Triggered" : t === 600 ? "Responder Dispatched" : t === 1500 ? "Arrived On Scene" : undefined,
      });
    });
  }
  return frames;
}

function buildMockEvents(durationSec: number): ReplayEvent[] {
  return [
    { timestamp: 0,    label: "Incident Detected — Engine Failure reported", type: "info" },
    { timestamp: 300,  label: "SOS signal broadcast via VHF Ch16", type: "sos" },
    { timestamp: 600,  label: "CGS Samudra dispatched — ETA 38 min", type: "dispatch" },
    { timestamp: Math.round(durationSec * 0.55), label: "Responder arrived on scene", type: "arrival" },
    { timestamp: Math.round(durationSec * 0.8),  label: "Casualty transferred to shore support", type: "info" },
    { timestamp: durationSec, label: "Mission closed — Resolved", type: "resolve" },
  ];
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const EVENT_STYLES: Record<string, string> = {
  sos:      "text-red-400 bg-red-500/10 border-red-500/30",
  dispatch: "text-[#00e5ff] bg-blue-500/10 border-blue-500/30",
  arrival:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  resolve:  "text-purple-400 bg-purple-500/10 border-purple-500/30",
  info:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

export default function ReplayView() {
  const [sessions, setSessions] = useState<ReplaySession[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [currentSec, setCurrentSec] = useState(0);
  const [playState, setPlayState] = useState<"idle" | "playing" | "paused">("idle");
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [offline, setOffline] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedSession = sessions.find(s => s.id === selectedId) ?? null;
  const duration = selectedSession?.duration ?? 3600;

  // Fetch sessions
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/replay/sessions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) { setSessions(await res.json()); return; }
      } catch { /* fall through */ }
      setOffline(true);
      setSessions(MOCK_SESSIONS);
      setSelectedId(MOCK_SESSIONS[0].id);
    };
    load();
  }, []);

  // Load frames when session changes
  useEffect(() => {
    if (!selectedId) return;
    setPlayState("idle");
    setCurrentSec(0);
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/replay/${selectedId}`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) { const d = await res.json(); setFrames(d.frames ?? []); setEvents(d.events ?? []); return; }
      } catch { /* fall through */ }
      const dur = sessions.find(s => s.id === selectedId)?.duration ?? 3600;
      setFrames(buildMockFrames(dur));
      setEvents(buildMockEvents(dur));
    };
    load();
  }, [selectedId, sessions]);

  // Playback tick
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startPlayback = useCallback(() => {
    stopPlayback();
    intervalRef.current = setInterval(() => {
      setCurrentSec(prev => {
        const next = prev + speed;
        if (next >= duration) { stopPlayback(); setPlayState("idle"); return duration; }
        return next;
      });
    }, 1000);
  }, [speed, duration, stopPlayback]);

  useEffect(() => {
    if (playState === "playing") startPlayback();
    else stopPlayback();
    return stopPlayback;
  }, [playState, startPlayback, stopPlayback]);

  const togglePlay = () => {
    if (playState === "playing") setPlayState("paused");
    else { if (currentSec >= duration) setCurrentSec(0); setPlayState("playing"); }
  };

  // Get current vessel positions from frames
  const currentVesselPositions: Record<string, ReplayFrame> = {};
  frames.filter(f => f.timestamp <= currentSec).forEach(f => {
    currentVesselPositions[f.vesselId] = f;
  });

  // Past events up to current time
  const pastEvents = events.filter(e => e.timestamp <= currentSec);
  const nextEvent = events.find(e => e.timestamp > currentSec);

  return (
    <div id="replay-view" className="p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#00e5ff]" />
            Incident Replay
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Historical incident playback with georeferenced vessel tracks</p>
        </div>
        {offline && (
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> OFFLINE — MOCK SESSION DATA
          </span>
        )}
      </div>

      {/* Session Selector */}
      <div className="relative">
        <button
          id="btn-replay-session-picker"
          onClick={() => setShowSessionPicker(v => !v)}
          className="w-full bg-[#020a14] border border-[#0d2238] rounded-xl px-5 py-4 flex items-center justify-between text-left hover:border-[#1e4976]/60 transition-colors cursor-pointer"
        >
          {selectedSession ? (
            <div>
              <span className="text-sm font-bold text-slate-100">{selectedSession.label}</span>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                {selectedSession.date} · {selectedSession.vesselCount} vessels · {formatTime(selectedSession.duration)}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 text-sm">Select an incident session to replay…</span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showSessionPicker ? "rotate-180" : ""}`} />
        </button>
        {showSessionPicker && (
          <div className="absolute top-full mt-2 w-full bg-[#020a14] border border-[#0d2238] rounded-xl overflow-hidden shadow-2xl z-20">
            {sessions.map(s => (
              <button
                key={s.id}
                id={`replay-session-${s.id}`}
                onClick={() => { setSelectedId(s.id); setShowSessionPicker(false); }}
                className={`w-full px-5 py-3.5 text-left hover:bg-[#07172a] transition-colors border-b border-[#0d2238]/50 last:border-0 ${selectedId === s.id ? "bg-[#0b2240]/40" : ""}`}
              >
                <span className="text-sm font-bold text-slate-200 block">{s.label}</span>
                <span className="text-[10px] text-slate-500 font-mono">{s.date} · {s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSession && (
        <>
          {/* Map placeholder + Vessel Track Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map area (placeholder — actual MapLibre embed would go here once WebSocket stream is live) */}
            <div className="lg:col-span-2 bg-[#020a14] border border-[#0d2238] rounded-xl overflow-hidden shadow-xl" style={{ minHeight: 280 }}>
              <div className="p-4 bg-[#031122] border-b border-[#0d2238] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#00e5ff]" /> Georeferenced Track — T+{formatTime(currentSec)}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {Object.keys(currentVesselPositions).length} vessels tracked
                </span>
              </div>
              <div className="relative w-full h-56 bg-gradient-to-br from-[#020a14] to-[#030d17] flex items-center justify-center">
                {/* Simulated vessel dots on a "radar" style display */}
                <svg viewBox="0 0 400 200" className="w-full h-full opacity-60">
                  {/* Grid */}
                  {[0.33, 0.66].map(p => (
                    <React.Fragment key={p}>
                      <line x1={400 * p} y1="0" x2={400 * p} y2="200" stroke="#0d2238" strokeWidth="0.5" />
                      <line x1="0" y1={200 * p} x2="400" y2={200 * p} stroke="#0d2238" strokeWidth="0.5" />
                    </React.Fragment>
                  ))}
                  {/* Vessel positions (mapped to SVG coords) */}
                  {Object.entries(currentVesselPositions).map(([id, frame]) => {
                    const x = ((frame.lng - 73.5) / 2) * 400;
                    const y = ((14 - frame.lat) / 2) * 200;
                    const isSOS = events.some(e => e.type === "sos" && e.timestamp <= currentSec);
                    return (
                      <g key={id}>
                        <circle cx={x} cy={y} r="4" fill={isSOS && id === Object.keys(currentVesselPositions)[0] ? "#ef4444" : "#00e5ff"} opacity="0.9" />
                        <text x={x + 6} y={y + 4} fill="#94a3b8" fontSize="6" fontFamily="monospace">{id.slice(0, 10)}</text>
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-3 left-3 text-[9px] font-mono text-slate-600">
                  Arabian Sea · Mangalore Coastal Zone
                </div>
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-[#020a14] border border-[#0d2238] rounded-xl overflow-hidden shadow-xl flex flex-col">
              <div className="p-4 bg-[#031122] border-b border-[#0d2238]">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#00e5ff]" /> Incident Event Log
                </h3>
              </div>
              <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-56">
                {pastEvents.length === 0 ? (
                  <p className="text-[10px] text-slate-600 font-mono text-center py-4">Press Play to begin replay…</p>
                ) : (
                  [...pastEvents].reverse().map((ev, i) => (
                    <div key={i} className={`text-[10px] font-mono px-2.5 py-1.5 rounded border ${EVENT_STYLES[ev.type]}`}>
                      <span className="opacity-60 mr-2">{formatTime(ev.timestamp)}</span>
                      {ev.label}
                    </div>
                  ))
                )}
                {nextEvent && (
                  <div className="text-[10px] font-mono text-slate-700 px-2.5 py-1.5 border border-dashed border-slate-800 rounded">
                    Next: {formatTime(nextEvent.timestamp)} — {nextEvent.label}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-5 shadow-xl space-y-4">
            {/* Timeline scrub */}
            <div className="space-y-1">
              <input
                type="range"
                id="replay-timeline-scrub"
                min={0}
                max={duration}
                value={currentSec}
                onChange={e => { setCurrentSec(Number(e.target.value)); setPlayState("paused"); }}
                className="w-full accent-[#00e5ff] bg-[#05162a] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>{formatTime(currentSec)}</span>
                <span>{selectedSession.label}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Buttons row */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {/* Rewind to start */}
                <button
                  id="btn-replay-rewind"
                  onClick={() => { setCurrentSec(0); setPlayState("paused"); }}
                  className="p-2.5 rounded-lg bg-[#05162a] border border-[#0d2238] text-slate-400 hover:text-slate-200 hover:border-[#1e4976]/60 transition-all cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Play / Pause */}
                <button
                  id="btn-replay-play"
                  onClick={togglePlay}
                  className={`p-3 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    playState === "playing"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-[#0070f3] text-white border border-[#0070f3]/60 hover:bg-[#0070f3]/90"
                  }`}
                >
                  {playState === "playing" ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span className="text-sm font-bold">{playState === "playing" ? "Pause" : "Play"}</span>
                </button>

                {/* Skip to end */}
                <button
                  id="btn-replay-skip"
                  onClick={() => { setCurrentSec(duration); setPlayState("paused"); }}
                  className="p-2.5 rounded-lg bg-[#05162a] border border-[#0d2238] text-slate-400 hover:text-slate-200 hover:border-[#1e4976]/60 transition-all cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Speed multiplier */}
              <div className="flex items-center gap-2">
                <FastForward className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-mono text-slate-500 mr-1">Speed:</span>
                {([1, 2, 4] as const).map(s => (
                  <button
                    key={s}
                    id={`btn-replay-speed-${s}x`}
                    onClick={() => setSpeed(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      speed === s
                        ? "bg-[#0b2240] text-[#00e5ff] border border-[#1e4976]/60"
                        : "bg-[#05162a] text-slate-400 border border-[#0d2238] hover:text-slate-200"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <Radio className={`w-3 h-3 ${playState === "playing" ? "text-[#00e5ff] animate-pulse" : "text-slate-600"}`} />
                <span className="text-slate-400">
                  {Math.round((currentSec / duration) * 100)}% complete
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
