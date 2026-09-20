import { useEffect, useRef, useState } from "react";
import type { CategoryId, Priority, RecurrenceType, Task, TaskRecurrence } from "../../types";
import { parseDateStr, todayStr, weekdayFull } from "../../utils/dateUtils";
import { DAYS_OF_WEEK_OPTIONS, formatRecurrenceLabel, validateRecurrence } from "../../utils/recurrenceUtils";
import { CATEGORIES, categoryMeta, prioClass, prioEmoji, prioLabel } from "../../utils/taskUtils";
import { CheckIcon, DownIcon, EditIcon, MoreIcon, TrashIcon, UpIcon } from "../icons";

interface TaskItemProps {
  task: Task;
  isFirst?: boolean;
  isLast?: boolean;
  isEditing: boolean;
  /** Shown as a small badge when the task is listed outside its own day (Important, High Priority). */
  dateLabel?: string;
  /** Hide the reorder controls — irrelevant in cross-day lists. */
  hideReorder?: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function TaskItem({
  task,
  isFirst,
  isLast,
  isEditing,
  dateLabel,
  hideReorder,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown
}: TaskItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const cat = categoryMeta(task.category);
  const recurrenceLabel = formatRecurrenceLabel(task.recurrence);

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
      <div className="task-actions" ref={menuRef} style={{ position: "relative" }}>
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

    onSave({
      title: trimmed || task.title,
      priority,
      category,
      notes: notes.trim(),
      recurrence: rec
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
          <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink-muted)" }} htmlFor="edit-task-repeat">
            Repeat
          </label>
          <select
            id="edit-task-repeat"
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
                <label className="recurrence-sublabel" htmlFor="edit-recurrence-start-date">
                  Start date
                </label>
                <input
                  id="edit-recurrence-start-date"
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
                <label className="recurrence-sublabel" htmlFor="edit-recurrence-end-date">
                  End date (optional)
                </label>
                <input
                  id="edit-recurrence-end-date"
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
