import { useEffect, useRef, useState } from "react";
import type { CategoryId, Priority, Task } from "../../types";
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
          className="icon-btn"
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

function EditForm({ task, onCancel, onSave }: EditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [category, setCategory] = useState<CategoryId>(task.category);
  const [notes, setNotes] = useState(task.notes);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const len = titleRef.current?.value.length ?? 0;
    titleRef.current?.setSelectionRange(len, len);
  }, []);

  function save() {
    const trimmed = title.trim();
    onSave({
      title: trimmed || task.title,
      priority,
      category,
      notes: notes.trim()
    });
  }

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
            if (e.key === "Enter") {
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
