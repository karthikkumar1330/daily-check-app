import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryId, Priority, ReminderMinutes, Routine, RoutineTask } from "../../types";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CATEGORIES } from "../../utils/taskUtils";
import { CloseIcon, DownIcon, TrashIcon, UpIcon } from "../icons";

const ICON_CHOICES = ["🎓", "💪", "🌅", "🌙", "💼", "⚡", "🧘", "📚", "🎯", "📋", "🏃", "💻"];

interface RoutineEditorModalProps {
  routine?: Routine;
  onSave: (data: {
    name: string;
    icon: string;
    tasks: RoutineTask[];
  }) => { ok: boolean; error?: string };
  onCancel: () => void;
}

interface EditableTaskItem extends RoutineTask {
  showDetails?: boolean;
}

function uid(): string {
  return "rt_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function RoutineEditorModal({ routine, onSave, onCancel }: RoutineEditorModalProps) {
  const isEdit = !!routine;
  const [name, setName] = useState(routine?.name ?? "");
  const [icon, setIcon] = useState(routine?.icon ?? ICON_CHOICES[0]);
  const [tasks, setTasks] = useState<EditableTaskItem[]>(() => {
    if (routine && routine.tasks.length > 0) {
      return routine.tasks.map((t) => ({ ...t, showDetails: Boolean(t.notes || t.dueTime) }));
    }
    return [
      {
        id: uid(),
        title: "",
        priority: 2,
        category: "",
        notes: "",
        dueTime: null,
        reminderMinutes: null,
        showDetails: false
      }
    ];
  });
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    nameRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAddTask() {
    setTasks((prev) => [
      ...prev,
      {
        id: uid(),
        title: "",
        priority: 2,
        category: "",
        notes: "",
        dueTime: null,
        reminderMinutes: null,
        showDetails: false
      }
    ]);
  }

  function handleUpdateTask(id: string, updates: Partial<EditableTaskItem>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  function handleRemoveTask(id: string) {
    setTasks((prev) => {
      if (prev.length <= 1) {
        return [
          {
            id: uid(),
            title: "",
            priority: 2,
            category: "",
            notes: "",
            dueTime: null,
            reminderMinutes: null,
            showDetails: false
          }
        ];
      }
      return prev.filter((t) => t.id !== id);
    });
  }

  function handleMoveTask(index: number, direction: "up" | "down") {
    setTasks((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a routine name.");
      nameRef.current?.focus();
      return;
    }

    const validTasks = tasks
      .map((t) => ({
        id: t.id,
        title: t.title.trim(),
        priority: t.priority,
        important: Boolean(t.important),
        category: t.category,
        notes: t.notes.trim(),
        dueTime: t.dueTime || null,
        reminderMinutes: t.dueTime ? (t.reminderMinutes ?? null) : null
      }))
      .filter((t) => t.title.length > 0);

    if (validTasks.length === 0) {
      setError("Please add at least one task with a title.");
      return;
    }

    const result = onSave({
      name: trimmedName,
      icon,
      tasks: validTasks
    });

    if (!result.ok) {
      setError(result.error || "Could not save routine.");
    }
  }

  const modalContent = (
    <div
      className="routine-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <div
        className="routine-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-editor-title"
      >
        {/* Fixed Header */}
        <div className="routine-modal-header">
          <h2 id="routine-editor-title" className="routine-modal-title">
            {isEdit ? "Edit Routine" : "New Daily Routine"}
          </h2>
          <button
            type="button"
            className="routine-modal-close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="routine-modal-form">
          {/* Scrollable Modal Body (Single Scroll Container) */}
          <div className="routine-modal-body">
            <p className="routine-modal-subtitle">
              Create a reusable template of tasks you can apply to any day in one tap.
            </p>

            {error ? (
              <div className="routine-modal-error" role="alert">
                {error}
              </div>
            ) : null}

            {/* Routine Name */}
            <div className="routine-form-field">
              <label className="field-label" htmlFor="routine-name">
                Routine name
              </label>
              <input
                id="routine-name"
                ref={nameRef}
                type="text"
                className="modal-input routine-title-input"
                placeholder="e.g. Bank Exam Routine, Workout, Morning Setup"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>

            {/* Icon Chooser */}
            <div className="routine-form-field">
              <label className="field-label" id="icon-choices-label">
                Icon
              </label>
              <div
                className="routine-icon-grid"
                role="radiogroup"
                aria-labelledby="icon-choices-label"
              >
                {ICON_CHOICES.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    role="radio"
                    aria-checked={icon === ic}
                    aria-label={`Select icon ${ic}`}
                    className={`routine-icon-btn ${icon === ic ? "selected" : ""}`}
                    onClick={() => setIcon(ic)}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks in Routine */}
            <div className="routine-form-field">
              <div className="routine-tasks-header-row">
                <label className="field-label" style={{ margin: 0, fontWeight: 700 }}>
                  Routine Tasks ({tasks.filter((t) => t.title.trim().length > 0).length})
                </label>
                <button
                  type="button"
                  className="link-btn routine-add-task-link"
                  onClick={handleAddTask}
                >
                  + Add task
                </button>
              </div>

              <div className="routine-task-cards-list">
                {tasks.map((task, index) => (
                  <div key={task.id} className="routine-task-edit-card card">
                    {/* Top Row: Reorder, Title, Delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Reorder controls */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={index === 0}
                          onClick={() => handleMoveTask(index, "up")}
                          aria-label={`Move task ${index + 1} up`}
                          style={{ width: 24, height: 24, padding: 0, opacity: index === 0 ? 0.3 : 1 }}
                        >
                          <UpIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={index === tasks.length - 1}
                          onClick={() => handleMoveTask(index, "down")}
                          aria-label={`Move task ${index + 1} down`}
                          style={{ width: 24, height: 24, padding: 0, opacity: index === tasks.length - 1 ? 0.3 : 1 }}
                        >
                          <DownIcon />
                        </button>
                      </div>

                      {/* Title input */}
                      <input
                        type="text"
                        className="modal-input"
                        placeholder={`Task ${index + 1} title (e.g. Quant Practice)`}
                        value={task.title}
                        onChange={(e) => handleUpdateTask(task.id, { title: e.target.value })}
                        style={{ flex: 1, minHeight: 44 }}
                      />

                      {/* Remove task */}
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemoveTask(task.id)}
                        aria-label={`Remove task ${index + 1}`}
                        style={{ color: "var(--danger, #ef4444)", minWidth: 44, minHeight: 44 }}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {/* Metadata row: Priority, Important & Category */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      {/* Priority selector */}
                      <div className="seg" role="radiogroup" aria-label="Priority" style={{ minHeight: 36 }}>
                        {([1, 2, 3] as Priority[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={task.priority === p}
                            className={task.priority === p ? "active" : ""}
                            onClick={() => handleUpdateTask(task.id, { priority: p })}
                            style={{ padding: "0 10px", fontSize: 12.5, minHeight: 36 }}
                          >
                            {p === 1 ? "High" : p === 2 ? "Med" : "Low"}
                          </button>
                        ))}
                      </div>

                      {/* Important toggle */}
                      <button
                        type="button"
                        className={"chip-btn" + (task.important ? " active" : "")}
                        onClick={() => handleUpdateTask(task.id, { important: !task.important })}
                        aria-label={task.important ? "Remove Important" : "Mark Important"}
                        title={task.important ? "Important (click to remove)" : "Mark Important"}
                        style={{
                          minHeight: 36,
                          fontSize: 12.5,
                          padding: "0 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: task.important ? "#b45309" : "var(--ink-muted)",
                          background: task.important ? "rgba(245, 158, 11, 0.15)" : "transparent",
                          border: task.important ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid var(--border)",
                          borderRadius: 6
                        }}
                      >
                        <span>{task.important ? "⭐ Important" : "☆ Important"}</span>
                      </button>

                      {/* Category select */}
                      <select
                        className="chip-select"
                        value={task.category}
                        onChange={(e) => handleUpdateTask(task.id, { category: e.target.value as CategoryId })}
                        style={{ minHeight: 36, fontSize: 12.5, flex: "1 1 120px" }}
                        aria-label={`Category for task ${index + 1}`}
                      >
                        <option value="">No category</option>
                        {CATEGORIES.filter((c) => c.id).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji} {c.label}
                          </option>
                        ))}
                      </select>

                      {/* Optional details toggle */}
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => handleUpdateTask(task.id, { showDetails: !task.showDetails })}
                        style={{ fontSize: 12.5, marginLeft: "auto", minHeight: 36 }}
                      >
                        {task.showDetails ? "− Less" : "+ Details"}
                      </button>
                    </div>

                    {/* Collapsible Details */}
                    {task.showDetails ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          paddingTop: 8,
                          borderTop: "1px dashed var(--border)"
                        }}
                      >
                        <div>
                          <input
                            type="text"
                            className="modal-input"
                            placeholder="Notes or instructions (optional)"
                            value={task.notes}
                            onChange={(e) => handleUpdateTask(task.id, { notes: e.target.value })}
                            style={{ fontSize: 13, minHeight: 40 }}
                          />
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: "1 1 130px" }}>
                            <label className="field-label" style={{ fontSize: 11, marginBottom: 2 }}>
                              Due Time (optional)
                            </label>
                            <input
                              type="time"
                              className="modal-input"
                              value={task.dueTime ?? ""}
                              onChange={(e) =>
                                handleUpdateTask(task.id, {
                                  dueTime: e.target.value || null,
                                  reminderMinutes: !e.target.value ? null : task.reminderMinutes
                                })
                              }
                              style={{ fontSize: 13, minHeight: 40 }}
                            />
                          </div>

                          {task.dueTime ? (
                            <div style={{ flex: "1 1 140px" }}>
                              <label className="field-label" style={{ fontSize: 11, marginBottom: 2 }}>
                                Reminder
                              </label>
                              <select
                                className="modal-input"
                                value={task.reminderMinutes ?? ""}
                                onChange={(e) =>
                                  handleUpdateTask(task.id, {
                                    reminderMinutes: e.target.value ? (Number(e.target.value) as ReminderMinutes) : null
                                  })
                                }
                                style={{ fontSize: 13, minHeight: 40 }}
                              >
                                <option value="">No reminder</option>
                                <option value="0">At due time</option>
                                <option value="5">5 min before</option>
                                <option value="15">15 min before</option>
                                <option value="30">30 min before</option>
                                <option value="60">1 hour before</option>
                              </select>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary routine-add-another-btn"
                onClick={handleAddTask}
              >
                + Add Another Task
              </button>
            </div>
          </div>

          {/* Sticky Modal Actions Footer */}
          <div className="routine-modal-footer">
            <button
              type="button"
              className="btn btn-secondary routine-modal-cancel-btn"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary routine-modal-submit-btn"
            >
              {isEdit ? "Save Changes" : "Create Routine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
