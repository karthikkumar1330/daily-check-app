import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import { useRoutines } from "../../hooks/useRoutines";
import type { Task } from "../../types";
import { computeCountdownStatus } from "../../utils/countdownUtils";
import GoalsManagerModal from "../CountdownGoal/GoalsManagerModal";

interface TodayContextProps {
  viewDate: string;
  tasks: Task[];
  onOpenFocusSelector: () => void;
}

export default function TodayContext({
  viewDate,
  tasks,
  onOpenFocusSelector
}: TodayContextProps) {
  const navigate = useNavigate();
  const { goals, primaryGoal } = useCountdownGoals();
  const { routines, isRoutineAppliedOnDate } = useRoutines();
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);

  // 1. Countdown Goal (use existing countdown calculation, filter out completed)
  const activeGoals = goals.filter((g) => computeCountdownStatus(g, viewDate).phase !== "complete");
  const activeGoal =
    primaryGoal && computeCountdownStatus(primaryGoal, viewDate).phase !== "complete"
      ? primaryGoal
      : activeGoals[0] || null;

  const countdownStatus = activeGoal ? computeCountdownStatus(activeGoal, viewDate) : null;
  const countdownDaysText = countdownStatus
    ? countdownStatus.phase === "upcoming"
      ? countdownStatus.daysUntilStart === 1
        ? "Starts in 1 day"
        : `Starts in ${countdownStatus.daysUntilStart}d`
      : countdownStatus.daysLeft === 1
      ? "1 day left"
      : `${countdownStatus.daysLeft} days`
    : "";

  // 2. Focus Tasks
  const focusTasks = tasks.filter((t) => t.focusDate === viewDate);
  const completedFocusCount = focusTasks.filter((t) => t.completed).length;

  // 3. Routines
  const hasRoutines = routines.length > 0;
  const appliedRoutinesCount = routines.filter((r) => isRoutineAppliedOnDate(r.id, tasks)).length;

  // If no contextual data exists at all, render nothing (no empty cards, no placeholder content)
  const hasAnyContext = !!activeGoal || focusTasks.length > 0 || hasRoutines;
  if (!hasAnyContext) {
    return null;
  }

  return (
    <section className="today-context-section" aria-labelledby="today-context-heading" style={{ marginTop: 20, marginBottom: 16 }}>
      <h2
        id="today-context-heading"
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 8px 2px"
        }}
      >
        Today&rsquo;s Context
      </h2>

      <div className="today-context-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Active Countdown Goal Row */}
        {activeGoal && countdownStatus ? (
          <button
            type="button"
            className="today-context-row"
            onClick={() => setGoalsModalOpen(true)}
            aria-label={`Countdown goal: ${activeGoal.title}, ${countdownDaysText}. Tap to manage goals.`}
          >
            <div className="today-context-row-left">
              <span className="today-context-icon" aria-hidden="true">
                {activeGoal.icon || "🎯"}
              </span>
              <span className="today-context-title">
                {activeGoal.title}
              </span>
            </div>
            <div className="today-context-row-right">
              <span className="today-context-info">
                {countdownDaysText}
              </span>
              <span className="today-context-arrow" aria-hidden="true">
                &rarr;
              </span>
            </div>
          </button>
        ) : null}

        {/* Selected Focus Tasks Row */}
        {focusTasks.length > 0 ? (
          <button
            type="button"
            className="today-context-row"
            onClick={onOpenFocusSelector}
            aria-label={`Focus: ${focusTasks.length} task${focusTasks.length === 1 ? "" : "s"}${completedFocusCount > 0 ? `, ${completedFocusCount} completed` : ""}. Tap to edit focus tasks.`}
          >
            <div className="today-context-row-left">
              <span className="today-context-icon" aria-hidden="true">
                🎯
              </span>
              <span className="today-context-title">
                Focus
              </span>
            </div>
            <div className="today-context-row-right">
              <span className="today-context-info">
                {focusTasks.length} {focusTasks.length === 1 ? "task" : "tasks"}
                {completedFocusCount > 0 ? ` · ${completedFocusCount} done` : ""}
              </span>
              <span className="today-context-arrow" aria-hidden="true">
                &rarr;
              </span>
            </div>
          </button>
        ) : null}

        {/* Active Routines Row */}
        {hasRoutines ? (
          <button
            type="button"
            className="today-context-row"
            onClick={() => navigate("/routines")}
            aria-label={`Routines: ${routines.length} routine${routines.length === 1 ? "" : "s"} available. Tap to view routines.`}
          >
            <div className="today-context-row-left">
              <span className="today-context-icon" aria-hidden="true">
                🔄
              </span>
              <span className="today-context-title">
                {routines.length === 1 ? routines[0].name : "Routines"}
              </span>
            </div>
            <div className="today-context-row-right">
              <span className="today-context-info">
                {appliedRoutinesCount > 0
                  ? `${appliedRoutinesCount}/${routines.length} applied`
                  : `${routines.length} routine${routines.length === 1 ? "" : "s"} today`}
              </span>
              <span className="today-context-arrow" aria-hidden="true">
                &rarr;
              </span>
            </div>
          </button>
        ) : null}
      </div>

      {goalsModalOpen ? (
        <GoalsManagerModal onClose={() => setGoalsModalOpen(false)} />
      ) : null}
    </section>
  );
}
