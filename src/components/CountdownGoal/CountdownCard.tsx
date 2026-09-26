import { useState } from "react";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import { useTasks } from "../../hooks/useTasks";
import { useTodayDate } from "../../hooks/useTodayDate";
import { computeCountdownStatus, computeGoalExecutionStats } from "../../utils/countdownUtils";
import { formatDateMedium } from "../../utils/dateUtils";
import GoalsManagerModal from "./GoalsManagerModal";
import GoalFormModal from "./GoalFormModal";
import SecondaryGoalsRail from "./SecondaryGoalsRail";

export default function CountdownCard() {
  const { primaryGoal, goals, setPrimaryGoal, createGoal } = useCountdownGoals();
  const { appData } = useTasks();
  const today = useTodayDate();
  const [managerOpen, setManagerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // If no goals at all, do not display on Home screen
  if (goals.length === 0) {
    return null;
  }

  // Fallback: if primaryGoalId was unset or invalid, default to the first goal
  const activeGoal = primaryGoal || goals[0];
  const status = computeCountdownStatus(activeGoal, today);
  const execStats = computeGoalExecutionStats(activeGoal, appData.days, appData.recurringTasks, today);
  const dateRange = `${formatDateMedium(activeGoal.startDate)} \u2192 ${formatDateMedium(activeGoal.targetDate)}`;

  let bigNumber: string;
  let bigLabel: string;
  let metaInfo: string;
  let srLabel: string;

  if (status.phase === "upcoming") {
    bigNumber = String(status.daysUntilStart);
    bigLabel = status.daysUntilStart === 1 ? "STARTS IN 1 DAY" : "DAYS UNTIL START";
    metaInfo = `Starts on ${formatDateMedium(activeGoal.startDate)}`;
    srLabel = `${activeGoal.title} starts in ${status.daysUntilStart} day${status.daysUntilStart === 1 ? "" : "s"}.`;
  } else if (status.phase === "complete") {
    bigNumber = "Completed";
    bigLabel = "COMPLETED";
    metaInfo = `All ${status.totalDays} days finished`;
    srLabel = `${activeGoal.title} is completed.`;
  } else {
    bigNumber = String(status.daysLeft);
    bigLabel = status.daysLeft === 1 ? "DAY LEFT" : "DAYS LEFT";
    metaInfo = `Day ${status.dayNumber} of ${status.totalDays} \u00B7 ${status.progressPct}% complete`;
    srLabel = `${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} remaining in ${activeGoal.title}.`;
  }

  return (
    <div className="countdown-section">
      <div className="card countdown-card">
        <div className="countdown-head">
          <div className="countdown-primary-tag">
            <span className="primary-tag-icon" aria-hidden="true">
              🎯
            </span>
            <span>PRIMARY GOAL</span>
          </div>
          <button
            className="link-btn countdown-manage-btn"
            onClick={() => setManagerOpen(true)}
            aria-label="Manage countdown goals"
          >
            Manage
          </button>
        </div>

        <div className="countdown-title">
          {activeGoal.icon ? (
            <span className="countdown-icon" aria-hidden="true">
              {activeGoal.icon}
            </span>
          ) : null}
          <span>{activeGoal.title}</span>
        </div>

        <div className="countdown-figure" aria-label={srLabel}>
          <div
            className={
              "countdown-number" +
              (status.phase === "complete" ? " countdown-number-complete" : "")
            }
          >
            {bigNumber}
          </div>
          {bigLabel ? <div className="countdown-label">{bigLabel}</div> : null}
        </div>

        <div className="countdown-range">{dateRange}</div>

        {status.phase !== "upcoming" ? (
          <div className="bar-track countdown-bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${status.progressPct}%` }} />
          </div>
        ) : null}

        <div className="countdown-meta">{metaInfo}</div>

        {/* Goal ↔ Daily Execution Connection */}
        <div
          className="countdown-execution"
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid var(--border)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              marginBottom: 4
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: "var(--ink-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}
            >
              Execution
            </span>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              {execStats.activeDays > 0
                ? `${execStats.successfulDays} / ${execStats.activeDays} successful days (${execStats.successfulPct}%)`
                : "No active days"}
            </span>
          </div>
          {execStats.activeDays > 0 ? (
            <div
              className="bar-track"
              style={{ height: 5, background: "var(--surface-2)" }}
              aria-hidden="true"
            >
              <div
                className="bar-fill"
                style={{
                  width: `${execStats.successfulPct ?? 0}%`,
                  background: "var(--accent, #0d9488)"
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Secondary Goals Rail when other goals exist or affordance to add */}
      <SecondaryGoalsRail
        goals={goals}
        primaryGoalId={activeGoal.id}
        onSetPrimary={(id) => setPrimaryGoal(id)}
        onOpenManage={() => setManagerOpen(true)}
        onOpenCreate={() => setCreateOpen(true)}
      />

      {managerOpen ? (
        <GoalsManagerModal onClose={() => setManagerOpen(false)} />
      ) : null}

      {createOpen ? (
        <GoalFormModal
          onSubmit={(input) => {
            const res = createGoal(input);
            if (res.ok) setCreateOpen(false);
            return res;
          }}
          onCancel={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
}
