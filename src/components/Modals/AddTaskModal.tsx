import { useEffect, useRef, useState } from "react";
import type { CategoryId, Priority, RecurrenceType, ReminderMinutes, TaskRecurrence } from "../../types";
import { parseDateStr, todayStr, weekdayFull } from "../../utils/dateUtils";
import { DAYS_OF_WEEK_OPTIONS, validateRecurrence } from "../../utils/recurrenceUtils";
import { CATEGORIES } from "../../utils/taskUtils";
import { REMINDER_OPTIONS } from "../../utils/scheduleUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { DURATION_PRESETS, formatDuration } from "../../utils/durationUtils";

interface AddTaskModalProps {
  initialDate?: string;
  onAdd: (
    title: string,
    priority: Priority,
    category: CategoryId,
    notes: string,
    recurrence?: TaskRecurrence | null,
    dueTime?: string | null,
    reminderMinutes?: ReminderMinutes | null,
    dueDate?: string | null,
    durationTargetMinutes?: number | null
  ) => void;
  onCancel: () => void;
}

const PRIORITY_ORDER: { value: Priority; label: string }[] = [
  { value: 3, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 1, label: "High" }
];

type RepeatOption = "none" | RecurrenceType;

const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every week" },
  { value: "custom", label: "Custom days" }
];

