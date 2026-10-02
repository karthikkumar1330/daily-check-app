import { useMemo } from "react";
import type { Countdown, DayData, Task } from "../../types";
import { formatDisplayDate, getMonthGrid, monthAnchor as getMonthAnchor, monthLabel, todayStr } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import { resolveDayData } from "../../utils/recurrenceUtils";

interface CalendarProps {
  monthAnchor: string;
  selectedDate: string;
  days: Record<string, DayData>;
  recurringTasks?: Task[];
  countdowns?: Countdown[];
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
  countdowns = [],
  weekStartsOn = 1,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday
}: CalendarProps) {
  const cells = useMemo(
    () => getMonthGrid(monthAnchor, weekStartsOn),
    [monthAnchor, weekStartsOn]
  );
  const weekdayHeaders = weekStartsOn === 0 ? SUN_HEADERS : MON_HEADERS;
  const today = todayStr();
  const currentMonthAnchor = getMonthAnchor(today);
  const isCurrentMonth = monthAnchor === currentMonthAnchor;

  return (
    <div className="calendar-card" role="region" aria-label="Monthly Calendar">
      {/* 1. MONTH NAVIGATION */}
      <div className="calendar-nav-row">
        <div className="calendar-nav-controls">
          <button
            type="button"
            className="icon-btn calendar-nav-btn"
            onClick={onPrevMonth}
            aria-label="Previous month"
            title="Previous month"
          >
            ‹
          </button>
          <h2 className="calendar-month-title">
            {monthLabel(monthAnchor)}
          </h2>
          <button
            type="button"
            className="icon-btn calendar-nav-btn"
            onClick={onNextMonth}
            aria-label="Next month"
            title="Next month"
          >
            ›
          </button>
        </div>

        {!isCurrentMonth ? (
          <button
            type="button"
            className="calendar-today-action-btn"
            onClick={onToday}
            aria-label="Return to current date"
          >
            Today
          </button>
        ) : null}
      </div>

      {/* 2. WEEKDAY HEADERS */}
      <div className="calendar-grid calendar-headers" role="row" aria-label="Day of week">
        {weekdayHeaders.map((w) => (
          <div key={w} className="calendar-header-cell" role="columnheader">
            {w}
          </div>
        ))}
      </div>

      {/* 3. CALENDAR CELLS GRID */}
      <div className="calendar-grid calendar-cells-grid" role="grid" aria-label="Month days">
        {cells.map((cell) => {
          const day = recurringTasks
            ? resolveDayData(cell.date, days[cell.date], recurringTasks)
            : days[cell.date];
          const st = dayStats(day);
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const dayNum = Number(cell.date.slice(-2));

          // Check if any countdown target date falls on this date
          const hasCountdownTarget = countdowns.some((c) => cell.date === c.targetDate);

          // Check if date has any focus tasks assigned
          const hasFocusTasks = (day?.tasks ?? []).some(
            (t) => t.focusDate === cell.date || (t.focusDates && Boolean(t.focusDates[cell.date]))
          );

          // Subtle task status dot: only for dates with tasks
          let dotVariant = "";
          if (st.total > 0 && st.pct !== null) {
            if (st.pct === 100) dotVariant = "dot-complete";
            else if (st.completed > 0) dotVariant = "dot-partial";
            else dotVariant = "dot-active";
          }

          const accessibleLabel = `${formatDisplayDate(cell.date)}${isToday ? ", Today" : ""}${isSelected ? ", Selected" : ""}${
            st.total > 0 ? `, ${st.completed} of ${st.total} tasks completed` : ", no tasks"
          }${hasFocusTasks ? ", focus task" : ""}${hasCountdownTarget ? ", countdown event" : ""}`;

          return (
            <button
              key={cell.date}
              type="button"
              className={
                "calendar-cell" +
                (cell.inMonth ? " in-month" : " outside") +
                (isToday ? " is-today" : "") +
                (isSelected ? " is-selected" : "") +
                (hasCountdownTarget && cell.inMonth ? " has-countdown" : "")
              }
              onClick={() => onSelectDate(cell.date)}
              aria-label={accessibleLabel}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
            >
              <span className="calendar-day-number">{dayNum}</span>

              {/* Subtle indicators: max 1 compact dot container */}
              <span className="calendar-cell-indicators" aria-hidden="true">
                {dotVariant ? (
                  <span className={`calendar-task-dot ${dotVariant}`} />
                ) : null}
                {hasFocusTasks ? (
                  <span className="calendar-focus-mark" title="Focus task" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
