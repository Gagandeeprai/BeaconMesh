
import {
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Navigation,
  ChevronRight,
} from "lucide-react";

const missionRows = [
  { icon: AlertTriangle, label: "Type",           value: "Engine Failure",        valueColor: "var(--text-primary)" },
  { icon: MapPin,        label: "Location",       value: "13° 12.45' N, 74° 45.32' E", valueColor: "var(--text-secondary)" },
  { icon: Clock,         label: "Time",           value: "12:43 PM, 23 May 2026", valueColor: "var(--text-secondary)" },
  { icon: Users,         label: "People Onboard", value: "7",                     valueColor: "var(--text-primary)" },
  { icon: Clock,         label: "ETA",            value: "25 min",                valueColor: "var(--text-primary)" },
  { icon: Navigation,   label: "Responders",      value: "CGS Samudra Prahari",   valueColor: "var(--text-primary)" },
];

export default function ActiveMission() {
  return (
    <div className="glass-card flex flex-col select-none overflow-hidden">
      {/* Header Panel */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--border-color)", background: "#0b122020" }}
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          Active Mission
        </span>
        <span
          className="text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase border border-[#ef444450]"
          style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}
        >
          HIGH PRIORITY
        </span>
      </div>

      {/* Main Details Panel */}
      <div className="p-4 flex flex-col gap-4">
        {/* Distress Title Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-xl animate-blink border"
              style={{
                width: 36,
                height: 36,
                background: "rgba(239, 68, 68, 0.08)",
                borderColor: "rgba(239, 68, 68, 0.25)"
              }}
            >
              <AlertTriangle size={18} style={{ color: "var(--accent-red)" }} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide" style={{ color: "#ef4444" }}>
                Distress Alert
              </div>
              <div className="text-xs font-mono font-bold mt-0.5" style={{ color: "var(--text-muted)" }}>
                IND-KA-07-1234
              </div>
            </div>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-md border"
            style={{
              background: "rgba(59, 130, 246, 0.08)",
              color: "var(--sidebar-text-active)",
              borderColor: "rgba(59, 130, 246, 0.2)",
            }}
          >
            In Progress
          </span>
        </div>

        {/* Divider line */}
        <div style={{ height: 1, background: "var(--border-color)" }} />

        {/* Parameter values */}
        <div className="flex flex-col gap-3">
          {missionRows.map(({ icon: Icon, label, value, valueColor }) => (
            <div key={label} className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Icon size={13} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  {label}
                </span>
              </div>
              <span
                className="text-xs font-bold text-right leading-tight max-w-[150px]"
                style={{ color: valueColor }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Click CTA Link */}
        <button
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
            boxShadow: "0 4px 12px rgba(29, 78, 216, 0.2)",
          }}
        >
          View Mission Details
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
