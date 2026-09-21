import { useState } from "react";
import type { DailyInsightMetrics } from "../../utils/insightsUtils";
import { formatShort, weekdayLetter } from "../../utils/dateUtils";

interface TrendChartProps {
  dailyMetrics: DailyInsightMetrics[];
  height?: number;
}

export default function TrendChart({ dailyMetrics, height = 140 }: TrendChartProps) {
  const [hoveredDay, setHoveredDay] = useState<DailyInsightMetrics | null>(null);

  if (!dailyMetrics || dailyMetrics.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: 20,
          textAlign: "center",
          color: "var(--ink-muted)",
          fontSize: 13
        }}
      >
        No trend data available.
      </div>
    );
  }

  const count = dailyMetrics.length;
  // Determine if dense layout (30 or 90 days)
  const isDense = count > 14;

  return (
    <div
      className="card trend-chart-card"
      style={{
        padding: "16px 16px 12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm, 12px)",
        position: "relative"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--ink-muted)"
          }}
        >
          Completion Trend
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--ink-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: "var(--accent, #0d9488)"
              }}
            />
            80%+ Success
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: "var(--amber, #f59e0b)"
              }}
            />
            &lt;80%
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 2,
                background: "var(--ink-muted)",
                opacity: 0.4
              }}
            />
            No tasks
          </span>
        </div>
      </div>

      {/* Tooltip display */}
      <div
        style={{
          minHeight: 22,
          marginBottom: 8,
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ink)"
        }}
      >
        {hoveredDay ? (
          <span>
            <strong>{formatShort(hoveredDay.date)}</strong>:{" "}
            {hoveredDay.total === 0 ? (
              <span style={{ color: "var(--ink-muted)" }}>Zero-task day (skipped)</span>
            ) : (
              <span>
                {hoveredDay.completed} / {hoveredDay.total} tasks (
                {Math.round(hoveredDay.pct ?? 0)}%
                {hoveredDay.pct !== null && hoveredDay.pct >= 80 ? " \u2022 \u2713 Target met" : ""})
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>
            Hover or tap any bar for day details
          </span>
        )}
      </div>

      {/* Responsive Bar Container with 80% reference guide */}
      <div
        style={{
          position: "relative",
          height,
          display: "flex",
          alignItems: "flex-end",
          gap: isDense ? (count > 45 ? 1 : 2) : 6,
          paddingTop: 8,
          paddingBottom: 22,
          borderBottom: "1px solid var(--border)"
        }}
        onMouseLeave={() => setHoveredDay(null)}
      >
        {/* 80% Benchmark Line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${100 - 80}%`,
            borderTop: "1px dashed var(--accent, #0d9488)",
            opacity: 0.35,
            pointerEvents: "none",
            zIndex: 1
          }}
          aria-hidden="true"
        />

        {dailyMetrics.map((d) => {
          const isZero = d.total === 0;
          const pctVal = isZero ? 0 : Math.max(d.pct ?? 0, 4);
          const isSuccess = d.pct !== null && d.pct >= 80;
          const isHovered = hoveredDay?.date === d.date;

          const barColor = isZero
            ? "var(--surface-2, rgba(0,0,0,0.06))"
            : isSuccess
            ? "var(--accent, #0d9488)"
            : "var(--amber, #f59e0b)";

          return (
            <button
              key={d.date}
              type="button"
              onMouseEnter={() => setHoveredDay(d)}
              onFocus={() => setHoveredDay(d)}
              onClick={() => setHoveredDay(d)}
              style={{
                flex: 1,
                minWidth: 0,
                height: "100%",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                position: "relative",
                outline: isHovered ? "2px solid var(--accent)" : "none",
                outlineOffset: 1,
                borderRadius: 2
              }}
              aria-label={`${d.date}: ${
                isZero
                  ? "No tasks"
                  : `${d.completed} of ${d.total} tasks, ${Math.round(d.pct ?? 0)}%`
              }`}
            >
              <div
                style={{
                  width: "100%",
                  height: isZero ? "4px" : `${pctVal}%`,
                  background: barColor,
                  borderRadius: isDense ? "1px 1px 0 0" : "2px 2px 0 0",
                  opacity: isHovered ? 1 : isZero ? 0.3 : 0.85,
                  transition: "height 0.2s ease, opacity 0.15s ease"
                }}
              />
            </button>
          );
        })}
      </div>

      {/* X-Axis labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--ink-muted)",
          marginTop: 6
        }}
        aria-hidden="true"
      >
        <span>{formatShort(dailyMetrics[0].date)}</span>
        {!isDense && count === 7 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              flex: 1,
              padding: "0 8px"
            }}
          >
            {dailyMetrics.map((d) => (
              <span key={d.date} style={{ textAlign: "center", flex: 1 }}>
                {weekdayLetter(d.date)}
              </span>
            ))}
          </div>
        ) : isDense ? (
          <span>{formatShort(dailyMetrics[Math.floor(count / 2)].date)}</span>
        ) : null}
        <span>{formatShort(dailyMetrics[count - 1].date)}</span>
      </div>
    </div>
  );
}