export default function AddTaskModal({ initialDate, onAdd, onCancel }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(2);
  const [category, setCategory] = useState<CategoryId>("");
  const [notes, setNotes] = useState("");

  const [dueTime, setDueTime] = useState("");
  const [reminder, setReminder] = useState<ReminderMinutes | "none">("none");

  const effectiveStart = initialDate && initialDate.trim() ? initialDate : todayStr();
  const [dueDate, setDueDate] = useState(effectiveStart);
  const [repeat, setRepeat] = useState<RepeatOption>("none");
  const [startDate, setStartDate] = useState(effectiveStart);
  const [endDate, setEndDate] = useState("");
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]);
  const [durationPreset, setDurationPreset] = useState<string>("none");
  const [customDurationMinutes, setCustomDurationMinutes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    titleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCustomDay(dayNumber: number) {
    setError(null);
    setCustomDays((prev) =>
      prev.includes(dayNumber) ? prev.filter((d) => d !== dayNumber) : [...prev, dayNumber]
    );
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      titleRef.current?.focus();
      return;
    }

    const cleanDueTime = dueTime.trim() || null;
    const cleanReminder = cleanDueTime && reminder !== "none" ? reminder : null;

    let cleanDuration: number | null = null;
    if (durationPreset !== "none") {
      if (durationPreset === "custom") {
        const val = parseInt(customDurationMinutes, 10);
        if (!isNaN(val) && val > 0) cleanDuration = val;
      } else {
        const val = parseInt(durationPreset, 10);
        if (!isNaN(val) && val > 0) cleanDuration = val;
      }
    }

    if (repeat === "none") {
      const cleanDueDate = dueDate.trim() || effectiveStart;
      onAdd(trimmed, priority, category, notes.trim(), null, cleanDueTime, cleanReminder, cleanDueDate, cleanDuration);
      return;
    }

    const rec: TaskRecurrence = {
      type: repeat,
      startDate: startDate || effectiveStart,
      ...(endDate.trim() ? { endDate: endDate.trim() } : {}),
      daysOfWeek:
        repeat === "custom"
          ? customDays
          : repeat === "weekly"
          ? [parseDateStr(startDate || effectiveStart).getDay()]
          : undefined
    };

    const val = validateRecurrence(rec);
    if (!val.valid) {
      setError(val.error ?? "Invalid recurrence configuration");
      return;
    }

    onAdd(trimmed, priority, category, notes.trim(), rec, cleanDueTime, cleanReminder, null, cleanDuration);
  }

  const weeklyDayName = weekdayFull(startDate || effectiveStart);

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-task-modal-title">
        <h2 id="add-task-modal-title">Add Task</h2>

        <label className="field-label" htmlFor="add-task-title">
          Task title
        </label>
        <input
          id="add-task-title"
          ref={titleRef}
          type="text"
          className="modal-input"
          autoFocus
          maxLength={140}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && repeat === "none") {
              e.preventDefault();
              submit();
            }
          }}
        />

        <div className="field-label">Priority</div>
        <div className="radio-row" role="radiogroup" aria-label="Priority">
          {PRIORITY_ORDER.map((p) => (
            <label key={p.value} className="radio-pill">
              <input
                type="radio"
                name="priority"
                checked={priority === p.value}
                onChange={() => setPriority(p.value)}
              />
              {p.label}
            </label>
          ))}
        </div>

        <label className="field-label" htmlFor="add-task-category">
          Category
        </label>
        <select
          id="add-task-category"
          className="modal-input"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryId)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji ? c.emoji + " " : ""}
              {c.label}
            </option>
          ))}
        </select>

        {/* Recurrence repeat selector */}
        <label className="field-label" htmlFor="add-task-repeat">
          Repeat
        </label>
        <select
          id="add-task-repeat"
          className="modal-input"
          value={repeat}
          onChange={(e) => {
            setRepeat(e.target.value as RepeatOption);
            setError(null);
          }}
        >
          {REPEAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* When recurrence is selected, show relevant controls */}
        {repeat !== "none" ? (
          <div className="recurrence-control-group">
            <div className="recurrence-dates-row">
              <div className="recurrence-date-field">
                <label className="recurrence-sublabel" htmlFor="recurrence-start-date">
                  Start date
                </label>
                <input
                  id="recurrence-start-date"
                  type="date"
                  className="modal-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setError(null);
                  }}
                />
              </div>

              <div className="recurrence-date-field">
                <label className="recurrence-sublabel" htmlFor="recurrence-end-date">
                  End date (optional)
                </label>
                <input
                  id="recurrence-end-date"
                  type="date"
                  className="modal-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError(null);
                  }}
                />
              </div>
            </div>

            {repeat === "weekly" ? (
              <div className="recurrence-info-text">
                Repeats every <strong>{weeklyDayName}</strong> starting {startDate || effectiveStart}.
              </div>
            ) : null}

            {repeat === "custom" ? (
              <div>
                <div className="recurrence-sublabel" style={{ marginBottom: 6 }}>
                  Repeat on days:
                </div>
                <div className="recurrence-days-grid" role="group" aria-label="Select repeat days">
                  {DAYS_OF_WEEK_OPTIONS.map((opt) => {
                    const isSelected = customDays.includes(opt.day);
                    return (
                      <button
                        key={opt.day}
                        type="button"
                        className={"recurrence-day-btn" + (isSelected ? " active" : "")}
                        onClick={() => toggleCustomDay(opt.day)}
                        aria-pressed={isSelected}
                        aria-label={opt.label}
                      >
                        {opt.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {error ? <div className="recurrence-error-msg">{error}</div> : null}
          </div>
        ) : null}

        {/* SCHEDULE Section */}
        <div className="schedule-control-group">
          <div className="schedule-section-title">SCHEDULE</div>

          {repeat === "none" ? (
            <div className="schedule-field" style={{ marginBottom: 4 }}>
              <label className="field-label" htmlFor="add-task-due-date">
                Due date
              </label>
              <input
                id="add-task-due-date"
                type="date"
                className="modal-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date"
              />
            </div>
          ) : null}

          <div className="schedule-row">
            <div className="schedule-field">
              <label className="field-label" htmlFor="add-task-due-time">
                Due time (optional)
              </label>
              <input
                id="add-task-due-time"
                type="time"
                className="modal-input time-input"
                value={dueTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setDueTime(val);
                  if (!val) setReminder("none");
                }}
                aria-label="Due time"
              />
            </div>

            <div className="schedule-field">
              <label className="field-label" htmlFor="add-task-reminder">
                Reminder
              </label>
              <select
                id="add-task-reminder"
                className="modal-input"
                value={reminder}
                disabled={!dueTime}
                onChange={(e) => {
                  const val = e.target.value === "none" ? "none" : (Number(e.target.value) as ReminderMinutes);
                  setReminder(val);
                }}
                aria-label="Reminder notification"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!dueTime ? (
            <div className="schedule-hint">Set a due time to enable reminders.</div>
          ) : (
            <div className="schedule-hint">Notifications can be enabled later in Settings.</div>
          )}
        </div>

        {/* DURATION (Optional) Section */}
        <div className="duration-control-group" style={{ marginBottom: 12 }}>
          <label className="field-label" id="duration-label">
            Target Duration (optional)
          </label>
          <div
            className="duration-preset-grid"
            role="radiogroup"
            aria-labelledby="duration-label"
            style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
          >
            <button
              type="button"
              className={"chip-btn" + (durationPreset === "none" ? " active" : "")}
              onClick={() => setDurationPreset("none")}
              role="radio"
              aria-checked={durationPreset === "none"}
            >
              None
            </button>
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.minutes}
                type="button"
                className={"chip-btn" + (durationPreset === String(p.minutes) ? " active" : "")}
                onClick={() => setDurationPreset(String(p.minutes))}
                role="radio"
                aria-checked={durationPreset === String(p.minutes)}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={"chip-btn" + (durationPreset === "custom" ? " active" : "")}
              onClick={() => setDurationPreset("custom")}
              role="radio"
              aria-checked={durationPreset === "custom"}
            >
              Custom
            </button>
          </div>

          {durationPreset === "custom" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min="1"
                max="1440"
                className="modal-input"
                style={{ width: 140 }}
                placeholder="Minutes"
                value={customDurationMinutes}
                onChange={(e) => setCustomDurationMinutes(e.target.value)}
                aria-label="Custom duration in minutes"
              />
              <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                {customDurationMinutes && !isNaN(Number(customDurationMinutes))
                  ? formatDuration(Number(customDurationMinutes))
                  : "minutes"}
              </span>
            </div>
          ) : null}
        </div>

        <label className="field-label" htmlFor="add-task-notes">
          Notes (optional)
        </label>
        <textarea
          id="add-task-notes"
          className="modal-input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
