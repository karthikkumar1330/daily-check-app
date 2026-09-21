import type { ReactNode } from "react";

interface BreakdownBarProps {
  label: string;
  completed: number;
  total: number;
  pct: number | null;
  color?: string;
  badge?: ReactNode;
  sublabel?: string;
}

export default function BreakdownBar({
  label,
  completed,
  total,
  pct,
  color = "var(--accent, #0d9488)",
  badge,
  sublabel
}: BreakdownBarProps) {
  const safePct = pct !== null && !isNaN(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 0;
  const pctText = pct !== null && !isNaN(pct) ? `${Math.round(pct)}%` : "—";
  const countText = total > 0 ? `${completed} / ${total}` : "0 tasks";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 0"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {badge}
          <span>{label}</span>
          {sublabel && (
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-muted)" }}>
              {sublabel}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
            {countText}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 38, textAlign: "right" }}>
            {pctText}
          </span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={`${label} completion`}
        aria-valuenow={pct !== null ? safePct : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={pct !== null ? `${safePct} percent, ${countText}` : "No tasks"}
        style={{
          width: "100%",
          height: 8,
          borderRadius: 4,
          background: "var(--surface-2, rgba(0, 0, 0, 0.06))",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <div
          style={{
            width: `${safePct}%`,
            height: "100%",
            borderRadius: 4,
            background: color,
            transition: "width 0.3s ease"
          }}
        />
      </div>
    </div>
  );
}
