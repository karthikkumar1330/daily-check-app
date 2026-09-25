import type { CountdownGoal, DayData, Task } from "../../types";
import { getMonthGrid, monthLabel, todayStr } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import { resolveDayData } from "../../utils/recurrenceUtils";

interface CalendarProps {
  monthAnchor: string;
  selectedDate: string;
  days: Record<string, DayData>;
  recurringTasks?: Task[];
  goals?: CountdownGoal[];
  weekStartsOn?: 0 | 1;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const MON_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SUN_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({
  monthAnchor,
  selectedDate,
  days,
  recurringTasks,
  goals = [],
  weekStartsOn = 1,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday
}: CalendarProps) {
  const cells = getMonthGrid(monthAnchor, weekStartsOn);
  const weekdayHeaders = weekStartsOn === 0 ? SUN_HEADERS : MON_HEADERS;
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
        {weekdayHeaders.map((w) => (
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

          // Check if any active countdown goal spans this date
          const inGoalPeriod = goals.some((g) => cell.date >= g.startDate && cell.date <= g.targetDate);

          // Check if date has any focus tasks assigned
          const hasFocusTasks = (day?.tasks ?? []).some(
            (t) => t.focusDate === cell.date || (t.focusDates && Boolean(t.focusDates[cell.date]))
          );

          // Subtle status dot: none for zero-task days, otherwise colored by
          // completion (>=80% = success, >0% = partial, 0% = neutral)
          let dotClass = "";
          if (st.total > 0 && st.pct !== null) {
            if (st.pct >= 80) dotClass = "calendar-dot-complete";
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
                (isSelected ? " selected" : "") +
                (inGoalPeriod && cell.inMonth ? " in-goal" : "")
              }
              onClick={() => onSelectDate(cell.date)}
              aria-label={
                cell.date +
                (st.total > 0 ? `, ${st.completed} of ${st.total} tasks completed` : ", no tasks") +
                (hasFocusTasks ? ", has focus tasks" : "") +
                (inGoalPeriod ? ", in goal window" : "")
              }
              aria-pressed={isSelected}
            >
              <span>{dayNum}</span>
              <span className="calendar-dot-indicators" aria-hidden="true">
                {dotClass ? <span className={"calendar-dot " + dotClass} /> : null}
                {hasFocusTasks ? <span className="calendar-focus-dot" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
