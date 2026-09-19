import type { DayData } from "../../types";
import { formatLong, getWeekDates, weekLabel } from "../../utils/dateUtils";
import { dayStats, formatPct, weekSummary } from "../../utils/progressUtils";
import { computeStreaks } from "../../utils/streakUtils";

interface PrintWeekProps {
  days: Record<string, DayData>;
  weekStart: string;
}

/**
 * Renders off-screen at all times; only becomes visible via the
 * `@media print` rules in index.css when the user prints the page.
 */
export default function PrintWeek({ days, weekStart }: PrintWeekProps) {
  const weekDates = getWeekDates(weekStart);
  const summary = weekSummary(days, weekDates);
  const streaks = computeStreaks(days);

  return (
    <div id="print-week" className="print-only">
      <div className="print-title">Daily Check {"\u2014"} Weekly Progress</div>
      <div className="print-sub">{weekLabel(weekStart)}</div>

      <table className="print-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Completed</th>
            <th>Total</th>
            <th>Completion</th>
          </tr>
        </thead>
        <tbody>
          {weekDates.map((dstr) => {
            const st = dayStats(days[dstr]);
            return (
              <tr key={dstr}>
                <td>{formatLong(dstr)}</td>
                <td>{st.completed}</td>
                <td>{st.total}</td>
                <td>{st.total > 0 ? formatPct(st.pct) : "No tasks"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="print-summary">
        <div>
          Weekly average
          <b>{summary.avgPct === null ? "No activity" : summary.avgPct + "%"}</b>
        </div>
        <div>
          Tasks completed
          <b>{summary.completed}</b>
        </div>
        <div>
          Tasks created
          <b>{summary.created}</b>
        </div>
        <div>
          Best day
          <b>{summary.bestDay ?? "\u2013"}</b>
        </div>
        <div>
          Current streak
          <b>{streaks.current} days</b>
        </div>
        <div>
          Best streak
          <b>{streaks.best} days</b>
        </div>
      </div>
    </div>
  );
}
