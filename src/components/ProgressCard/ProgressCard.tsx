import type { DayStats } from "../../types";
import { formatPct, motivationalMsg } from "../../utils/progressUtils";

interface ProgressCardProps {
  stats: DayStats;
  isToday: boolean;
}

export default function ProgressCard({ stats, isToday }: ProgressCardProps) {
  const noTasks = stats.total === 0;
  const isComplete = stats.pct === 100 && stats.total > 0;

  return (
    <div className={`card progress-card${isComplete ? " is-complete" : ""}`}>
      <div className="progress-top">
        <div className="progress-title">{isToday ? "Today’s Progress" : "Day’s Progress"}</div>
        <div className="progress-msg">{motivationalMsg(stats)}</div>
      </div>
      {noTasks ? (
        <div className="progress-empty-wrap">
          <div className="progress-empty-msg">No tasks yet</div>
        </div>
      ) : (
        <>
          <div className="progress-count">
            <span className="count-completed">{stats.completed}</span>
            <span className="count-sep"> / </span>
            <span className="count-total">{stats.total}</span>
            <span className="count-label"> completed</span>
          </div>
          <div
            className="bar-track"
            role="progressbar"
            aria-valuenow={stats.pct ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Daily task completion"
          >
            <div
              className={`bar-fill${isComplete ? " bar-fill-complete" : ""}`}
              style={{ width: `${stats.pct ?? 0}%` }}
            />
          </div>
          <div className="progress-foot">
            <span className="foot-pct">
              <b>{formatPct(stats.pct)}</b>
            </span>
            <span className="foot-remaining">
              <b>{stats.remaining}</b> remaining
            </span>
          </div>
        </>
      )}
    </div>
  );
}
