import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryId, Priority, RecurrenceType, ReminderMinutes, Task, TaskRecurrence } from "../../types";
import { formatDisplayDate, parseDateStr, todayStr, weekdayFull } from "../../utils/dateUtils";
import { DAYS_OF_WEEK_OPTIONS, validateRecurrence } from "../../utils/recurrenceUtils";
import { CATEGORIES } from "../../utils/taskUtils";
import { REMINDER_OPTIONS } from "../../utils/scheduleUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { DURATION_PRESETS, formatDuration } from "../../utils/durationUtils";
import { CloseIcon } from "../icons";

export interface TaskFormData {
  title: string;
  priority: Priority;
  category: CategoryId;
  notes: string;
  recurrence?: TaskRecurrence | null;
  dueTime?: string | null;
  reminderMinutes?: ReminderMinutes | null;
  dueDate?: string | null;
  durationTargetMinutes?: number | null;
  quantityTarget?: number | null;
  quantityUnit?: string;
  quantityStep?: number;
  important?: boolean;
}

interface TaskFormModalProps {
  mode?: "add" | "edit";
  initialTask?: Task;
  initialDate?: string;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
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

const COMMON_UNITS = ["glasses", "cups", "L", "ml", "pages", "steps", "reps", "km", "items"];

export default function TaskFormModal({
  mode = "add",
  initialTask,
  initialDate,
  onSubmit,
  onCancel
}: TaskFormModalProps) {
  const isEdit = mode === "edit";
  const effectiveStart = initialTask?.dueDate || (initialDate && initialDate.trim() ? initialDate : todayStr());

  // Form State
  const [title, setTitle] = useState(initialTask?.title || "");
  const [priority, setPriority] = useState<Priority>(initialTask?.priority || 2);
  const [important, setImportant] = useState<boolean>(Boolean(initialTask?.important));
  const [category, setCategory] = useState<CategoryId>(initialTask?.category || "");
  const [notes, setNotes] = useState(initialTask?.notes || "");

  const [dueDate, setDueDate] = useState(initialTask?.dueDate || effectiveStart);
  const [dueTime, setDueTime] = useState(initialTask?.dueTime || "");
  const [reminder, setReminder] = useState<ReminderMinutes | "none">(
    initialTask?.reminderMinutes ?? "none"
  );

  const initialRepeat: RepeatOption = initialTask?.recurrence?.type ?? "none";
  const [repeat, setRepeat] = useState<RepeatOption>(initialRepeat);
  const [startDate, setStartDate] = useState(initialTask?.recurrence?.startDate || effectiveStart);
  const [endDate, setEndDate] = useState(initialTask?.recurrence?.endDate || "");
  const [customDays, setCustomDays] = useState<number[]>(
    initialTask?.recurrence?.daysOfWeek && initialTask.recurrence.daysOfWeek.length > 0
      ? initialTask.recurrence.daysOfWeek
      : [1, 3, 5]
  );

  // Goal Type State (Progressively disclosed)
  const hasExistingAdvanced = Boolean(
    (initialTask?.notes && initialTask.notes.trim()) ||
    initialTask?.durationTargetMinutes ||
    initialTask?.quantityTarget
  );
  const [showAdvanced, setShowAdvanced] = useState(hasExistingAdvanced);

  const [goalType, setGoalType] = useState<"standard" | "duration" | "quantity">(
    initialTask?.quantityTarget ? "quantity" : initialTask?.durationTargetMinutes ? "duration" : "standard"
  );

  const initialDuration = initialTask?.durationTargetMinutes ? String(initialTask.durationTargetMinutes) : "none";
  const isCustomDuration = Boolean(
    initialTask?.durationTargetMinutes && ![15, 30, 45, 60, 120, 180].includes(initialTask.durationTargetMinutes)
  );
  const [durationPreset, setDurationPreset] = useState<string>(
    isCustomDuration ? "custom" : initialDuration
  );
  const [customDurationMinutes, setCustomDurationMinutes] = useState<string>(
    initialTask?.durationTargetMinutes ? String(initialTask.durationTargetMinutes) : ""
  );

  const [quantityTarget, setQuantityTarget] = useState<string>(
    initialTask?.quantityTarget ? String(initialTask.quantityTarget) : "8"
  );
  const [quantityUnit, setQuantityUnit] = useState<string>(initialTask?.quantityUnit || "glasses");
  const [quantityStep, setQuantityStep] = useState<string>(
    initialTask?.quantityStep ? String(initialTask.quantityStep) : "1"
  );

  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    titleRef.current?.focus();
    if (isEdit && titleRef.current) {
      const len = titleRef.current.value.length;
      titleRef.current.setSelectionRange(len, len);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEdit, onCancel]);

