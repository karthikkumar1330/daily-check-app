import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryId, Priority, RecurrenceType, ReminderMinutes, Task, TaskRecurrence } from "../../types";
import { addDays, formatShort, getWeekStart, parseDateStr, todayStr, weekdayFull } from "../../utils/dateUtils";
import { DAYS_OF_WEEK_OPTIONS, formatRecurrenceLabel, validateRecurrence } from "../../utils/recurrenceUtils";
import { CATEGORIES, categoryMeta, prioClass, prioEmoji, prioLabel } from "../../utils/taskUtils";
import { formatTimeDisplay, getReminderLabel, getTaskScheduleStatus, REMINDER_OPTIONS } from "../../utils/scheduleUtils";
import { BarChartIcon, CheckIcon, DownIcon, EditIcon, FocusIcon, MoreIcon, RescheduleIcon, StarIcon, TrashIcon, UpIcon } from "../icons";
import RescheduleModal from "../Modals/RescheduleModal";
import LogTimeModal from "../Modals/LogTimeModal";
import EditQuantityModal from "../Modals/EditQuantityModal";
import TaskDetailsModal from "../TaskDetails/TaskDetailsModal";
import QuantityGoalDetails from "../QuantityGoal/QuantityGoalDetails";
import { useTasks } from "../../hooks/useTasks";
import { useFocusTimer } from "../../hooks/useFocusTimer";
import { calculateDurationPct, DURATION_PRESETS, formatDuration } from "../../utils/durationUtils";
import { calculateQuantityPct, formatQuantity, getQuickAddOptions } from "../../utils/quantityUtils";
import TaskFormModal from "../Modals/TaskFormModal";

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
  const { rescheduleTask, logTaskDuration, setTaskDurationCompleted, logTaskQuantity, setTaskQuantityCompleted, getDay, appData, toggleImportant } = useTasks();
  const { startFocus, session, isRunning } = useFocusTimer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [editQuantityOpen, setEditQuantityOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quantityDetailsOpen, setQuantityDetailsOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [achievementData, setAchievementData] = useState<{
    text: string;
    sub?: string;
    isDayComplete?: boolean;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const effectiveDate = dateStr || task.dueDate || todayStr();

  function triggerAchievement(
    text: string,
    sub?: string,
    isDayComplete = false,
    shouldToggle = false
  ) {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (appData.hapticsEnabled !== false && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(isDayComplete ? [25, 35, 25] : 20);
      } catch {}
    }

    if (prefersReduced) {
      if (shouldToggle) onToggle();
      return;
    }

    setIsCompleting(true);
    setAchievementData({ text, sub, isDayComplete });

    if (timerRef.current) clearTimeout(timerRef.current);

    if (shouldToggle) {
      timerRef.current = window.setTimeout(() => {
        onToggle();
        setTimeout(() => {
          setIsCompleting(false);
          setAchievementData(null);
        }, 450);
      }, 420);
    } else {
      timerRef.current = window.setTimeout(() => {
        setIsCompleting(false);
        setAchievementData(null);
      }, 850);
    }
  }

  // Listen for target completion events from Focus timer or external sources
  useEffect(() => {
    function handleCelebrationEvent(e: Event) {
      const custom = e as CustomEvent<{
        taskId: string;
        text: string;
        sub?: string;
        isDayComplete?: boolean;
      }>;
      if (custom.detail && custom.detail.taskId === task.id) {
        triggerAchievement(custom.detail.text, custom.detail.sub, Boolean(custom.detail.isDayComplete), false);
      }
    }
    window.addEventListener("dailyCheck:taskCelebration", handleCelebrationEvent);
    return () => window.removeEventListener("dailyCheck:taskCelebration", handleCelebrationEvent);
  }, [task.id]);

  function handleCheckClick() {
    if (task.completed) {
      // Unchecking: immediate, no achievement
      setIsCompleting(false);
      setAchievementData(null);
      onToggle();
      return;
    }

    // Check if this is the final active task of the day
    const dayData = getDay(effectiveDate);
    const activeTasks = (dayData?.tasks ?? []).filter((t) => !t.completed);
    const isLastActiveTask = activeTasks.length === 1 && activeTasks[0].id === task.id;

    let text = "✓ Completed! 🎯";
    let sub: string | undefined = "Nice work";
    let isDayComplete = false;

    if (isLastActiveTask && dayData && dayData.tasks.length > 0) {
      text = "🎉 Day Complete!";
      sub = `${dayData.tasks.length} / ${dayData.tasks.length} tasks finished`;
      isDayComplete = true;
    } else if (task.durationTargetMinutes) {
      text = "🎯 Target reached!";
      sub = `${formatDuration(task.durationTargetMinutes)} complete`;
    }

    triggerAchievement(text, sub, isDayComplete, true);
  }

  const isTimerActiveOnThis = session?.taskId === task.id;
  const target = task.durationTargetMinutes;
  const completedMins = task.durationCompletedMinutes || 0;
  const pct = target ? calculateDurationPct(completedMins, target) : 0;
  const isTargetReached = Boolean(target && completedMins >= target);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      const targetNode = e.target as Node;
      if (
        (menuRef.current && menuRef.current.contains(targetNode)) ||
        (moreBtnRef.current && moreBtnRef.current.contains(targetNode))
      ) {
        return;
      }
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onScrollOrResize() {
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [menuOpen]);

  if (isEditing) {
    return (
      <TaskFormModal
        mode="edit"
        initialTask={task}
        initialDate={effectiveDate}
        onCancel={onCancelEdit}
        onSubmit={(data) => {
          onSave({
            title: data.title,
            priority: data.priority,
            important: data.important,
            category: data.category,
            notes: data.notes,
            recurrence: data.recurrence,
            dueTime: data.dueTime,
            reminderMinutes: data.reminderMinutes,
            dueDate: data.dueDate,
            durationTargetMinutes: data.durationTargetMinutes,
            quantityTarget: data.quantityTarget,
            quantityUnit: data.quantityUnit,
            quantityStep: data.quantityStep
          });
        }}
      />
    );
  }

  const isFocused = Boolean(dateStr && task.focusDate === dateStr);
  const cat = categoryMeta(task.category);
  const recurrenceLabel = formatRecurrenceLabel(task.recurrence);
  const timeFormatted = formatTimeDisplay(task.dueTime);
  const scheduleStatus = getTaskScheduleStatus(task, dateStr || todayStr());

  const isChecked = task.completed || isCompleting;

  return (
    <div
      id={`task-${task.id}`}
      className={
        "task" +
        (isChecked ? " completed" : "") +
        (isCompleting ? " task-completing task-completing-highlight" : "")
      }
      style={menuOpen ? { zIndex: 60, position: "relative" } : undefined}
    >
      <button
        className={"check" + (isChecked ? " is-checked" : "") + (isCompleting ? " check-pop" : "")}
        onClick={handleCheckClick}
        aria-label={isChecked ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
        aria-pressed={isChecked}
      >
        <CheckIcon />
        {isCompleting ? (
          <span className="check-particles" aria-hidden="true">
            <span className="p1" />
            <span className="p2" />
            <span className="p3" />
            <span className="p4" />
          </span>
        ) : null}
      </button>
      <div className="task-main">
        {/* TITLE ROW */}
        <div className="task-title-row">
          <span className={"prio-dot " + prioClass(task.priority)} title={prioLabel(task.priority) + " priority"} />
          <span className="task-title">{task.title}</span>

          {task.important ? (
            <span className="task-title-star" title="Marked Important" aria-label="Marked Important">
              ⭐
            </span>
          ) : null}

          {achievementData ? (
            <span
              className={
                "completion-achievement-pill" +
                (achievementData.isDayComplete ? " day-complete" : "")
              }
              role="status"
              aria-live="polite"
            >
              <span className="pill-main">{achievementData.text}</span>
              {achievementData.sub ? <span className="pill-sub">{achievementData.sub}</span> : null}
            </span>
          ) : null}
        </div>

        {/* COMPACT EXECUTION-FOCUSED META ROW */}
        {(() => {
          const metaPieces: React.ReactNode[] = [];

          if (dateLabel) {
            metaPieces.push(
              <span key="date" className="task-meta-piece task-meta-date">
                {dateLabel}
              </span>
            );
          }

          if (task.priority === 1) {
            metaPieces.push(
              <span key="prio" className="task-meta-piece task-meta-high">
                High
              </span>
            );
          }

          if (timeFormatted) {
            metaPieces.push(
              <span
                key="time"
                className={`task-meta-piece task-meta-time${scheduleStatus === "overdue" && !task.completed ? " task-meta-overdue" : ""}`}
              >
                {scheduleStatus === "overdue" && !task.completed ? `⚠️ Overdue · ${timeFormatted}` : `🕒 ${timeFormatted}`}
              </span>
            );
          }

          if (isFocused) {
            metaPieces.push(
              <span key="focus" className="task-meta-piece task-meta-focus">
                🎯 Focus
              </span>
            );
          }

          if (cat.id) {
            metaPieces.push(
              <span key="cat" className="task-meta-piece task-meta-category">
                {cat.emoji ? `${cat.emoji} ` : ""}{cat.label}
              </span>
            );
          }

          if (recurrenceLabel) {
            metaPieces.push(
              <span key="rec" className="task-meta-piece task-meta-repeat" title={`Repeats: ${recurrenceLabel}`}>
                🔄 {recurrenceLabel}
              </span>
            );
          }

          if (metaPieces.length === 0) return null;

          return (
            <div className="task-meta-row">
              {metaPieces.map((piece, i) => (
                <span key={i} className="task-meta-item">
                  {i > 0 ? <span className="task-meta-sep" aria-hidden="true"> · </span> : null}
                  {piece}
                </span>
              ))}
            </div>
          );
        })()}

        {task.notes ? <div className="task-notes">{task.notes}</div> : null}

        {/* Duration Task Progress & Controls */}
        {task.durationTargetMinutes ? (
          <div className="task-duration-container" style={{ marginTop: 8 }}>
            {/* PROGRESS ROW */}
            <div
              className="task-progress-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.8rem",
                color: "var(--ink-muted)",
                marginBottom: 4
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--ink)",
                  fontSize: "0.82rem"
                }}
              >
                {formatDuration(completedMins)} / {formatDuration(task.durationTargetMinutes)}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: isTargetReached ? "var(--accent, #10b981)" : "var(--ink-muted)"
                }}
              >
                {pct}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={task.durationTargetMinutes}
              aria-valuenow={completedMins}
              aria-label={`Progress: ${pct}%`}
              onClick={() => setDetailsOpen(true)}
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--border, rgba(0,0,0,0.08))",
                overflow: "hidden",
                cursor: "pointer"
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: isTargetReached ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
                  borderRadius: 3,
                  transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>

            {/* ACTION ROW */}
            <div
              className="task-action-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                flexWrap: "wrap"
              }}
            >
              {isTargetReached ? (
                <span
                  className="completion-achievement-pill"
                  style={{
                    fontSize: "0.78rem",
                    padding: "3px 8px"
                  }}
                >
                  ✓ Target Reached
                </span>
              ) : (
                <button
                  type="button"
                  className="btn text-btn duration-focus-btn"
                  onClick={() => startFocus(task, effectiveDate)}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: isTimerActiveOnThis ? "var(--accent, #10b981)" : "var(--ink)",
                    background: isTimerActiveOnThis
                      ? "var(--accent-soft, rgba(16,185,129,0.12))"
                      : "var(--surface-subtle, rgba(0,0,0,0.04))",
                    border: isTimerActiveOnThis
                      ? "1px solid var(--accent, #10b981)"
                      : "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    minHeight: 30,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5
                  }}
                  aria-label={isTimerActiveOnThis ? "Focus timer active" : `Start Focus for ${task.title}`}
                >
                  <span>{isTimerActiveOnThis ? (isRunning ? "⏸ Focus Running" : "▶ Resume Focus") : "▶ Start Focus"}</span>
                </button>
              )}

              <button
                type="button"
                className="btn text-btn duration-log-btn"
                onClick={() => setLogTimeOpen(true)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  background: "var(--surface-subtle, rgba(0,0,0,0.04))",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  minHeight: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
                aria-label={`Log time for ${task.title}`}
              >
                <span>+ Log Time</span>
              </button>

              <button
                type="button"
                className="btn text-btn duration-details-btn"
                onClick={() => setDetailsOpen(true)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--teal, #0d9488)",
                  background: "rgba(13, 148, 136, 0.08)",
                  border: "1px solid rgba(13, 148, 136, 0.2)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  minHeight: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
                aria-label={`View details for ${task.title}`}
              >
                <span>📊 Details</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Quantity Task Progress & Controls */}
        {task.quantityTarget ? (
          <div className="task-quantity-container" style={{ marginTop: 8 }}>
            {/* PROGRESS ROW */}
            <div
              className="task-progress-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.8rem",
                color: "var(--ink-muted)",
                marginBottom: 4
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--ink)",
                  fontSize: "0.82rem"
                }}
              >
                {formatQuantity(task.quantityCompleted ?? 0, task.quantityUnit)} / {formatQuantity(task.quantityTarget, task.quantityUnit)}
              </span>

              <span
                style={{
                  fontWeight: 700,
                  color: (task.quantityCompleted ?? 0) >= task.quantityTarget ? "var(--accent, #10b981)" : "var(--ink-muted)"
                }}
              >
                {calculateQuantityPct(task.quantityCompleted ?? 0, task.quantityTarget)}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={task.quantityTarget}
              aria-valuenow={task.quantityCompleted ?? 0}
              aria-label={`Progress: ${calculateQuantityPct(task.quantityCompleted ?? 0, task.quantityTarget)}%`}
              onClick={() => setQuantityDetailsOpen(true)}
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--border, rgba(0,0,0,0.08))",
                overflow: "hidden",
                cursor: "pointer"
              }}
            >
              <div
                style={{
                  width: `${calculateQuantityPct(task.quantityCompleted ?? 0, task.quantityTarget)}%`,
                  height: "100%",
                  background:
                    (task.quantityCompleted ?? 0) >= task.quantityTarget
                      ? "var(--accent, #10b981)"
                      : "var(--teal, #0d9488)",
                  borderRadius: 3,
                  transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>

            {/* ACTION ROW */}
            <div
              className="task-action-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                flexWrap: "wrap"
              }}
            >
              {(task.quantityCompleted ?? 0) >= task.quantityTarget ? (
                <span
                  className="completion-achievement-pill"
                  style={{
                    fontSize: "0.78rem",
                    padding: "3px 8px"
                  }}
                >
                  ✓ Target Reached
                </span>
              ) : null}

              {/* Quick Add Buttons */}
              {getQuickAddOptions(task.quantityStep || 1, task.quantityUnit || "").map((opt) => (
                <button
                  key={opt.delta}
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => {
                    const res = logTaskQuantity(effectiveDate, task.id, opt.delta);
                    if (res.ok) {
                      if (res.completed && (task.quantityCompleted ?? 0) < (task.quantityTarget ?? 0)) {
                        triggerAchievement("🎯 Target reached!", `${formatQuantity(task.quantityTarget, task.quantityUnit)} completed!`);
                        onToast?.(`🎯 Target reached! ${task.title}`);
                      } else {
                        onToast?.(`+${formatQuantity(opt.delta, task.quantityUnit)} logged`);
                      }
                    }
                  }}
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    padding: "3px 8px",
                    minHeight: 30,
                    borderRadius: 6
                  }}
                >
                  {opt.label}
                </button>
              ))}

              <button
                type="button"
                className="btn text-btn"
                onClick={() => setEditQuantityOpen(true)}
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  background: "var(--surface-subtle, rgba(0,0,0,0.04))",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  minHeight: 30
                }}
                aria-label={`Log custom quantity for ${task.title}`}
              >
                + Log / Set
              </button>

              <button
                type="button"
                className="btn text-btn quantity-details-btn"
                onClick={() => setQuantityDetailsOpen(true)}
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: "var(--teal, #0d9488)",
                  background: "rgba(13, 148, 136, 0.08)",
                  border: "1px solid rgba(13, 148, 136, 0.2)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  minHeight: 30
                }}
                aria-label={`View quantity goal details for ${task.title}`}
              >
                📊 Details
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="task-actions" style={{ position: "relative", display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          className={`icon-btn task-star-btn ${task.important ? "is-important" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleImportant(effectiveDate, task.id);
            if (onToast) {
              onToast(task.important ? "Removed from Important" : "Marked as Important ⭐");
            }
          }}
          aria-label={task.important ? `Remove importance from ${task.title}` : `Mark ${task.title} as important`}
          title={task.important ? "Important (click to remove)" : "Mark as important"}
          style={{
            color: task.important ? "#f59e0b" : "var(--ink-muted)",
            opacity: task.important ? 1 : 0.45,
            transition: "all 0.15s ease",
            padding: 4,
            minWidth: 32,
            minHeight: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <StarIcon filled={Boolean(task.important)} />
        </button>

        <button
          ref={moreBtnRef}
          type="button"
          className="icon-btn task-more-btn"
          onClick={() => {
            if (!menuOpen && moreBtnRef.current) {
              const rect = moreBtnRef.current.getBoundingClientRect();
              const menuWidth = Math.min(250, window.innerWidth - 24);
              const estimatedMenuHeight = 340;

              // Calculate top
              const spaceBelow = window.innerHeight - rect.bottom;
              let top = rect.bottom + 4;
              if (spaceBelow < estimatedMenuHeight && rect.top > spaceBelow) {
                // Place above
                top = Math.max(8, rect.top - estimatedMenuHeight - 4);
              }

              // Calculate left
              let left = rect.right - menuWidth;
              if (left < 12) left = 12;
              if (left + menuWidth > window.innerWidth - 12) {
                left = window.innerWidth - 12 - menuWidth;
              }

              setMenuPosition({ top, left });
              setMenuOpen(true);
            } else {
              setMenuOpen(false);
            }
          }}
          aria-label={`Task actions for ${task.title}`}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <MoreIcon />
        </button>
        {menuOpen && menuPosition
          ? createPortal(
              <div
                ref={menuRef}
                className="task-menu task-menu-portal"
                role="menu"
                aria-label="Task options"
                style={{
                  position: "fixed",
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: Math.min(250, window.innerWidth - 24),
                  maxHeight: Math.min(360, window.innerHeight - 32),
                  zIndex: 9999
                }}
              >
                {onToggleFocus ? (
                  <button
                    type="button"
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
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    toggleImportant(effectiveDate, task.id);
                    if (onToast) {
                      onToast(task.important ? "Removed from Important" : "Marked as Important ⭐");
                    }
                  }}
                >
                  <StarIcon filled={Boolean(task.important)} /> {task.important ? "Remove Important" : "Mark Important"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setDetailsOpen(true);
                  }}
                >
                  <BarChartIcon /> Details
                </button>
                {task.durationTargetMinutes ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setLogTimeOpen(true);
                    }}
                  >
                    ⏱ Log Time
                  </button>
                ) : null}
                {task.quantityTarget ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditQuantityOpen(true);
                    }}
                  >
                    + Log / Set
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setRescheduleOpen(true);
                  }}
                >
                  <RescheduleIcon /> Reschedule
                </button>
                <button
                  type="button"
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
                    type="button"
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
                    type="button"
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
                  type="button"
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  <TrashIcon /> Delete
                </button>
              </div>,
              document.body
            )
          : null}
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

      {logTimeOpen ? (
        <LogTimeModal
          task={task}
          dateStr={effectiveDate}
          onLogDelta={(delta) => {
            const res = logTaskDuration(effectiveDate, task.id, delta);
            if (res.ok) {
              if (res.completed) {
                triggerAchievement("🎯 Target reached!", `${formatDuration(task.durationTargetMinutes || 0)} complete`, false, false);
                onToast?.(`🎯 Target reached! ${task.title} — ${formatDuration(task.durationTargetMinutes)} complete`);
              } else {
                onToast?.(`Logged ${delta}m · ${formatDuration(res.newTotal)} / ${formatDuration(task.durationTargetMinutes)}`);
              }
            }
          }}
          onSetTotal={(total) => {
            const res = setTaskDurationCompleted(effectiveDate, task.id, total);
            if (res.ok) {
              if (res.completed) {
                triggerAchievement("🎯 Target reached!", `${formatDuration(task.durationTargetMinutes || 0)} complete`, false, false);
                onToast?.(`🎯 Target reached! ${task.title} — ${formatDuration(task.durationTargetMinutes)} complete`);
              } else {
                onToast?.(`Updated · ${formatDuration(res.newTotal)} / ${formatDuration(task.durationTargetMinutes)}`);
              }
            }
          }}
          onClose={() => setLogTimeOpen(false)}
        />
      ) : null}

      {editQuantityOpen ? (
        <EditQuantityModal
          task={task}
          dateStr={effectiveDate}
          onLogDelta={(delta) => {
            const res = logTaskQuantity(effectiveDate, task.id, delta);
            if (res.ok) {
              if (res.completed && (task.quantityCompleted ?? 0) < (task.quantityTarget ?? 0)) {
                triggerAchievement("🎯 Target reached!", `${formatQuantity(task.quantityTarget, task.quantityUnit)} completed!`, false, false);
                onToast?.(`🎯 Target reached! ${task.title}`);
              } else {
                onToast?.(`Logged +${formatQuantity(delta, task.quantityUnit)}`);
              }
            }
          }}
          onSetTotal={(total) => {
            const res = setTaskQuantityCompleted(effectiveDate, task.id, total);
            if (res.ok) {
              if (res.completed && (task.quantityCompleted ?? 0) < (task.quantityTarget ?? 0)) {
                triggerAchievement("🎯 Target reached!", `${formatQuantity(task.quantityTarget, task.quantityUnit)} completed!`, false, false);
                onToast?.(`🎯 Target reached! ${task.title}`);
              } else {
                onToast?.(`Updated: ${formatQuantity(res.newTotal, task.quantityUnit)}`);
              }
            }
          }}
          onClose={() => setEditQuantityOpen(false)}
        />
      ) : null}

      {detailsOpen || quantityDetailsOpen ? (
        <TaskDetailsModal
          task={task}
          initialDate={effectiveDate}
          onClose={() => {
            setDetailsOpen(false);
            setQuantityDetailsOpen(false);
          }}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}
