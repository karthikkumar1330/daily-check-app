import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  subtext?: string | null;
  icon?: ReactNode;
  ariaLabel?: string;
  testId?: string;
}

export default function MetricCard({
  label,
  value,
  subtext,
  icon,
  ariaLabel,
  testId
}: MetricCardProps) {
  const displayValue = value === null || value === undefined || value === "" ? "—" : value;

  return (
    <div
      className="card insight-metric-card"
      data-testid={testId}
      aria-label={ariaLabel || `${label}: ${displayValue}${subtext ? ` (${subtext})` : ""}`}
      tabIndex={0}
      style={{
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 88,
        borderRadius: "var(--radius-sm, 12px)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        outline: "none",
        position: "relative"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 4
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--ink-muted)"
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            aria-hidden="true"
            style={{
              fontSize: 14,
              color: "var(--ink-muted)",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2
          }}
        >
          {displayValue}
        </span>
        {subtext && (
          <span
            style={{
              fontSize: 12,
              color: "var(--ink-muted)",
              fontWeight: 500
            }}
          >
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
