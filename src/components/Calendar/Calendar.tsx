import { getMonthGrid, monthLabel, todayStr } from "../../utils/dateUtils";

interface CalendarProps {
  monthAnchor: string;
  selectedDate: string;
  datesWithTasks: Set<string>;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar({
  monthAnchor,
  selectedDate,
  datesWithTasks,
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
          const hasTasks = datesWithTasks.has(cell.date);
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const dayNum = Number(cell.date.slice(-2));
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
              aria-label={cell.date}
              aria-pressed={isSelected}
            >
              <span>{dayNum}</span>
              {hasTasks ? <span className="calendar-dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
