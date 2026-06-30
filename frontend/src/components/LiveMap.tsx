
import { Maximize2, Plus, Minus, Crosshair, ChevronDown } from "lucide-react";

// Simulated vessel coordinates on chart
const vessels = [
  { id: "v1", type: "fishing",  x: 27, y: 22, label: "IND-KA-03-1122" },
  { id: "v2", type: "fishing",  x: 41, y: 18, label: "IND-KA-03-5543" },
  { id: "v3", type: "fishing",  x: 21, y: 42, label: "IND-KA-03-7720" },
  { id: "v4", type: "support",  x: 50, y: 55, label: "CGS Samudra Prahari" },
  { id: "v5", type: "complete", x: 74, y: 30, label: "IND-KA-08-0012" },
  { id: "v6", type: "fishing",  x: 48, y: 80, label: "IND-KA-03-9934" },
  { id: "v7", type: "support",  x: 58, y: 78, label: "CGS Samudra Rakshak" },
];

const sos = { x: 45, y: 46, id: "IND-KA-07-1234" };
const port = { x: 67, y: 35, label: "Mangalore" };

// Mesh routing links from distressed vessel to neighbors and gateway
const meshLinks = [
  { from: { x: 45, y: 46 }, to: { x: 27, y: 22 }, color: "#ef4444" },
  { from: { x: 45, y: 46 }, to: { x: 41, y: 18 }, color: "#ef4444" },
  { from: { x: 45, y: 46 }, to: { x: 21, y: 42 }, color: "#ef4444" },
  { from: { x: 45, y: 46 }, to: { x: 50, y: 55 }, color: "#22c55e" },
  { from: { x: 50, y: 55 }, to: { x: 67, y: 35 }, color: "#22c55e" }, // Forwarding to gateway port
];

