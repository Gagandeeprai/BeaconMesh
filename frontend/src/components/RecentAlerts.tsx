
import { ChevronRight } from "lucide-react";

const alerts = [
  {
    time:        "12:43 PM",
    vesselId:    "IND-KA-07-1234",
    type:        "Engine Failure",
    typeColor:   "#ef4444",
    location:    "13° 12.45' N, 74° 45.32' E",
    status:      "In Progress",
    statusBg:    "rgba(239, 68, 68, 0.12)",
    statusColor: "#f87171",
  },
  {
    time:        "11:28 AM",
    vesselId:    "IND-KA-05-5678",
    type:        "Medical Emergency",
    typeColor:   "#fb923c",
    location:    "13° 01.12' N, 74° 20.11' E",
    status:      "Acknowledged",
    statusBg:    "rgba(245, 158, 11, 0.12)",
    statusColor: "#fbbf24",
  },
  {
    time:        "09:15 AM",
    vesselId:    "IND-KA-08-9101",
    type:        "Mechanical Issue",
    typeColor:   "#fcd34d",
    location:    "12° 45.00' N, 73° 52.20' E",
    status:      "Resolved",
    statusBg:    "rgba(16, 185, 129, 0.12)",
    statusColor: "#34d399",
  },
];

const cols = ["Time", "Vessel ID", "Type", "Location", "Status", ""];

export default function RecentAlerts() {
  return (
    <div className="glass-card flex flex-col flex-shrink-0 select-none overflow-hidden">
      {/* Table Header Section */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <span className="text-sm font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
          Recent Alerts
        </span>
        <button className="text-xs font-semibold hover:underline" style={{ color: "#38bdf8" }}>
          View All Alerts
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", background: "#0b122040" }}>
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-5 py-2.5 text-left text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)", fontSize: "10px" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alerts.map((a, idx) => (
              <tr
                key={idx}
                className="hover:bg-[#14203730] transition-colors cursor-pointer group"
                style={{
                  borderBottom: idx < alerts.length - 1 ? "1px solid var(--border-color)" : "none",
                }}
              >
                <td className="px-5 py-3 text-xs font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {a.time}
                </td>
                <td className="px-5 py-3 text-xs font-mono font-bold" style={{ color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                  {a.vesselId}
                </td>
                <td className="px-5 py-3 text-xs font-semibold" style={{ color: a.typeColor, whiteSpace: "nowrap" }}>
                  {a.type}
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {a.location}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-md border"
                    style={{
                      background: a.statusBg,
                      color: a.statusColor,
                      borderColor: `${a.statusColor}18`,
                    }}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <ChevronRight
                    size={14}
                    className="translate-x-0 group-hover:translate-x-0.5 transition-transform"
                    style={{ color: "var(--text-muted)", display: "inline-block" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
