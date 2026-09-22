import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Task } from "../../types";
import { addDays, formatShort, getWeekStart, todayStr } from "../../utils/dateUtils";
import { isValidDateString } from "../../utils/scheduleUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CalendarIcon, CloseIcon } from "../icons";

interface RescheduleModalProps {
  task: Task;
  currentDate: string;
  onReschedule: (targetDate: string) => void;
  onCancel: () => void;
  onEditRecurrence?: () => void;
}

export default function RescheduleModal({
  task,
  currentDate,
  onReschedule,
  onCancel,
  onEditRecurrence
}: RescheduleModalProps) {
  const isRecurring = Boolean(task.recurrence);
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(getWeekStart(today), 7);

  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState(
    currentDate && isValidDateString(currentDate) ? currentDate : tomorrow
  );
  const [customError, setCustomError] = useState<string | null>(null);

  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    firstBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showCustom) {
      customInputRef.current?.focus();
    }
  }, [showCustom]);

  function handleCustomSubmit() {
    if (!isValidDateString(customDate)) {
      setCustomError("Please select a valid date.");
      return;
    }
    onReschedule(customDate.trim());
  }

  const content = (
    <div
      className="overlay modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal reschedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-modal-title"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 id="reschedule-modal-title" style={{ margin: 0, fontSize: 16 }}>
            {isRecurring ? "Recurring Task" : "Reschedule Task"}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onCancel}
            aria-label="Close reschedule modal"
            style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="reschedule-task-preview">
          <CalendarIcon />
          <span className="reschedule-task-title">{task.title}</span>
        </div>

        {isRecurring ? (
          <div>
            <p style={{ fontSize: "13.5px", color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 18 }}>
              Recurring task dates are controlled by its recurrence schedule. To adjust when this task appears,
              edit its recurrence rule.
            </p>
            <div className="row">
              <button className="btn-ghost" onClick={onCancel} style={{ minHeight: 44 }}>
                Close
              </button>
              {onEditRecurrence ? (
                <button
                  ref={firstBtnRef}
                  className="btn-primary"
                  onClick={() => {
                    onCancel();
                    onEditRecurrence();
                  }}
                  style={{ minHeight: 44 }}
                >
                  Edit Recurrence
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <div className="reschedule-options-grid">
              <button
                ref={firstBtnRef}
                type="button"
                className={`reschedule-option-btn ${currentDate === today ? "active-date" : ""}`}
                onClick={() => onReschedule(today)}
              >
                <div className="reschedule-option-left">
                  <span className="reschedule-option-icon" aria-hidden="true">
                    📅
                  </span>
                  <div>
                    <div className="reschedule-option-label">Today</div>
                    <div className="reschedule-option-sub">{formatShort(today)}</div>
                  </div>
                </div>
                {currentDate === today ? <span className="task-date-badge">Current</span> : null}
              </button>

              <button
                type="button"
                className={`reschedule-option-btn ${currentDate === tomorrow ? "active-date" : ""}`}
                onClick={() => onReschedule(tomorrow)}
              >
                <div className="reschedule-option-left">
                  <span className="reschedule-option-icon" aria-hidden="true">
                    🌅
                  </span>
                  <div>
                    <div className="reschedule-option-label">Tomorrow</div>
                    <div className="reschedule-option-sub">{formatShort(tomorrow)}</div>
                  </div>
                </div>
                {currentDate === tomorrow ? <span className="task-date-badge">Current</span> : null}
              </button>

              <button
                type="button"
                className={`reschedule-option-btn ${currentDate === nextWeek ? "active-date" : ""}`}
                onClick={() => onReschedule(nextWeek)}
              >
                <div className="reschedule-option-left">
                  <span className="reschedule-option-icon" aria-hidden="true">
                    📆
                  </span>
                  <div>
                    <div className="reschedule-option-label">Next Week</div>
                    <div className="reschedule-option-sub">{formatShort(nextWeek)}</div>
                  </div>
                </div>
                {currentDate === nextWeek ? <span className="task-date-badge">Current</span> : null}
              </button>

              <button
                type="button"
                className={`reschedule-option-btn ${showCustom ? "active-date" : ""}`}
                onClick={() => setShowCustom((prev) => !prev)}
                aria-expanded={showCustom}
              >
                <div className="reschedule-option-left">
                  <span className="reschedule-option-icon" aria-hidden="true">
                    🗓️
                  </span>
                  <div>
                    <div className="reschedule-option-label">Custom Date…</div>
                    <div className="reschedule-option-sub">Choose any date</div>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>{showCustom ? "▲" : "▼"}</span>
              </button>
            </div>

            {showCustom ? (
              <div className="reschedule-custom-section">
                <div className="reschedule-custom-header">Pick Destination Date</div>
                <input
                  ref={customInputRef}
                  type="date"
                  className="modal-input"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setCustomError(null);
                  }}
                  style={{ minHeight: 44 }}
                  aria-label="Custom destination date"
                />
                {customError ? (
                  <div style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>{customError}</div>
                ) : null}
                <div className="reschedule-custom-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setShowCustom(false)}
                    style={{ minHeight: 40 }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleCustomSubmit}
                    style={{ minHeight: 40 }}
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" onClick={onCancel} style={{ minHeight: 44, width: "100%" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
