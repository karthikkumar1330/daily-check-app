import type { DayData, Task } from "../../types";
import { formatShort, getWeekDates, todayStr, weekdayLetter } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import { resolveDayData } from "../../utils/recurrenceUtils";

interface WeeklyChartProps {
  days: Record<string, DayData>;
  recurringTasks?: Task[];
  weekStart: string;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

export default function WeeklyChart({ days, recurringTasks, weekStart, selectedDate, onSelectDate }: WeeklyChartProps) {
  const weekDates = getWeekDates(weekStart);
  const today = todayStr();

  const hasAnyTasksThisWeek = weekDates.some((dstr) => {
    const day = recurringTasks ? resolveDayData(dstr, days[dstr], recurringTasks) : days[dstr];
    return (day?.tasks?.length ?? 0) > 0;
  });

  return (
    <div className="card chart-card">
      {!hasAnyTasksThisWeek ? (
        <div style={{ padding: "8px 4px 4px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
            No activity this week yet
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--ink-muted)", marginBottom: 10 }}>
            Completed tasks will appear in the chart below.
          </div>
        </div>
      ) : null}

      <div className="chart">
        {weekDates.map((dstr) => {
          const day = recurringTasks ? resolveDayData(dstr, days[dstr], recurringTasks) : days[dstr];
          const st = dayStats(day);
          const hasTasks = st.total > 0;
          const isComplete = hasTasks && st.pct === 100;
          const h = hasTasks ? Math.max(st.pct ?? 0, 4) : 0;
          const isTodayCol = dstr === today;
          const isSelected = dstr === selectedDate;

          const tooltip = hasTasks
            ? `${formatShort(dstr)}: ${st.completed}/${st.total} completed (${st.pct}%)`
            : `${formatShort(dstr)}: No tasks`;

          return (
            <button
              key={dstr}
              type="button"
              className={"chart-col" + (isTodayCol ? " today" : "") + (isSelected ? " selected" : "")}
              onClick={() => onSelectDate(dstr)}
              title={tooltip}
              aria-label={tooltip}
            >
              <div className="chart-bar-wrap">
                {!hasTasks ? (
                  <div className="chart-no-data-mark" aria-hidden="true">
                    —
                  </div>
                ) : (
                  <div
                    className={
                      "chart-bar has-data" +
                      (isComplete ? " complete" : "") +
                      (isSelected ? " selected" : "")
                    }
                    style={{ height: `${h}%` }}
                  />
                )}
              </div>
              <div className="chart-day">{weekdayLetter(dstr)}</div>
              <div className="chart-pct" title={hasTasks ? `${st.pct}%` : "No tasks"}>
                {hasTasks ? `${st.pct}%` : "—"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
