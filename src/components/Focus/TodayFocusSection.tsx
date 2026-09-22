import type { Task } from "../../types";
import { categoryMeta, prioClass, prioLabel } from "../../utils/taskUtils";
import { formatTimeDisplay } from "../../utils/scheduleUtils";
import { calculateDurationPct, formatDuration } from "../../utils/durationUtils";
import { calculateQuantityPct, formatQuantity } from "../../utils/quantityUtils";
import { CheckIcon, FocusIcon } from "../icons";

interface TodayFocusSectionProps {
  dateStr: string;
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onToggleFocus: (id: string) => void;
  onOpenSelector: () => void;
}

export default function TodayFocusSection({
  dateStr,
  tasks,
  onToggleTask,
  onToggleFocus,
  onOpenSelector
}: TodayFocusSectionProps) {
  const focusTasks = tasks.filter((t) => t.focusDate === dateStr);
  const completedCount = focusTasks.filter((t) => t.completed).length;

  return (
    <section className="card today-focus-section" aria-labelledby="today-focus-heading" style={{ marginBottom: 16 }}>
      <div
        className="today-focus-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: focusTasks.length > 0 ? 12 : 6
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2
            id="today-focus-heading"
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-muted)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span aria-hidden="true">🎯</span>
            <span>Today&apos;s Focus</span>
          </h2>
          {focusTasks.length > 0 ? (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: completedCount === focusTasks.length
                  ? "var(--accent-soft, rgba(16, 185, 129, 0.15))"
                  : "var(--surface-hover, rgba(0,0,0,0.05))",
                color: completedCount === focusTasks.length ? "var(--accent, #10b981)" : "var(--ink-muted)"
              }}
            >
              {completedCount}/{focusTasks.length} done
            </span>
          ) : null}
        </div>

        {focusTasks.length > 0 ? (
          <button
            type="button"
            className="btn text-btn focus-edit-btn"
            onClick={onOpenSelector}
            aria-label="Edit today's focus tasks"
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--accent, #10b981)",
              padding: "4px 8px",
              minHeight: 36,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <FocusIcon />
            <span>Edit Focus</span>
          </button>
        ) : null}
      </div>

      {focusTasks.length === 0 ? (
        <div
          className="today-focus-empty"
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            background: "var(--surface-subtle, rgba(0, 0, 0, 0.02))",
            border: "1px dashed var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap"
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: "0 0 2px", fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)" }}>
              No focus tasks selected
            </p>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink-muted)" }}>
              Select up to 3 priority tasks to spotlight today.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenSelector}
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              padding: "8px 14px",
              minHeight: 38,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>🎯 Choose Focus Tasks</span>
          </button>
        </div>
      ) : (
        <div className="today-focus-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {focusTasks.map((task) => {
            const cat = categoryMeta(task.category);
            const timeFormatted = formatTimeDisplay(task.dueTime);

            return (
              <div
                key={task.id}
                className={"today-focus-item" + (task.completed ? " completed" : "")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: task.completed
                    ? "var(--surface-subtle, rgba(0,0,0,0.02))"
                    : "var(--surface)",
                  transition: "background 0.15s ease",
                  minHeight: 44
                }}
              >
                <button
                  type="button"
                  className={"check" + (task.completed ? " is-checked" : "")}
                  onClick={() => onToggleTask(task.id)}
                  aria-label={
                    task.completed
                      ? `Mark "${task.title}" incomplete`
                      : `Mark "${task.title}" complete`
                  }
                  aria-pressed={task.completed}
                  style={{
                    width: 26,
                    height: 26,
                    minWidth: 26,
                    minHeight: 26,
                    flexShrink: 0
                  }}
                >
                  <CheckIcon />
                </button>

                <span
                  className={"prio-dot " + prioClass(task.priority)}
                  title={prioLabel(task.priority) + " priority"}
                  style={{ flexShrink: 0 }}
                />

                <span
                  style={{
                    flex: 1,
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    color: task.completed ? "var(--ink-muted)" : "var(--ink)",
                    textDecoration: task.completed ? "line-through" : "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {task.title}
                </span>

                {cat.id ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ink-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flexShrink: 0
                    }}
                  >
                    {cat.emoji}
                  </span>
                ) : null}

                {timeFormatted ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ink-muted)",
                      flexShrink: 0
                    }}
                  >
                    🕒 {timeFormatted}
                  </span>
                ) : null}

                {task.durationTargetMinutes ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color:
                        (task.durationCompletedMinutes || 0) >= task.durationTargetMinutes
                          ? "var(--accent, #10b981)"
                          : "var(--teal, #0d9488)",
                      flexShrink: 0
                    }}
                  >
                    ⏱ {formatDuration(task.durationCompletedMinutes || 0)} / {formatDuration(task.durationTargetMinutes)} ({calculateDurationPct(task.durationCompletedMinutes || 0, task.durationTargetMinutes)}%)
                  </span>
                ) : null}

                {task.quantityTarget ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color:
                        (task.quantityCompleted || 0) >= task.quantityTarget
                          ? "var(--accent, #10b981)"
                          : "var(--teal, #0d9488)",
                      flexShrink: 0
                    }}
                  >
                    📊 {formatQuantity(task.quantityCompleted || 0, task.quantityUnit)} / {formatQuantity(task.quantityTarget, task.quantityUnit)} ({calculateQuantityPct(task.quantityCompleted || 0, task.quantityTarget)}%)
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => onToggleFocus(task.id)}
                  className="icon-btn"
                  title="Remove from Today's Focus"
                  aria-label={`Remove "${task.title}" from Today's Focus`}
                  style={{
                    width: 32,
                    height: 32,
                    minHeight: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--ink-muted)",
                    cursor: "pointer",
                    borderRadius: 6
                  }}
                >
                  <span style={{ fontSize: "1rem" }} aria-hidden="true">✕</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
