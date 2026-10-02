import type { WeekSummary } from "../../utils/progressUtils";
import type { Streaks } from "../../utils/streakUtils";

interface WeeklySummaryProps {
  summary: WeekSummary;
  streaks: Streaks;
  activeDaysCount?: number;
}

export default function WeeklySummary({ summary, activeDaysCount = 0 }: WeeklySummaryProps) {
  const noTasks = summary.created === 0;

  if (noTasks) {
    return null;
  }

  const remaining = Math.max(0, summary.created - summary.completed);

  return (
    <div className="weekly-summary-card" role="region" aria-label="Weekly completion summary">
      <div className="weekly-summary-primary">
        <div className="weekly-summary-value">
          {summary.avgPct !== null ? `${summary.avgPct}%` : "—"}
        </div>
        <div className="weekly-summary-label">Weekly completion</div>
      </div>

      <div className="weekly-summary-secondary">
        <span className="weekly-summary-stat-item">
          <strong>{summary.completed}</strong> / {summary.created} completed
        </span>
        <span className="weekly-summary-dot" aria-hidden="true">·</span>
        <span className="weekly-summary-stat-item">
          <strong>{remaining}</strong> remaining
        </span>
        <span className="weekly-summary-dot" aria-hidden="true">·</span>
        <span className="weekly-summary-stat-item">
          <strong>{activeDaysCount}</strong> / 7 active days
        </span>
      </div>
    </div>
  );
}

