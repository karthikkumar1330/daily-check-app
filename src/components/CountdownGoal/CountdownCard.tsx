import { useState } from "react";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import { useTodayDate } from "../../hooks/useTodayDate";
import { computeCountdownStatus } from "../../utils/countdownUtils";
import GoalsManagerModal from "./GoalsManagerModal";

export default function CountdownCard() {
  const { primaryGoal, goals } = useCountdownGoals();
  const today = useTodayDate();
  const [managerOpen, setManagerOpen] = useState(false);

  // Filter for active (non-completed) goals
  const activeGoals = goals.filter((g) => computeCountdownStatus(g, today).phase !== "complete");

  // If there are zero active goals, render nothing on Home
  if (activeGoals.length === 0) {
    return null;
  }

  // Use primaryGoal if active, otherwise default to first active goal
  const activeGoal =
    primaryGoal && computeCountdownStatus(primaryGoal, today).phase !== "complete"
      ? primaryGoal
      : activeGoals[0];

  const status = computeCountdownStatus(activeGoal, today);
  const remainingText =
    status.phase === "upcoming"
      ? status.daysUntilStart === 1
        ? "Starts in 1 day"
        : `Starts in ${status.daysUntilStart} days`
      : status.daysLeft === 1
      ? "1 day remaining"
      : `${status.daysLeft} days remaining`;

  return (
    <div className="countdown-section" style={{ marginBottom: 12 }}>
      <div
        className="card countdown-widget-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">
            {activeGoal.icon || "🎯"}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {activeGoal.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                fontWeight: 500,
                marginTop: 1
              }}
            >
              {remainingText}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="link-btn"
          onClick={() => setManagerOpen(true)}
          aria-label={`Manage countdown goals, currently viewing ${activeGoal.title}`}
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--accent, #10b981)",
            padding: "4px 8px",
            minHeight: 36,
            flexShrink: 0
          }}
        >
          Manage
        </button>
      </div>

      {managerOpen ? (
        <GoalsManagerModal onClose={() => setManagerOpen(false)} />
      ) : null}
    </div>
  );
}
