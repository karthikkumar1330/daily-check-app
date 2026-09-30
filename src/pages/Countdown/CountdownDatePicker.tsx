import { useState, useMemo } from "react";
import {
  todayStr,
  addDays,
  parseDateStr,
  monthAnchor,
  addMonths,
  monthLabel,
  getMonthGrid,
  weekdayFull
} from "../../utils/dateUtils";
import { formatFullTargetDate } from "../../utils/countdownUtils";

interface CountdownDatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
}

const WEEKDAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function CountdownDatePicker({
  selectedDate,
  onChange
}: CountdownDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<string>(() => monthAnchor(selectedDate || todayStr()));

  const today = todayStr();
  const dayName = weekdayFull(selectedDate);
  const formattedDate = formatFullTargetDate(selectedDate);

  const monthGrid = useMemo(() => {
    return getMonthGrid(viewMonth, 1);
  }, [viewMonth]);

  function handleSelect(dateStr: string) {
    onChange(dateStr);
  }

  function handleQuickSelect(dateStr: string) {
    onChange(dateStr);
    setViewMonth(monthAnchor(dateStr));
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Target Date Display Card */}
      <button
        type="button"
        onClick={() => {
          setViewMonth(monthAnchor(selectedDate || today));
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-label={`Target date: ${formattedDate}, ${dayName}. Tap to change.`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "var(--surface)",
          border: isOpen ? "1.5px solid var(--accent, #10b981)" : "1px solid var(--border)",
          borderRadius: 14,
          cursor: "pointer",
          textAlign: "left",
          transition: "border-color 0.15s ease, background 0.15s ease",
          minHeight: 52
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }} aria-hidden="true">
            📅
          </span>
          <div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: "-0.01em"
              }}
            >
              {formattedDate}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                fontWeight: 500,
                marginTop: 2
              }}
            >
              {dayName}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 12,
            color: "var(--ink-muted)",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 8,
            background: "var(--surface-hover)",
            border: "1px solid var(--border)"
          }}
        >
          {isOpen ? "Close ▴" : "Change ▾"}
        </span>
      </button>

      {/* Calendar Dropdown Picker */}
      {isOpen ? (
        <div
          style={{
            marginTop: 8,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "14px 12px 12px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          {/* Quick Date Shortcuts */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 2
            }}
          >
            <button
              type="button"
              className="countdown-filter-pill"
              onClick={() => handleQuickSelect(today)}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                minHeight: 32,
                borderRadius: 8,
                background: selectedDate === today ? "var(--ink)" : "var(--surface-hover)",
                color: selectedDate === today ? "var(--surface)" : "var(--ink)",
                border: "1px solid var(--border)"
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="countdown-filter-pill"
              onClick={() => handleQuickSelect(addDays(today, 1))}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                minHeight: 32,
                borderRadius: 8,
                background: selectedDate === addDays(today, 1) ? "var(--ink)" : "var(--surface-hover)",
                color: selectedDate === addDays(today, 1) ? "var(--surface)" : "var(--ink)",
                border: "1px solid var(--border)"
              }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className="countdown-filter-pill"
              onClick={() => handleQuickSelect(addDays(today, 7))}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                minHeight: 32,
                borderRadius: 8,
                background: selectedDate === addDays(today, 7) ? "var(--ink)" : "var(--surface-hover)",
                color: selectedDate === addDays(today, 7) ? "var(--surface)" : "var(--ink)",
                border: "1px solid var(--border)"
              }}
            >
              Next week
            </button>
            <button
              type="button"
              className="countdown-filter-pill"
              onClick={() => handleQuickSelect(addDays(today, 30))}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                minHeight: 32,
                borderRadius: 8,
                background: selectedDate === addDays(today, 30) ? "var(--ink)" : "var(--surface-hover)",
                color: selectedDate === addDays(today, 30) ? "var(--surface)" : "var(--ink)",
                border: "1px solid var(--border)"
              }}
            >
              Next month
            </button>
          </div>

          {/* Month Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 4px"
            }}
          >
            <button
              type="button"
              className="icon-btn"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
              style={{ width: 34, height: 34 }}
            >
              ‹
            </button>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: "-0.01em"
              }}
            >
              {monthLabel(viewMonth)}
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              style={{ width: 34, height: 34 }}
            >
              ›
            </button>
          </div>

          {/* Weekday Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--ink-muted)",
              letterSpacing: "0.04em"
            }}
          >
            {WEEKDAY_NAMES.map((name) => (
              <div key={name} style={{ padding: "4px 0" }}>
                {name}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2
            }}
          >
            {monthGrid.map(({ date, inMonth }) => {
              const isSelected = date === selectedDate;
              const isToday = date === today;
              const dayNum = parseDateStr(date).getDate();

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleSelect(date)}
                  style={{
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    background: isSelected
                      ? "var(--accent, #10b981)"
                      : isToday
                      ? "var(--surface-hover)"
                      : "transparent",
                    color: isSelected
                      ? "#fff"
                      : inMonth
                      ? "var(--ink)"
                      : "var(--ink-muted)",
                    fontWeight: isSelected ? 800 : inMonth ? 600 : 400,
                    opacity: !inMonth && !isSelected ? 0.35 : 1,
                    fontSize: 13,
                    border: isToday && !isSelected ? "1px solid var(--accent, #10b981)" : "none",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.1s ease"
                  }}
                  aria-label={`${date}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer with Today and Done buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              marginTop: 2
            }}
          >
            <button
              type="button"
              onClick={() => handleQuickSelect(today)}
              style={{
                background: "none",
                border: "none",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--accent, #10b981)",
                cursor: "pointer",
                padding: "6px 8px"
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsOpen(false)}
              style={{
                minHeight: 32,
                padding: "0 14px",
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: 8
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
