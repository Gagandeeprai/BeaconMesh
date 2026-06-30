
import { AlertTriangle, Ship, Flag, Clock } from "lucide-react";

const stats = [
  {
    icon:      AlertTriangle,
    iconColor: "var(--accent-red)",
    iconBg:    "rgba(239, 68, 68, 0.1)",
    value:     "3",
    label:     "Active Alerts",
    sub:       "2 High Priority",
  },
  {
    icon:      Ship,
    iconColor: "var(--accent-green)",
    iconBg:    "rgba(16, 185, 129, 0.1)",
    value:     "128",
    label:     "Vessels Online",
    sub:       "Across 3 Regions",
  },
  {
    icon:      Flag,
    iconColor: "var(--accent-blue)",
    iconBg:    "rgba(59, 130, 246, 0.1)",
    value:     "2",
    label:     "Active Missions",
    sub:       "In Progress",
  },
  {
    icon:      Clock,
    iconColor: "var(--accent-purple)",
    iconBg:    "rgba(139, 92, 246, 0.1)",
    value:     "28 min",
    label:     "Avg. Response Time",
    sub:       "This Month",
  },
];

export default function StatsRow() {
  return (
    <div className="grid grid-cols-4 gap-3 flex-shrink-0 select-none">
      {stats.map(({ icon: Icon, iconColor, iconBg, value, label, sub }) => (
        <div
          key={label}
          className="glass-card p-4 flex items-start gap-4 hover:border-slate-700 transition-colors cursor-default"
        >
          {/* Icon Box */}
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0 border border-transparent"
            style={{
              width: 44,
              height: 44,
              background: iconBg,
              borderColor: `${iconColor}15`,
            }}
          >
            <Icon size={20} style={{ color: iconColor }} />
          </div>
          {/* Label Details */}
          <div>
            <div className="text-sm font-bold tracking-wide" style={{ color: "var(--text-muted)" }}>
              {label}
            </div>
            <div
              className="text-2xl font-extrabold leading-none mt-1 tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {value}
            </div>
            <div
              className="text-xs font-semibold mt-1.5"
              style={{ color: "var(--text-muted)", fontSize: "10px" }}
            >
              {sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