export default function LiveMap() {
  return (
    <div
      className="relative rounded-xl overflow-hidden flex-1 select-none animate-fade-in"
      style={{
        border: "1px solid var(--border-color)",
        background: "#050b14",
        minHeight: 0,
      }}
    >
      {/* Map Control Header */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: "linear-gradient(to bottom, rgba(8,13,26,0.9) 0%, rgba(8,13,26,0) 100%)",
        }}
      >
        <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
          Live Maritime Overview
        </span>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            All Vessels <ChevronDown size={12} />
          </button>
          <button
            className="p-1.5 rounded-lg border hover:bg-slate-800 transition-colors"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
          >
            <Maximize2 size={13} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* Map Graphic Canvas */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Ocean Background Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 35% 50%, #0c1a2f 0%, #060e1b 100%)",
          }}
        />

        {/* Coastline Shore Representation */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Coordinate Grids */}
          {[15, 30, 45, 60, 75, 90].map((p, i) => (
            <g key={i}>
              <line x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="#162640" strokeWidth="0.5" strokeDasharray="2 4" />
              <line x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke="#162640" strokeWidth="0.5" strokeDasharray="2 4" />
            </g>
          ))}

          {/* Shore Landmass Path (realistic curve for Karnataka coast near Mangalore) */}
          {/* Water -> Beach -> Land */}
          <path
            d="M 640,-10 C 620,120 590,190 580,260 C 570,330 600,410 590,490 C 585,530 580,560 595,620 L 800,620 L 800,-10 Z"
            fill="#082218"
            opacity="0.8"
          />
          {/* Forest details layer */}
          <path
            d="M 660,-10 C 640,110 610,180 600,250 C 590,320 620,400 610,480 C 605,520 600,550 615,620 L 800,620 L 800,-10 Z"
            fill="#061a12"
            opacity="0.9"
          />
          {/* Sandy shore line */}
          <path
            d="M 640,-10 C 620,120 590,190 580,260 C 570,330 600,410 590,490 C 585,530 580,560 595,620"
            fill="none"
            stroke="#9f7e49"
            strokeWidth="3.5"
            opacity="0.75"
          />
          {/* Shallow water edge glow */}
          <path
            d="M 640,-10 C 620,120 590,190 580,260 C 570,330 600,410 590,490 C 585,530 580,560 595,620"
            fill="none"
            stroke="#0e3a5f"
            strokeWidth="8"
            opacity="0.4"
          />

          {/* Dotted mesh forwarding routes */}
          {meshLinks.map((link, idx) => (
            <line
              key={idx}
              x1={`${link.from.x}%`}
              y1={`${link.from.y}%`}
              x2={`${link.to.x}%`}
              y2={`${link.to.y}%`}
              stroke={link.color}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          ))}
        </svg>

        {/* Latitude/Longitude labels */}
        <div className="absolute left-2 top-[30%] text-[9px] font-semibold text-slate-500">13° 20.00' N</div>
        <div className="absolute left-2 top-[60%] text-[9px] font-semibold text-slate-500">13° 00.00' N</div>
        <div className="absolute left-[30%] bottom-2 text-[9px] font-semibold text-slate-500">74° 20.00' E</div>
        <div className="absolute left-[60%] bottom-2 text-[9px] font-semibold text-slate-500">74° 40.00' E</div>

        {/* Mangalore Port Coordinate Node */}
        <div
          className="absolute z-10 flex flex-col items-center"
          style={{ left: `${port.x}%`, top: `${port.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <div
            className="px-2 py-0.5 rounded text-[10px] font-bold border"
            style={{
              background: "rgba(11,19,37,0.85)",
              color: "#e2e8f0",
              borderColor: "var(--border-color)",
            }}
          >
            {port.label}
          </div>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#94a3b8",
              border: "1px solid #fff",
              marginTop: 3,
            }}
          />
        </div>

        {/* Vessel Nodes */}
        {vessels.map((v) => {
          const color = v.type === "fishing" ? "#10b981" : v.type === "support" ? "#3b82f6" : "#64748b";
          return (
            <div
              key={v.id}
              className="vessel-marker z-10"
              style={{ left: `${v.x}%`, top: `${v.y}%` }}
              title={v.label}
            >
              {/* Pulse glow background */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 24,
                  height: 24,
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  transform: "translate(-50%, -50%)",
                  top: "50%",
                  left: "50%",
                }}
              />
              {/* Core Icon wrapper */}
              <div
                className="relative rounded-lg flex items-center justify-center border"
                style={{
                  width: 18,
                  height: 18,
                  background: "#080d1a",
                  borderColor: color,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
                  <path d="M2 13h20M4 13L7 5h10l3 8M9 5V3h6v2" />
                </svg>
              </div>
            </div>
          );
        })}

        {/* SOS Pulse Node */}
        <div
          className="absolute z-20"
          style={{
            left: `${sos.x}%`,
            top: `${sos.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Overlapping concentric ripple rings */}
          {[1, 2].map((r) => (
            <div
              key={r}
              className="absolute rounded-full"
              style={{
                width: r * 56,
                height: r * 56,
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                animation: `ripple ${1.5 + r * 0.4}s ease-out infinite`,
                animationDelay: `${r * 0.3}s`,
              }}
            />
          ))}
          {/* Pulser Button */}
          <div
            className="flex items-center justify-center rounded-full font-black text-white animate-pulse-sos border-2 border-white"
            style={{
              width: 50,
              height: 50,
              background: "var(--accent-red)",
              fontSize: "12px",
              boxShadow: "0 0 16px rgba(239,68,68,0.5)",
              transform: "translate(-50%, -50%)",
            }}
          >
            SOS
          </div>
        </div>
      </div>

      {/* Map zooming overlay button controls */}
      <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-1.5">
        {[Plus, Minus, Crosshair].map((Icon, i) => (
          <button
            key={i}
            className="flex items-center justify-center rounded-xl border hover:bg-slate-800 transition-colors"
            style={{
              width: 28,
              height: 28,
              background: "rgba(8,13,26,0.85)",
              borderColor: "var(--border-color)",
              color: "var(--text-secondary)",
            }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Legend display */}
      <div
        className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 p-3 rounded-xl border"
        style={{
          background: "rgba(8,13,26,0.85)",
          borderColor: "var(--border-color)",
        }}
      >
        {[
          { color: "var(--accent-red)", label: "Distress Alert" },
          { color: "var(--accent-blue)", label: "Active Vessel" },
          { color: "var(--accent-green)", label: "Support Vessel" },
          { color: "var(--text-secondary)", label: "Completed Mission" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
