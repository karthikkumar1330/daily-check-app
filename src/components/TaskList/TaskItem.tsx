import { useEffect, useRef, useState } from "react";
import type { CategoryId, Priority, RecurrenceType, ReminderMinutes, Task, TaskRecurrence } from "../../types";
import { addDays, formatShort, getWeekStart, parseDateStr, todayStr, weekdayFull } from "../../utils/dateUtils";
import { DAYS_OF_WEEK_OPTIONS, formatRecurrenceLabel, validateRecurrence } from "../../utils/recurrenceUtils";
import { CATEGORIES, categoryMeta, prioClass, prioEmoji, prioLabel } from "../../utils/taskUtils";
import { formatTimeDisplay, getReminderLabel, getTaskScheduleStatus, REMINDER_OPTIONS } from "../../utils/scheduleUtils";
import { CheckIcon, DownIcon, EditIcon, FocusIcon, MoreIcon, RescheduleIcon, TrashIcon, UpIcon } from "../icons";
import RescheduleModal from "../Modals/RescheduleModal";
import { useTasks } from "../../hooks/useTasks";

interface TaskItemProps {
  task: Task;
  isFirst?: boolean;
  isLast?: boolean;
  isEditing: boolean;
  /** Specific calendar date for evaluating time status (e.g. today, overdue) */
  dateStr?: string;
  /** Shown as a small badge when the task is listed outside its own day (Important, High Priority). */
  dateLabel?: string;
  /** Hide the reorder controls — irrelevant in cross-day lists. */
  hideReorder?: boolean;
  onToggle: () => void;
  onToggleFocus?: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onReschedule?: (targetDate: string) => void;
  onToast?: (message: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function TaskItem({
  task,
  isFirst,
  isLast,
  isEditing,
  dateStr,
  dateLabel,
  hideReorder,
  onToggle,
  onToggleFocus,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onReschedule,
  onToast,
  onMoveUp,
  onMoveDown
}: TaskItemProps) {
  const { rescheduleTask } = useTasks();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (isEditing) {
    return <EditForm task={task} onCancel={onCancelEdit} onSave={onSave} />;
  }

  const isFocused = Boolean(dateStr && task.focusDate === dateStr);
  const cat = categoryMeta(task.category);
  const recurrenceLabel = formatRecurrenceLabel(task.recurrence);
  const timeFormatted = formatTimeDisplay(task.dueTime);
  const scheduleStatus = getTaskScheduleStatus(task, dateStr || todayStr());

  return (
    <div className={"task" + (task.completed ? " completed" : "")}>
      <button
        className="check"
        onClick={onToggle}
        aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
        aria-pressed={task.completed}
      >
        <CheckIcon />
      </button>
      <div className="task-main">
        <div className="task-title-row">
          <span className={"prio-dot " + prioClass(task.priority)} title={prioLabel(task.priority) + " priority"} />
          <span className="task-title">{task.title}</span>

          {/* Focus Badge */}
          {isFocused ? (
            <span
              className="task-focus-badge"
              title="Today's Focus task"
              aria-label="Today's Focus task"
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 6,
                background: "var(--accent-soft, rgba(16, 185, 129, 0.15))",
                color: "var(--accent, #10b981)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3
              }}
            >
              <span>🎯</span>
              <span>Focus</span>
            </span>
          ) : null}

          {/* Time & Due Status Badges */}
          {timeFormatted ? (
            task.completed ? (
              <span className="task-time-badge completed" title={`Due at ${timeFormatted}`}>
                🕒 {timeFormatted}
              </span>
            ) : scheduleStatus === "overdue" ? (
              <span
                className="task-time-badge overdue"
                title={`Overdue · Due at ${timeFormatted}`}
                aria-label={`Overdue · Due at ${timeFormatted}`}
              >
                ⚠️ Overdue · {timeFormatted}
              </span>
            ) : scheduleStatus === "due" ? (
              <span
                className="task-time-badge due"
                title={`Due · ${timeFormatted}`}
                aria-label={`Due at ${timeFormatted}`}
              >
                ⏰ Due · {timeFormatted}
              </span>
            ) : (
              <span className="task-time-badge upcoming" title={`Due at ${timeFormatted}`}>
                🕒 {timeFormatted}
              </span>
            )
          ) : null}

          {/* Reminder Badge */}
          {task.reminderMinutes !== null && task.reminderMinutes !== undefined && !task.completed ? (
            <span
              className="task-reminder-badge"
              title={`Reminder: ${getReminderLabel(task.reminderMinutes)}`}
              aria-label={`Reminder: ${getReminderLabel(task.reminderMinutes)}`}
            >
              🔔 {task.reminderMinutes === 0 ? "At due time" : `${task.reminderMinutes} min before`}
            </span>
          ) : null}

          {recurrenceLabel ? (
            <span className="task-recurrence-badge" title={`Repeats: ${recurrenceLabel}`}>
              🔁 {recurrenceLabel}
            </span>
          ) : null}
          {dateLabel ? <span className="task-date-badge">{dateLabel}</span> : null}
          {cat.id ? (
            <span className="task-cat">
              {cat.emoji} {cat.label}
            </span>
          ) : null}
        </div>
        {task.notes ? <div className="task-notes">{task.notes}</div> : null}
      </div>
      <div className="task-actions" ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
        {onToggleFocus ? (
          <button
            type="button"
            className={"task-focus-toggle-btn" + (isFocused ? " is-focused" : "")}
            onClick={onToggleFocus}
            aria-label={isFocused ? `Remove "${task.title}" from today's focus` : `Mark "${task.title}" as today's focus`}
            aria-pressed={isFocused}
            title={isFocused ? "Focused task (click to remove)" : "Mark as today's focus"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              border: isFocused ? "1px solid var(--accent, #10b981)" : "1px solid var(--border)",
              background: isFocused ? "var(--accent-soft, rgba(16, 185, 129, 0.1))" : "transparent",
              color: isFocused ? "var(--accent, #10b981)" : "var(--ink-muted)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 36
            }}
          >
            <span aria-hidden="true">{isFocused ? "🎯" : "☆"}</span>
            <span>{isFocused ? "Focused" : "Focus"}</span>
          </button>
        ) : null}
        <button
          className="icon-btn task-more-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Task actions"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <MoreIcon />
        </button>
        {menuOpen ? (
          <div className="task-menu" role="menu">
            {onToggleFocus ? (
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleFocus();
                }}
              >
                <FocusIcon /> {isFocused ? "Remove Focus" : "Mark Focus"}
              </button>
            ) : null}
            <button
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setRescheduleOpen(true);
              }}
            >
              <RescheduleIcon /> Reschedule
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onStartEdit();
              }}
            >
              <EditIcon /> Edit
            </button>
            {!hideReorder && onMoveUp ? (
              <button
                role="menuitem"
                disabled={isFirst}
                onClick={() => {
                  setMenuOpen(false);
                  onMoveUp();
                }}
              >
                <UpIcon /> Move up
              </button>
            ) : null}
            {!hideReorder && onMoveDown ? (
              <button
                role="menuitem"
                disabled={isLast}
                onClick={() => {
                  setMenuOpen(false);
                  onMoveDown();
                }}
              >
                <DownIcon /> Move down
              </button>
            ) : null}
            <button
              role="menuitem"
              className="danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              <TrashIcon /> Delete
            </button>
          </div>
        ) : null}
      </div>

      {rescheduleOpen ? (
        <RescheduleModal
          task={task}
          currentDate={dateStr || task.dueDate || todayStr()}
          onReschedule={(targetDate) => {
            setRescheduleOpen(false);
            if (onReschedule) {
              onReschedule(targetDate);
            } else {
              const sourceDate = dateStr || task.dueDate || todayStr();
              const res = rescheduleTask(sourceDate, task.id, targetDate);
              if (res.ok) {
                const toastMsg =
                  targetDate === todayStr()
                    ? "Task moved to today."
                    : targetDate === addDays(todayStr(), 1)
                    ? "Task moved to tomorrow."
                    : targetDate === addDays(getWeekStart(todayStr()), 7)
                    ? "Task moved to next week."
                    : `Task moved to ${formatShort(targetDate)}.`;
                onToast?.(toastMsg);
              } else if (res.reason) {
                onToast?.(res.reason);
              }
            }
          }}
          onCancel={() => setRescheduleOpen(false)}
          onEditRecurrence={
            task.recurrence
              ? () => {
                  setRescheduleOpen(false);
                  onStartEdit();
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

interface EditFormProps {
  task: Task;
  onCancel: () => void;
  onSave: (updates: Partial<Task>) => void;
}

type RepeatOption = "none" | RecurrenceType;

const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every week" },
  { value: "custom", label: "Custom days" }
];

function EditForm({ task, onCancel, onSave }: EditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [category, setCategory] = useState<CategoryId>(task.category);
  const [notes, setNotes] = useState(task.notes);

  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [reminder, setReminder] = useState<ReminderMinutes | "none">(task.reminderMinutes ?? "none");

  const initialRepeat: RepeatOption = task.recurrence?.type ?? "none";
  const [repeat, setRepeat] = useState<RepeatOption>(initialRepeat);
  const [startDate, setStartDate] = useState(task.recurrence?.startDate ?? todayStr());
  const [endDate, setEndDate] = useState(task.recurrence?.endDate ?? "");
  const [customDays, setCustomDays] = useState<number[]>(
    task.recurrence?.daysOfWeek && task.recurrence.daysOfWeek.length > 0
      ? task.recurrence.daysOfWeek
      : [1, 3, 5]
  );
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const len = titleRef.current?.value.length ?? 0;
    titleRef.current?.setSelectionRange(len, len);
  }, []);

  function toggleCustomDay(dayNumber: number) {
    setError(null);
    setCustomDays((prev) =>
      prev.includes(dayNumber) ? prev.filter((d) => d !== dayNumber) : [...prev, dayNumber]
    );
  }

  function save() {
    const trimmed = title.trim();

    let rec: TaskRecurrence | null = null;
    if (repeat !== "none") {
      rec = {
        type: repeat,
        startDate: startDate || todayStr(),
        ...(endDate.trim() ? { endDate: endDate.trim() } : {}),
        daysOfWeek:
          repeat === "custom"
            ? customDays
            : repeat === "weekly"
            ? [parseDateStr(startDate || todayStr()).getDay()]
            : undefined
      };

      const val = validateRecurrence(rec);
      if (!val.valid) {
        setError(val.error ?? "Invalid recurrence configuration");
        return;
      }
    }

    const cleanDueTime = dueTime.trim() || null;
    const cleanReminder = cleanDueTime && reminder !== "none" ? reminder : null;
    const cleanDueDate = repeat === "none" ? (dueDate.trim() || null) : null;

    onSave({
      title: trimmed || task.title,
      priority,
      category,
      notes: notes.trim(),
      recurrence: rec,
      dueDate: cleanDueDate,
      dueTime: cleanDueTime,
      reminderMinutes: cleanReminder
    });
  }

  const weeklyDayName = weekdayFull(startDate || todayStr());

  return (
    <div className="task">
      <div className="edit-form">
        <input
          ref={titleRef}
          type="text"
          value={title}
          maxLength={140}
          aria-label="Task title"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && repeat === "none") {
              e.preventDefault();
              save();
            }
          }}
        />
        <div className="edit-row">
          <div className="seg" role="radiogroup" aria-label="Priority">
            {([1, 2, 3] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={priority === p}
                className={priority === p ? "active" : ""}
                onClick={() => setPriority(p)}
              >
                {prioEmoji(p)} {prioLabel(p)}
              </button>
            ))}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} aria-label="Category">
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? c.emoji + " " : ""}
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Recurrence repeat selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink-muted)" }} htmlFor={`edit-task-repeat-${task.id}`}>
            Repeat
          </label>
          <select
            id={`edit-task-repeat-${task.id}`}
            value={repeat}
            onChange={(e) => {
              setRepeat(e.target.value as RepeatOption);
              setError(null);
            }}
            aria-label="Repeat option"
          >
            {REPEAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {repeat !== "none" ? (
          <div className="recurrence-control-group">
            <div className="recurrence-dates-row">
              <div className="recurrence-date-field">
                <label className="recurrence-sublabel" htmlFor={`edit-recurrence-start-date-${task.id}`}>
                  Start date
                </label>
                <input
                  id={`edit-recurrence-start-date-${task.id}`}
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
                <label className="recurrence-sublabel" htmlFor={`edit-recurrence-end-date-${task.id}`}>
                  End date (optional)
                </label>
                <input
                  id={`edit-recurrence-end-date-${task.id}`}
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
                Repeats every <strong>{weeklyDayName}</strong> starting {startDate}.
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
              <label className="field-label" htmlFor={`edit-task-due-date-${task.id}`}>
                Due date
              </label>
              <input
                id={`edit-task-due-date-${task.id}`}
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
              <label className="field-label" htmlFor={`edit-task-due-time-${task.id}`}>
                Due time (optional)
              </label>
              <input
                id={`edit-task-due-time-${task.id}`}
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
              <label className="field-label" htmlFor={`edit-task-reminder-${task.id}`}>
                Reminder
              </label>
              <select
                id={`edit-task-reminder-${task.id}`}
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

        <textarea
          placeholder="Notes (optional)"
          rows={2}
          value={notes}
          aria-label="Notes"
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="edit-actions">
          <button className="btn-primary" onClick={save}>
            Save
          </button>
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
