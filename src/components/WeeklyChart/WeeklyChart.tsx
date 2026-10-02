import type { DayData, Task } from "../../types";
import { formatLong, getCalendarComponents, getWeekDates, todayStr } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import { resolveDayData } from "../../utils/recurrenceUtils";

interface WeeklyChartProps {
  days: Record<string, DayData>;
  recurringTasks?: Task[];
  weekStart: string;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

export default function WeeklyChart({
  days,
  recurringTasks,
  weekStart,
  selectedDate,
  onSelectDate
}: WeeklyChartProps) {
  const weekDates = getWeekDates(weekStart);
  const today = todayStr();

  // Active selected day stats
  const activeSelected = selectedDate || today;
  const selectedDayData = recurringTasks
    ? resolveDayData(activeSelected, days[activeSelected], recurringTasks)
    : days[activeSelected];
  const selectedDayStats = dayStats(selectedDayData);

  return (
    <div className="weekly-section" role="region" aria-label="7-Day Progress">
      <div className="weekly-section-label">7-Day Progress</div>
      <div className="weekly-chart-card">
        <div className="weekly-chart-grid" role="group" aria-label="Weekly calendar breakdown">
          {weekDates.map((dstr) => {
            const day = recurringTasks ? resolveDayData(dstr, days[dstr], recurringTasks) : days[dstr];
            const st = dayStats(day);
            const hasTasks = st.total > 0;
            const isComplete = hasTasks && st.pct === 100;
            const isTodayCol = dstr === today;
            const isSelected = dstr === selectedDate;
            const comp = getCalendarComponents(dstr);

            const tooltip = hasTasks
              ? `${comp.weekday}, ${comp.day} ${comp.monthShort}: ${st.completed}/${st.total} completed (${st.pct}%)`
              : `${comp.weekday}, ${comp.day} ${comp.monthShort}: No tasks`;

            return (
              <button
                key={dstr}
                type="button"
                className={
                  "weekly-chart-col" +
                  (isTodayCol ? " is-today" : "") +
                  (isSelected ? " is-selected" : "")
                }
                onClick={() => onSelectDate(dstr)}
                title={tooltip}
                aria-label={tooltip}
                aria-pressed={isSelected}
              >
                <div className="weekly-chart-col-header">
                  <span className="weekly-chart-day-name">{comp.weekdayShort.slice(0, 3)}</span>
                  <span className="weekly-chart-day-date">{comp.day}</span>
                  {isTodayCol && <span className="weekly-chart-today-indicator" title="Today" />}
                </div>

                <div className="weekly-chart-bar-track">
                  {!hasTasks ? (
                    <span className="weekly-chart-no-tasks-mark" aria-hidden="true">—</span>
                  ) : (
                    <div
                      className={
                        "weekly-chart-bar-fill" +
                        (isComplete ? " is-complete" : "") +
                        (st.completed === 0 ? " is-zero" : "")
                      }
                      style={{
                        height: isComplete
                          ? "100%"
                          : st.completed === 0
                          ? "4px"
                          : `${Math.max(st.pct ?? 0, 6)}%`
                      }}
                    />
                  )}
                </div>

                <span
                  className={
                    "weekly-chart-status-dot " +
                    (!hasTasks
                      ? "dot-none"
                      : isComplete
                      ? "dot-complete"
                      : st.completed > 0
                      ? "dot-active"
                      : "dot-none")
                  }
                  aria-hidden="true"
                >
                  {hasTasks ? "●" : "—"}
                </span>

                <span
                  className={
                    "weekly-chart-pct " +
                    (!hasTasks ? "pct-none" : isComplete ? "pct-complete" : "")
                  }
                >
                  {hasTasks ? `${st.pct}%` : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected date context banner */}
        {selectedDate && (
          <div className="weekly-selected-context">
            <span className="weekly-selected-date-text">{formatLong(selectedDate)}</span>
            <span className="weekly-selected-stat-text">
              {selectedDayStats.total === 0
                ? "No tasks"
                : `${selectedDayStats.completed} of ${selectedDayStats.total} completed (${selectedDayStats.pct}%)`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

