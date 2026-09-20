import type { DayData, Task } from "../../types";
import { formatShort, getWeekDates, todayStr, weekdayLetter } from "../../utils/dateUtils";
import { dayStats, formatPct } from "../../utils/progressUtils";
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

  return (
    <div className="card chart-card">
      <div className="chart">
        {weekDates.map((dstr) => {
          const day = recurringTasks ? resolveDayData(dstr, days[dstr], recurringTasks) : days[dstr];
          const st = dayStats(day);
          const h = st.total > 0 ? Math.max(st.pct ?? 0, 3) : 0;
          const isTodayCol = dstr === today;
          const isSelected = dstr === selectedDate;
          return (
            <button
              key={dstr}
              className={"chart-col" + (isTodayCol ? " today" : "")}
              onClick={() => onSelectDate(dstr)}
              title={`${formatShort(dstr)}: ${st.total > 0 ? `${st.completed}/${st.total} (${formatPct(st.pct)})` : "No tasks"}`}
            >
              <div className="chart-bar-wrap">
                <div
                  className={"chart-bar" + (st.total > 0 ? " has-data" : "") + (isSelected ? " selected" : "")}
                  style={{ height: h + "%" }}
                />
              </div>
              <div className="chart-day">{weekdayLetter(dstr)}</div>
              <div className="chart-pct">{formatPct(st.pct)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
