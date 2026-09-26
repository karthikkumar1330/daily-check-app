import { useEffect, useRef, useState } from "react";
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

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal routine-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-editor-title"
        style={{ maxWidth: 540, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-header">
          <h2 id="routine-editor-title" style={{ margin: 0 }}>
            {isEdit ? "Edit Routine" : "New Daily Routine"}
          </h2>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <p className="modal-subtitle" style={{ margin: "4px 0 16px" }}>
          Create a reusable template of tasks you can apply to any day in one tap.
        </p>

        {error ? (
          <div className="modal-error" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ overflowY: "auto", paddingRight: 4, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Routine Name & Icon */}
            <div>
              <label className="field-label" htmlFor="routine-name">
                Routine name
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  id="routine-name"
                  ref={nameRef}
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Bank Exam Routine, Workout, Morning Setup"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Icon Chooser */}
            <div>
              <label className="field-label" id="icon-choices-label">
                Icon
              </label>
              <div
                className="icon-picker"
                role="radiogroup"
                aria-labelledby="icon-choices-label"
                style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
              >
                {ICON_CHOICES.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    role="radio"
                    aria-checked={icon === ic}
                    aria-label={`Select icon ${ic}`}
                    className={`icon-choice ${icon === ic ? "selected" : ""}`}
                    onClick={() => setIcon(ic)}
                    style={{
                      width: 44,
                      height: 44,
                      fontSize: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm, 8px)",
                      border: icon === ic ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: icon === ic ? "var(--accent-subtle, rgba(46, 125, 90, 0.1))" : "var(--surface)",
                      cursor: "pointer"
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks in Routine */}
            <div>
              <div className="section-row" style={{ margin: "8px 0 8px" }}>
                <label className="field-label" style={{ margin: 0, fontWeight: 600 }}>
                  Routine Tasks ({tasks.filter((t) => t.title.trim().length > 0).length})
                </label>
                <button
                  type="button"
                  className="link-btn"
                  onClick={handleAddTask}
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  + Add task
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="card"
                    style={{
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      border: "1px solid var(--border)",
                      borderRadius: 10
                    }}
                  >
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
                          style={{ width: 22, height: 22, padding: 0, opacity: index === 0 ? 0.3 : 1 }}
                        >
                          <UpIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={index === tasks.length - 1}
                          onClick={() => handleMoveTask(index, "down")}
                          aria-label={`Move task ${index + 1} down`}
                          style={{ width: 22, height: 22, padding: 0, opacity: index === tasks.length - 1 ? 0.3 : 1 }}
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
                        style={{ flex: 1, minHeight: 40 }}
                      />

                      {/* Remove task */}
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemoveTask(task.id)}
                        aria-label={`Remove task ${index + 1}`}
                        style={{ color: "var(--danger, #ef4444)", minWidth: 40, minHeight: 40 }}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {/* Metadata row: Priority & Category */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      {/* Priority selector */}
                      <div className="seg" role="radiogroup" aria-label="Priority" style={{ height: 32 }}>
                        {([1, 2, 3] as Priority[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={task.priority === p}
                            className={task.priority === p ? "active" : ""}
                            onClick={() => handleUpdateTask(task.id, { priority: p })}
                            style={{ padding: "0 8px", fontSize: 12 }}
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
                          height: 32,
                          fontSize: 12,
                          padding: "0 8px",
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
                        style={{ height: 32, fontSize: 12, flex: "1 1 120px" }}
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
                        style={{ fontSize: 12, marginLeft: "auto" }}
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
                            style={{ fontSize: 13 }}
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
                              style={{ fontSize: 13, minHeight: 36 }}
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
                                style={{ fontSize: 13, minHeight: 36 }}
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
                className="btn btn-secondary"
                onClick={handleAddTask}
                style={{ width: "100%", marginTop: 8, minHeight: 40, justifyContent: "center", fontSize: 13 }}
              >
                + Add Another Task
              </button>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div
            className="modal-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid var(--border)"
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{ minHeight: 44, padding: "0 16px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minHeight: 44, padding: "0 20px" }}
            >
              {isEdit ? "Save Changes" : "Create Routine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
