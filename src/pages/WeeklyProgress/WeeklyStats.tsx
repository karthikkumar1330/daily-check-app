import type { WeekSummary } from "../../utils/progressUtils";
import type { Streaks } from "../../utils/streakUtils";

interface WeeklyStatsProps {
  summary: WeekSummary;
  streaks: Streaks;
  activeDaysCount: number;
}

export function WeeklyStats({ summary, streaks, activeDaysCount }: WeeklyStatsProps) {
  const remaining = Math.max(0, summary.created - summary.completed);

  return (
    <div className="weekly-section" role="region" aria-label="Weekly Statistics">
      <div className="weekly-section-label">Statistics</div>
      <div className="weekly-stats-card">
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Tasks completed</span>
          <span className="weekly-stat-val">{summary.completed}</span>
        </div>
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Tasks remaining</span>
          <span className="weekly-stat-val">{remaining}</span>
        </div>
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Active days</span>
          <span className="weekly-stat-val">{activeDaysCount} of 7</span>
        </div>
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Best day</span>
          <span className="weekly-stat-val">{summary.bestDay ?? "—"}</span>
        </div>
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Current streak</span>
          <span className="weekly-stat-val">
            {streaks.current} {streaks.current === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Best streak</span>
          <span className="weekly-stat-val">
            {streaks.best} {streaks.best === 1 ? "day" : "days"}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DayObservation {
  date: string;
  weekday: string;
  pct: number;
  total: number;
  completed: number;
}

interface WeeklyInsightsProps {
  strongestDay: DayObservation | null;
  lowestDay: DayObservation | null;
}

export function WeeklyInsights({ strongestDay, lowestDay }: WeeklyInsightsProps) {
  if (!strongestDay) return null;

  const showLowest = lowestDay && lowestDay.date !== strongestDay.date;

  return (
    <div className="weekly-section" role="region" aria-label="Weekly Observations">
      <div className="weekly-section-label">Weekly Observations</div>
      <div className="weekly-stats-card">
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Strongest day</span>
          <span className="weekly-stat-val">
            {strongestDay.weekday} · {strongestDay.pct}% completed
          </span>
        </div>
        {showLowest && (
          <div className="weekly-stat-row">
            <span className="weekly-stat-label">Lowest activity</span>
            <span className="weekly-stat-val">
              {lowestDay.weekday} · {lowestDay.pct}% completed
            </span>
          </div>
        )}
        <div className="weekly-stat-row">
          <span className="weekly-stat-label">Streak rule</span>
          <span className="weekly-stat-val" style={{ fontWeight: 500, fontSize: "12.5px", color: "var(--ink-muted)" }}>
            80%+ completion counts toward streak
          </span>
        </div>
      </div>
    </div>
  );
}
