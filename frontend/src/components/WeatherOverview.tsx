
import { Cloud } from "lucide-react";

export default function WeatherOverview() {
  return (
    <div className="glass-card flex flex-col select-none overflow-hidden">
      {/* Header Panel */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--border-color)", background: "#0b122020" }}
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          Weather Overview
        </span>
        <button className="text-xs font-semibold hover:underline" style={{ color: "#38bdf8" }}>
          View Forecast
        </button>
      </div>

      {/* Weather Info */}
      <div className="p-4 flex flex-col gap-4">
        {/* Climate Details */}
        <div className="flex items-center gap-4">
          {/* Custom animated cloud box */}
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0 border"
            style={{
              width: 52,
              height: 52,
              background: "rgba(59, 130, 246, 0.08)",
              borderColor: "rgba(59, 130, 246, 0.2)",
            }}
          >
            <div className="relative flex flex-col items-center">
              <Cloud size={24} style={{ color: "#60a5fa" }} />
              {/* Raindrop elements */}
              <div className="flex gap-1 mt-1 justify-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 2,
                      height: 6,
                      background: "#60a5fa",
                      borderRadius: 1,
                      opacity: 0.8,
                      animation: `blink-badge ${1.2 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
              Moderate Rain
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: "var(--text-secondary)" }}>
              Wind: 18 km/h · SW
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Wave Height: 1.6 m
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div style={{ height: 1, background: "var(--border-color)" }} />

        {/* Muted stats */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Visibility
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: "var(--text-primary)" }}>
              6 km
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Sea State
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: "var(--accent-amber)" }}>
              Moderate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
