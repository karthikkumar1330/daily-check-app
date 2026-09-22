import { useEffect, useRef, useState } from "react";
import type { CategoryId, Priority, RecurrenceType, ReminderMinutes, Task, TaskRecurrence } from "../../types";
import { addDays, formatShort, getWeekStart, parseDateStr, todayStr, weekdayFull } from "../../utils/dateUtils";
import { DAYS_OF_WEEK_OPTIONS, formatRecurrenceLabel, validateRecurrence } from "../../utils/recurrenceUtils";
import { CATEGORIES, categoryMeta, prioClass, prioEmoji, prioLabel } from "../../utils/taskUtils";
import { formatTimeDisplay, getReminderLabel, getTaskScheduleStatus, REMINDER_OPTIONS } from "../../utils/scheduleUtils";
import { CheckIcon, DownIcon, EditIcon, FocusIcon, MoreIcon, RescheduleIcon, TrashIcon, UpIcon } from "../icons";
import RescheduleModal from "../Modals/RescheduleModal";
import LogTimeModal from "../Modals/LogTimeModal";
import EditQuantityModal from "../Modals/EditQuantityModal";
import QuantityGoalDetails from "../QuantityGoal/QuantityGoalDetails";
import { useTasks } from "../../hooks/useTasks";
import { useFocusTimer } from "../../hooks/useFocusTimer";
import { calculateDurationPct, DURATION_PRESETS, formatDuration } from "../../utils/durationUtils";
import { calculateQuantityPct, formatQuantity, getQuickAddOptions } from "../../utils/quantityUtils";

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
  const { rescheduleTask, logTaskDuration, setTaskDurationCompleted, logTaskQuantity, setTaskQuantityCompleted, getDay } = useTasks();
  const { startFocus, session, isRunning } = useFocusTimer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [editQuantityOpen, setEditQuantityOpen] = useState(false);
  const [quantityDetailsOpen, setQuantityDetailsOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [achievementData, setAchievementData] = useState<{
    text: string;
    sub?: string;
    isDayComplete?: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
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

  const isChecked = task.completed || isCompleting;

  return (
    <div
      className={
        "task" +
        (isChecked ? " completed" : "") +
        (isCompleting ? " task-completing task-completing-highlight" : "")
      }
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
        <div className="task-title-row">
          <span className={"prio-dot " + prioClass(task.priority)} title={prioLabel(task.priority) + " priority"} />
          <span className="task-title">{task.title}</span>

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

        {/* Duration Task Progress & Controls */}
        {task.durationTargetMinutes ? (
          <div className="task-duration-container" style={{ marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.8rem",
                color: "var(--ink-muted)",
                marginBottom: 4
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>
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
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--border, rgba(0,0,0,0.08))",
                overflow: "hidden"
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

            {/* Duration Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
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
                    minHeight: 32,
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
                  minHeight: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
                aria-label={`Log time for ${task.title}`}
              >
                <span>+ Log Time</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Quantity Task Progress & Controls */}
        {task.quantityTarget ? (
          <div className="task-quantity-container" style={{ marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.8rem",
                color: "var(--ink-muted)",
                marginBottom: 4
              }}
            >
              <button
                type="button"
                className="btn text-btn"
                onClick={() => setQuantityDetailsOpen(true)}
                style={{
                  fontWeight: 600,
                  color: "var(--ink)",
                  padding: 0,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
                title="View quantity goal details"
              >
                <span>
                  {formatQuantity(task.quantityCompleted ?? 0, task.quantityUnit)} / {formatQuantity(task.quantityTarget, task.quantityUnit)}
                </span>
                <span style={{ fontSize: "0.74rem", opacity: 0.75, color: "var(--teal, #0d9488)" }}>📊 Details ›</span>
              </button>

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

            {/* Quantity Actions */}
            <div
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
                    minHeight: 28,
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
                  minHeight: 28
                }}
                aria-label={`Log custom quantity for ${task.title}`}
              >
                + Log / Set
              </button>

              <button
                type="button"
                className="btn text-btn"
                onClick={() => setQuantityDetailsOpen(true)}
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: "var(--teal, #0d9488)",
                  background: "rgba(13, 148, 136, 0.08)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  minHeight: 28
                }}
                aria-label={`View quantity goal details for ${task.title}`}
              >
                📊 Details
              </button>
            </div>
          </div>
        ) : null}
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
            {task.quantityTarget ? (
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setQuantityDetailsOpen(true);
                }}
              >
                📊 Goal Details
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

      {quantityDetailsOpen ? (
        <QuantityGoalDetails
          task={task}
          initialDate={effectiveDate}
          onClose={() => setQuantityDetailsOpen(false)}
          onToast={onToast}
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
  const initialDuration = task.durationTargetMinutes ? String(task.durationTargetMinutes) : "none";
  const isCustomInitial =
    Boolean(task.durationTargetMinutes && ![15, 30, 45, 60, 120, 180].includes(task.durationTargetMinutes));
  const [durationPreset, setDurationPreset] = useState<string>(
    isCustomInitial ? "custom" : initialDuration
  );
  const [customDurationMinutes, setCustomDurationMinutes] = useState<string>(
    task.durationTargetMinutes ? String(task.durationTargetMinutes) : ""
  );

  const [goalType, setGoalType] = useState<"standard" | "duration" | "quantity">(
    task.quantityTarget ? "quantity" : task.durationTargetMinutes ? "duration" : "standard"
  );
  const [quantityTarget, setQuantityTarget] = useState<string>(
    task.quantityTarget ? String(task.quantityTarget) : "8"
  );
  const [quantityUnit, setQuantityUnit] = useState<string>(task.quantityUnit || "glasses");
  const [quantityStep, setQuantityStep] = useState<string>(
    task.quantityStep ? String(task.quantityStep) : "1"
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

    let cleanDuration: number | null = null;
    let cleanQtyTarget: number | null = null;
    let cleanQtyUnit = "";
    let cleanQtyStep = 1;

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

    onSave({
      title: trimmed || task.title,
      priority,
      category,
      notes: notes.trim(),
      recurrence: rec,
      dueDate: cleanDueDate,
      dueTime: cleanDueTime,
      reminderMinutes: cleanReminder,
      durationTargetMinutes: cleanDuration,
      quantityTarget: cleanQtyTarget,
      quantityUnit: cleanQtyUnit,
      quantityStep: cleanQtyStep
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

        {/* Goal Type / Measurement Section */}
        <div style={{ marginBottom: 12 }}>
          <label className="field-label" id={`edit-goal-type-label-${task.id}`}>
            Task Type
          </label>
          <div
            role="radiogroup"
            aria-labelledby={`edit-goal-type-label-${task.id}`}
            style={{ display: "flex", gap: 6, marginBottom: 8 }}
          >
            <button
              type="button"
              className={"chip-btn" + (goalType === "standard" ? " active" : "")}
              onClick={() => setGoalType("standard")}
              role="radio"
              aria-checked={goalType === "standard"}
            >
              Standard
            </button>
            <button
              type="button"
              className={"chip-btn" + (goalType === "duration" ? " active" : "")}
              onClick={() => setGoalType("duration")}
              role="radio"
              aria-checked={goalType === "duration"}
            >
              ⏱ Duration
            </button>
            <button
              type="button"
              className={"chip-btn" + (goalType === "quantity" ? " active" : "")}
              onClick={() => setGoalType("quantity")}
              role="radio"
              aria-checked={goalType === "quantity"}
            >
              📊 Quantity
            </button>
          </div>

          {goalType === "duration" ? (
            <div className="duration-control-group" style={{ marginTop: 8 }}>
              <label className="field-label" id={`edit-duration-label-${task.id}`}>
                Target Duration
              </label>
              <div
                className="duration-preset-grid"
                role="radiogroup"
                aria-labelledby={`edit-duration-label-${task.id}`}
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
          ) : goalType === "quantity" ? (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label className="field-label" htmlFor={`edit-qty-target-${task.id}`}>
                    Target Amount
                  </label>
                  <input
                    id={`edit-qty-target-${task.id}`}
                    type="number"
                    step="any"
                    min="0.01"
                    className="modal-input"
                    value={quantityTarget}
                    onChange={(e) => setQuantityTarget(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`edit-qty-unit-${task.id}`}>
                    Unit
                  </label>
                  <input
                    id={`edit-qty-unit-${task.id}`}
                    type="text"
                    className="modal-input"
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                    placeholder="e.g. glasses, L, steps"
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor={`edit-qty-step-${task.id}`}>
                  Quick-add Step
                </label>
                <input
                  id={`edit-qty-step-${task.id}`}
                  type="number"
                  step="any"
                  min="0.01"
                  className="modal-input"
                  style={{ width: 120 }}
                  value={quantityStep}
                  onChange={(e) => setQuantityStep(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
            </div>
          ) : null}
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
