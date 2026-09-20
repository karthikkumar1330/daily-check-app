import { useEffect, useRef, useState } from "react";
import type { CategoryId, Priority } from "../../types";
import { CATEGORIES } from "../../utils/taskUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

interface AddTaskModalProps {
  onAdd: (title: string, priority: Priority, category: CategoryId, notes: string) => void;
  onCancel: () => void;
}

const PRIORITY_ORDER: { value: Priority; label: string }[] = [
  { value: 3, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 1, label: "High" }
];

export default function AddTaskModal({ onAdd, onCancel }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(2);
  const [category, setCategory] = useState<CategoryId>("");
  const [notes, setNotes] = useState("");
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

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      titleRef.current?.focus();
      return;
    }
    onAdd(trimmed, priority, category, notes.trim());
  }

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
            if (e.key === "Enter") {
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

        <label className="field-label" htmlFor="add-task-notes">
          Notes (optional)
        </label>
        <textarea
          id="add-task-notes"
          className="modal-input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="row" style={{ marginTop: 4 }}>
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
