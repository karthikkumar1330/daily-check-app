import type { WeekSummary } from "../../utils/progressUtils";
import type { Streaks } from "../../utils/streakUtils";

interface WeeklySummaryProps {
  summary: WeekSummary;
  streaks: Streaks;
}

export default function WeeklySummary({ summary, streaks }: WeeklySummaryProps) {
  const noActivity = summary.avgPct === null;

  return (
    <div className="card summary-card">
      <div className="section-title first" style={{ margin: "0 0 12px" }}>
        This Week
      </div>

      {noActivity ? (
        <p className="settings-note" style={{ margin: 0 }}>
          No activity yet.
        </p>
      ) : (
        <div className="summary-grid">
          <SummaryItem label="Average completion" value={summary.avgPct + "%"} />
          <SummaryItem label="Tasks completed" value={String(summary.completed)} />
          <SummaryItem label="Tasks created" value={String(summary.created)} />
          <SummaryItem label="Best day" value={summary.bestDay ?? "—"} />
        </div>
      )}

      <div className="streak-row">
        <div className="streak-item">
          <span className="streak-emoji">{"\uD83D\uDD25"}</span>
          <div>
            <div className="value">
              {streaks.current} day{streaks.current === 1 ? "" : "s"}
            </div>
            <div className="label">Current streak</div>
          </div>
        </div>
        <div className="streak-item">
          <span className="streak-emoji">{"\uD83C\uDFC6"}</span>
          <div>
            <div className="value">
              {streaks.best} day{streaks.best === 1 ? "" : "s"}
            </div>
            <div className="label">Best streak</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-item">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
