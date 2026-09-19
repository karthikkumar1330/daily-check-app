import type { DayStats } from "../../types";
import { formatPct, motivationalMsg } from "../../utils/progressUtils";

interface ProgressCardProps {
  stats: DayStats;
  isToday: boolean;
}

export default function ProgressCard({ stats, isToday }: ProgressCardProps) {
  const noTasks = stats.total === 0;
  return (
    <div className="card progress-card">
      <div className="progress-top">
        <div className="progress-title">{isToday ? "Today\u2019s" : "That day\u2019s"} Progress</div>
        <div className="progress-msg">{motivationalMsg(stats)}</div>
      </div>
      {noTasks ? (
        <div className="progress-count">
          <span>No tasks</span>
        </div>
      ) : (
        <>
          <div className="progress-count">
            {stats.completed} / {stats.total} <span>completed</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: (stats.pct ?? 0) + "%" }} />
          </div>
          <div className="progress-foot">
            <span>
              <b>{stats.remaining}</b> remaining
            </span>
            <span>
              <b>{formatPct(stats.pct)}</b> complete
            </span>
          </div>
        </>
      )}
    </div>
  );
}
