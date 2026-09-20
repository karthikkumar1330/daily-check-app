import type { DayData, Task } from "../../types";
import { getMonthGrid, monthLabel, todayStr } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import { resolveDayData } from "../../utils/recurrenceUtils";

interface CalendarProps {
  monthAnchor: string;
  selectedDate: string;
  days: Record<string, DayData>;
  recurringTasks?: Task[];
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar({
  monthAnchor,
  selectedDate,
  days,
  recurringTasks,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday
}: CalendarProps) {
  const cells = getMonthGrid(monthAnchor);
  const today = todayStr();

  return (
    <div className="card calendar-card">
      <div className="week-nav" style={{ marginBottom: 4 }}>
        <button onClick={onPrevMonth} aria-label="Previous month">
          {"\u2039"}
        </button>
        <div className="label" style={{ fontWeight: 600, color: "var(--ink)" }}>
          {monthLabel(monthAnchor)}
        </div>
        <button onClick={onNextMonth} aria-label="Next month">
          {"\u203A"}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className="link-btn" onClick={onToday}>
          Today
        </button>
      </div>

      <div className="calendar-grid calendar-headers">
        {WEEKDAY_HEADERS.map((w) => (
          <div key={w} className="calendar-header-cell">
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((cell) => {
          const day = recurringTasks ? resolveDayData(cell.date, days[cell.date], recurringTasks) : days[cell.date];
          const st = dayStats(day);
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const dayNum = Number(cell.date.slice(-2));

          // Subtle status dot: none for zero-task days, otherwise colored by
          // completion — never a heatmap, just one small indicator.
          let dotClass = "";
          if (st.total > 0 && st.pct !== null) {
            if (st.pct === 100) dotClass = "calendar-dot-complete";
            else if (st.pct > 0) dotClass = "calendar-dot-partial";
            else dotClass = "calendar-dot-neutral";
          }

          return (
            <button
              key={cell.date}
              className={
                "calendar-cell" +
                (cell.inMonth ? "" : " outside") +
                (isToday ? " today" : "") +
                (isSelected ? " selected" : "")
              }
              onClick={() => onSelectDate(cell.date)}
              aria-label={
                cell.date + (st.total > 0 ? `, ${st.completed} of ${st.total} tasks completed` : ", no tasks")
              }
              aria-pressed={isSelected}
            >
              <span>{dayNum}</span>
              {dotClass ? <span className={"calendar-dot " + dotClass} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