  function toggleCustomDay(dayNumber: number) {
    setError(null);
    setCustomDays((prev) =>
      prev.includes(dayNumber) ? prev.filter((d) => d !== dayNumber) : [...prev, dayNumber]
    );
  }

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      titleRef.current?.focus();
      return;
    }

    const cleanDueTime = dueTime.trim() || null;
    const cleanReminder = cleanDueTime && reminder !== "none" ? reminder : null;

    let cleanDuration: number | null = null;
    let cleanQtyTarget: number | null = null;
    let cleanQtyUnit = "";
    let cleanQtyStep = 1;

    if (showAdvanced) {
      if (goalType === "duration") {
        if (durationPreset !== "none") {
          if (durationPreset === "custom") {
            const val = parseInt(customDurationMinutes, 10);
            if (!isNaN(val) && val > 0) cleanDuration = val;
          } else {
            const val = parseInt(durationPreset, 10);
            if (!isNaN(val) && val > 0) cleanDuration = val;
          }
        }
      } else if (goalType === "quantity") {
        const qVal = parseFloat(quantityTarget);
        if (!isNaN(qVal) && qVal > 0) {
          cleanQtyTarget = qVal;
          cleanQtyUnit = quantityUnit.trim();
          const sVal = parseFloat(quantityStep);
          cleanQtyStep = !isNaN(sVal) && sVal > 0 ? sVal : 1;
        }
      }
    }

    if (repeat === "none") {
      const cleanDueDate = dueDate.trim() || effectiveStart;
      onSubmit({
        title: trimmed,
        priority,
        category,
        notes: notes.trim(),
        recurrence: null,
        dueTime: cleanDueTime,
        reminderMinutes: cleanReminder,
        dueDate: cleanDueDate,
        durationTargetMinutes: cleanDuration,
        quantityTarget: cleanQtyTarget,
        quantityUnit: cleanQtyUnit,
        quantityStep: cleanQtyStep,
        important
      });
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

    onSubmit({
      title: trimmed,
      priority,
      category,
      notes: notes.trim(),
      recurrence: rec,
      dueTime: cleanDueTime,
      reminderMinutes: cleanReminder,
      dueDate: null,
      durationTargetMinutes: cleanDuration,
      quantityTarget: cleanQtyTarget,
      quantityUnit: cleanQtyUnit,
      quantityStep: cleanQtyStep,
      important
    });
  }

  const weeklyDayName = weekdayFull(startDate || effectiveStart);

  const modalContent = (
    <div
      className="dc-task-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <div
        className="dc-task-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-modal-title"
      >
        {/* 1. FIXED HEADER */}
        <div className="dc-task-modal-header">
          <h2 id="task-form-modal-title" className="dc-task-modal-title">
            {isEdit ? "Edit Task" : "Add Task"}
          </h2>
          <button
            type="button"
            className="dc-task-modal-close-btn"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <CloseIcon />
          </button>
        </div>

        {/* 2. INDEPENDENTLY SCROLLABLE CONTENT */}
        <div className="dc-task-modal-body">
          {/* PRIMARY: TASK TITLE */}
          <div className="dc-task-form-field">
            <label className="dc-field-label dc-field-label-primary" htmlFor="task-form-title">
              What needs to be done?
            </label>
            <input
              id="task-form-title"
              ref={titleRef}
              type="text"
              className="dc-title-input"
              placeholder="What needs to be done?"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && repeat === "none") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>

          {/* SECONDARY: PRIORITY & IMPORTANT */}
          <div className="dc-task-form-field">
            <div className="dc-field-header-row">
              <span className="dc-field-label">Priority</span>
              <button
                type="button"
                className={`dc-important-toggle${important ? " is-important" : ""}`}
                onClick={() => setImportant((v) => !v)}
                aria-pressed={important}
                title="Toggle important status"
              >
                <span>{important ? "⭐ Important" : "☆ Mark Important"}</span>
              </button>
            </div>

            <div className="dc-segmented-control" role="radiogroup" aria-label="Priority">
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={`dc-segmented-btn${isSelected ? " active" : ""}`}
                    onClick={() => setPriority(p.value)}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECONDARY: CATEGORY */}
          <div className="dc-task-form-field">
            <label className="dc-field-label" htmlFor="task-form-category">
              Category
            </label>
            <select
              id="task-form-category"
              className="dc-form-select"
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
          </div>

          {/* SCHEDULE SECTION */}
          <div className="dc-schedule-group">
            <div className="dc-schedule-header">SCHEDULE</div>

            {/* Due date (for non-recurring) */}
            {repeat === "none" ? (
              <div className="dc-task-form-field">
                <label className="dc-field-label" htmlFor="task-form-due-date">
                  Due date
                </label>
                <div className="dc-date-picker-wrap">
                  <div className="dc-date-display-badge">
                    <span>{formatDisplayDate(dueDate)}</span>
                    <span className="dc-calendar-icon" aria-hidden="true">📅</span>
                  </div>
                  <input
                    id="task-form-due-date"
                    type="date"
                    className="dc-date-hidden-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    aria-label="Due date"
                  />
                </div>
              </div>
            ) : null}

            {/* Repeat selector */}
            <div className="dc-task-form-field">
              <label className="dc-field-label" htmlFor="task-form-repeat">
                Repeat
              </label>
              <select
                id="task-form-repeat"
                className="dc-form-select"
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
            </div>

            {/* Recurrence Options when active */}
            {repeat !== "none" ? (
              <div className="dc-recurrence-options">
                <div className="dc-recurrence-dates-grid">
                  <div className="dc-task-form-field">
                    <label className="dc-subfield-label" htmlFor="task-recurrence-start">
                      Start date
                    </label>
                    <input
                      id="task-recurrence-start"
                      type="date"
                      className="dc-form-input"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                  <div className="dc-task-form-field">
                    <label className="dc-subfield-label" htmlFor="task-recurrence-end">
                      End date (optional)
                    </label>
                    <input
                      id="task-recurrence-end"
                      type="date"
                      className="dc-form-input"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                </div>

                {repeat === "weekly" ? (
                  <div className="dc-recurrence-hint">
                    Repeats every <strong>{weeklyDayName}</strong> starting {formatDisplayDate(startDate || effectiveStart)}.
                  </div>
                ) : null}

                {repeat === "custom" ? (
                  <div className="dc-custom-days-group">
                    <div className="dc-subfield-label">Repeat on days:</div>
                    <div className="dc-days-row" role="group" aria-label="Select repeat days">
                      {DAYS_OF_WEEK_OPTIONS.map((opt) => {
                        const isSelected = customDays.includes(opt.day);
                        return (
                          <button
                            key={opt.day}
                            type="button"
                            className={`dc-day-pill${isSelected ? " active" : ""}`}
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

                {error ? <div className="dc-form-error">{error}</div> : null}
              </div>
            ) : null}

            {/* Due time & Reminder row */}
            <div className="dc-time-reminder-row">
              <div className="dc-task-form-field dc-time-col">
                <label className="dc-field-label" htmlFor="task-form-due-time">
                  Due time
                </label>
                <input
                  id="task-form-due-time"
                  type="time"
                  className="dc-form-input"
                  value={dueTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDueTime(val);
                    if (!val) setReminder("none");
                  }}
                  aria-label="Due time"
                />
              </div>

              <div className="dc-task-form-field dc-reminder-col">
                <label className="dc-field-label" htmlFor="task-form-reminder">
                  Reminder
                </label>
                <select
                  id="task-form-reminder"
                  className="dc-form-select"
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
              <div className="dc-schedule-subhint">Set a due time to enable reminders.</div>
            ) : null}
          </div>

          {/* PROGRESSIVELY DISCLOSED ADVANCED SECTION: NOTES & GOALS */}
          <div className="dc-advanced-section">
            <button
              type="button"
              className="dc-advanced-toggle"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              <span>{showAdvanced ? "▾ Hide Additional Details" : "▸ Additional Details (Notes & Goals)"}</span>
            </button>

            {showAdvanced ? (
              <div className="dc-advanced-content">
                {/* Notes */}
                <div className="dc-task-form-field">
                  <label className="dc-field-label" htmlFor="task-form-notes">
                    Notes (optional)
                  </label>
                  <textarea
                    id="task-form-notes"
                    className="dc-form-textarea"
                    rows={2}
                    placeholder="Add details, links, or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Task Type / Goals */}
                <div className="dc-task-form-field">
                  <label className="dc-field-label" id="task-form-type-label">
                    Task Type
                  </label>
                  <div
                    className="dc-task-type-pills"
                    role="radiogroup"
                    aria-labelledby="task-form-type-label"
                  >
                    <button
                      type="button"
                      className={`dc-type-btn${goalType === "standard" ? " active" : ""}`}
                      onClick={() => setGoalType("standard")}
                      role="radio"
                      aria-checked={goalType === "standard"}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      className={`dc-type-btn${goalType === "duration" ? " active" : ""}`}
                      onClick={() => setGoalType("duration")}
                      role="radio"
                      aria-checked={goalType === "duration"}
                    >
                      ⏱ Duration
                    </button>
                    <button
                      type="button"
                      className={`dc-type-btn${goalType === "quantity" ? " active" : ""}`}
                      onClick={() => setGoalType("quantity")}
                      role="radio"
                      aria-checked={goalType === "quantity"}
                    >
                      📊 Quantity
                    </button>
                  </div>

                  {goalType === "duration" ? (
                    <div className="dc-goal-content">
                      <div className="dc-subfield-label">Target Duration</div>
                      <div className="dc-duration-presets" role="radiogroup" aria-label="Target duration">
                        <button
                          type="button"
                          className={`dc-preset-pill${durationPreset === "none" ? " active" : ""}`}
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
                            className={`dc-preset-pill${durationPreset === String(p.minutes) ? " active" : ""}`}
                            onClick={() => setDurationPreset(String(p.minutes))}
                            role="radio"
                            aria-checked={durationPreset === String(p.minutes)}
                          >
                            {p.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`dc-preset-pill${durationPreset === "custom" ? " active" : ""}`}
                          onClick={() => setDurationPreset("custom")}
                          role="radio"
                          aria-checked={durationPreset === "custom"}
                        >
                          Custom
                        </button>
                      </div>

                      {durationPreset === "custom" ? (
                        <div className="dc-custom-duration-row">
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            className="dc-form-input dc-custom-duration-input"
                            placeholder="Minutes"
                            value={customDurationMinutes}
                            onChange={(e) => setCustomDurationMinutes(e.target.value)}
                            aria-label="Custom duration in minutes"
                          />
                          <span className="dc-unit-hint">
                            {customDurationMinutes && !isNaN(Number(customDurationMinutes))
                              ? formatDuration(Number(customDurationMinutes))
                              : "minutes"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : goalType === "quantity" ? (
                    <div className="dc-goal-content">
                      <div className="dc-quantity-grid">
                        <div className="dc-task-form-field">
                          <label className="dc-subfield-label" htmlFor="task-qty-target">
                            Daily Target
                          </label>
                          <input
                            id="task-qty-target"
                            type="number"
                            step="any"
                            min="0.01"
                            className="dc-form-input"
                            value={quantityTarget}
                            onChange={(e) => setQuantityTarget(e.target.value)}
                            placeholder="e.g. 8"
                          />
                        </div>
                        <div className="dc-task-form-field">
                          <label className="dc-subfield-label" htmlFor="task-qty-unit">
                            Unit
                          </label>
                          <input
                            id="task-qty-unit"
                            type="text"
                            className="dc-form-input"
                            value={quantityUnit}
                            onChange={(e) => setQuantityUnit(e.target.value)}
                            placeholder="glasses, L, steps"
                          />
                        </div>
                      </div>

                      <div className="dc-unit-pills">
                        {COMMON_UNITS.map((u) => (
                          <button
                            key={u}
                            type="button"
                            className={`dc-unit-chip${quantityUnit.toLowerCase() === u.toLowerCase() ? " active" : ""}`}
                            onClick={() => setQuantityUnit(u)}
                          >
                            {u}
                          </button>
                        ))}
                      </div>

                      <div className="dc-task-form-field" style={{ marginTop: 8 }}>
                        <label className="dc-subfield-label" htmlFor="task-qty-step">
                          Quick-add Step
                        </label>
                        <input
                          id="task-qty-step"
                          type="number"
                          step="any"
                          min="0.01"
                          className="dc-form-input"
                          style={{ maxWidth: 120 }}
                          value={quantityStep}
                          onChange={(e) => setQuantityStep(e.target.value)}
                          placeholder="e.g. 1"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 3. FIXED BOTTOM STICKY ACTION AREA */}
        <div className="dc-task-modal-footer">
          <button
            type="button"
            className="dc-task-modal-primary-btn"
            onClick={handleSave}
          >
            {isEdit ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
