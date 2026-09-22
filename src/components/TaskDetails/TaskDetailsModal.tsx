import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Task } from "../../types";
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatLong,
  formatShort,
  getMonthGrid,
  getWeekDates,
  getWeekStart,
  monthAnchor,
  monthLabel,
  parseDateStr,
  todayStr,
  weekdayLetter
} from "../../utils/dateUtils";
import {
  calculateUniversalOverviewStats,
  calculateUniversalTaskStreak,
  calculateWeekdayFrequency,
  getTaskStatusOnDate,
  getTaskType,
  getUniversalPeriodSummary,
  type UniversalTaskType
} from "../../utils/taskHistoryUtils";
import { formatDuration, calculateDurationPct } from "../../utils/durationUtils";
import {
  calculateQuantityPct,
  formatQuantity,
  formatQuantityNumber,
  getQuickAddOptions,
  getTaskQuantityOnDate
} from "../../utils/quantityUtils";
import { categoryMeta, prioEmoji, prioLabel } from "../../utils/taskUtils";
import { formatRecurrenceLabel } from "../../utils/recurrenceUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useTasks } from "../../hooks/useTasks";
import { useFocusTimer } from "../../hooks/useFocusTimer";
import LogTimeModal from "../Modals/LogTimeModal";
import EditQuantityModal from "../Modals/EditQuantityModal";

interface TaskDetailsModalProps {
  task: Task;
  initialDate?: string;
  onClose: () => void;
  onToast?: (message: string) => void;
}

export default function TaskDetailsModal({
  task,
  initialDate,
  onClose,
  onToast
}: TaskDetailsModalProps) {
  const {
    appData,
    toggleTask,
    logTaskDuration,
    setTaskDurationCompleted,
    logTaskQuantity,
    setTaskQuantityCompleted
  } = useTasks();

  const focusTimer = useFocusTimer();

  const taskType: UniversalTaskType = useMemo(() => getTaskType(task), [task]);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr());
  const [calendarMonth, setCalendarMonth] = useState<string>(monthAnchor(initialDate || todayStr()));

  // Sub-modal states
  const [logTimeModalOpen, setLogTimeModalOpen] = useState(false);
  const [editQuantityModalOpen, setEditQuantityModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);

  // Close on Escape key if no sub-modal is open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !logTimeModalOpen && !editQuantityModalOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, logTimeModalOpen, editQuantityModalOpen]);

  const cat = categoryMeta(task.category);
  const recurrenceLabel = task.recurrence
    ? formatRecurrenceLabel(task.recurrence)
    : task.dueDate
    ? `Due ${formatShort(task.dueDate)}`
    : "One-time task";

  const isToday = (d: string) => d === todayStr();
  const isSelectedDateToday = isToday(selectedDate);

  // Real-time status for Today
  const todayStatus = useMemo(() => {
    return getTaskStatusOnDate(task, todayStr(), appData.days);
  }, [task, appData.days]);

  // Real-time status for Selected Date (Date Inspection)
  const selectedDateStatus = useMemo(() => {
    return getTaskStatusOnDate(task, selectedDate, appData.days);
  }, [task, selectedDate, appData.days]);

  // Overview statistics
  const overviewStats = useMemo(() => {
    return calculateUniversalOverviewStats(task, todayStr(), appData.days);
  }, [task, appData.days]);

  // 7-day week breakdown around selectedDate
  const currentWeekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  const weekSummary = useMemo(() => {
    return getUniversalPeriodSummary(task, weekDates, appData.days);
  }, [task, weekDates, appData.days]);

  // 30-day heatmap dates (ending on today or selectedDate if in future)
  const heatmapDates = useMemo(() => {
    const end = selectedDate > todayStr() ? selectedDate : todayStr();
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      dates.push(addDays(end, -i));
    }
    return dates;
  }, [selectedDate]);

  // Month grid for calendar
  const monthCells = useMemo(() => {
    return getMonthGrid(calendarMonth);
  }, [calendarMonth]);

  const monthSummary = useMemo(() => {
    const datesInMonth = monthCells.filter((c) => c.inMonth).map((c) => c.date);
    return getUniversalPeriodSummary(task, datesInMonth, appData.days);
  }, [task, monthCells, appData.days]);

  // Frequency by weekday
  const weekdayFrequency = useMemo(() => {
    return calculateWeekdayFrequency(task, todayStr(), appData.days);
  }, [task, appData.days]);

  // Duration Quick-add helper
  function handleLogDurationDelta(targetDate: string, deltaMinutes: number) {
    const res = logTaskDuration(targetDate, task.id, deltaMinutes);
    if (res.ok) {
      if (res.completed && !selectedDateStatus.completed) {
        onToast?.(`🎯 Target reached! ${formatDuration(task.durationTargetMinutes || 0)} completed for ${formatShort(targetDate)}`);
      } else {
        onToast?.(`Logged +${formatDuration(deltaMinutes)} · ${formatDuration(res.newTotal || 0)} / ${formatDuration(task.durationTargetMinutes || 0)}`);
      }
    }
  }

  function handleSetDurationTotal(targetDate: string, totalMinutes: number) {
    const res = setTaskDurationCompleted(targetDate, task.id, totalMinutes);
    if (res.ok) {
      if (res.completed && !selectedDateStatus.completed) {
        onToast?.(`🎯 Target reached! ${formatDuration(task.durationTargetMinutes || 0)} completed for ${formatShort(targetDate)}`);
      } else {
        onToast?.(`Updated: ${formatDuration(res.newTotal || 0)} / ${formatDuration(task.durationTargetMinutes || 0)}`);
      }
    }
  }

  // Quantity Quick-add helper
  const quantityStep = task.quantityStep && task.quantityStep > 0 ? task.quantityStep : 1;
  const quantityUnit = (task.quantityUnit || "").trim();
  const quantityQuickAddOptions = useMemo(() => {
    return getQuickAddOptions(quantityStep, quantityUnit);
  }, [quantityStep, quantityUnit]);

  function handleLogQuantityDelta(targetDate: string, delta: number) {
    const res = logTaskQuantity(targetDate, task.id, delta);
    if (res.ok) {
      if (res.completed && !selectedDateStatus.completed) {
        onToast?.(`🎯 Target reached! ${formatQuantity(task.quantityTarget || 0, quantityUnit)} completed for ${formatShort(targetDate)}`);
      } else {
        onToast?.(`Logged +${formatQuantity(delta, quantityUnit)} · ${formatQuantity(res.newTotal || 0, quantityUnit)} / ${formatQuantity(task.quantityTarget || 0, quantityUnit)}`);
      }
    }
  }

  function handleSetQuantityTotal(targetDate: string, total: number) {
    const res = setTaskQuantityCompleted(targetDate, task.id, total);
    if (res.ok) {
      if (res.completed && !selectedDateStatus.completed) {
        onToast?.(`🎯 Target reached! ${formatQuantity(task.quantityTarget || 0, quantityUnit)} completed for ${formatShort(targetDate)}`);
      } else {
        onToast?.(`Updated: ${formatQuantity(res.newTotal || 0, quantityUnit)} / ${formatQuantity(task.quantityTarget || 0, quantityUnit)}`);
      }
    }
  }

  // Checklist Toggle helper
  function handleToggleChecklist(targetDate: string) {
    toggleTask(targetDate, task.id);
    const currentlyDone = getTaskStatusOnDate(task, targetDate, appData.days).completed;
    if (!currentlyDone) {
      onToast?.(`✓ Completed: ${task.title} for ${formatShort(targetDate)}`);
    } else {
      onToast?.(`Marked incomplete for ${formatShort(targetDate)}`);
    }
  }

  // Heatmap Color scale generator
  function getHeatmapColor(pct: number, isScheduled: boolean): string {
    if (!isScheduled) return "var(--surface-subtle, rgba(0,0,0,0.03))";
    if (pct <= 0) return "var(--surface-subtle, rgba(0,0,0,0.06))";
    if (pct < 25) return "rgba(16, 185, 129, 0.22)";
    if (pct < 50) return "rgba(16, 185, 129, 0.45)";
    if (pct < 75) return "rgba(16, 185, 129, 0.68)";
    if (pct < 100) return "rgba(16, 185, 129, 0.85)";
    return "var(--accent, #10b981)";
  }

  const content = (
    <div
      className="overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="universal-task-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 8px"
      }}
    >
      <div
        className="modal modal-card task-details-dialog"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 640,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "20px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          borderRadius: 14
        }}
      >
        {/* TOP BAR / NAVIGATION */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 12
          }}
        >
          <button
            type="button"
            className="btn text-btn"
            onClick={onClose}
            style={{
              fontSize: "0.88rem",
              fontWeight: 600,
              color: "var(--ink-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px"
            }}
          >
            ← Back
          </button>
          <span
            id="universal-task-details-title"
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "0.02em"
            }}
          >
            {taskType === "duration"
              ? "⏱ TASK DETAILS"
              : taskType === "quantity"
              ? "📊 TASK DETAILS"
              : "☑ TASK DETAILS"}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close task details"
            style={{ minHeight: 34, minWidth: 34 }}
          >
            ✕
          </button>
        </div>

        {/* HERO CARD */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-subtle, rgba(0,0,0,0.02)) 100%)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px 18px"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--teal, #0d9488)",
                    background: "rgba(13, 148, 136, 0.1)",
                    padding: "2px 8px",
                    borderRadius: 4
                  }}
                >
                  {taskType === "duration"
                    ? "⏱ Duration Goal"
                    : taskType === "quantity"
                    ? "📊 Quantity Goal"
                    : "☑ Checklist Task"}
                </span>
                {cat.id ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                    {cat.emoji} {cat.label}
                  </span>
                ) : null}
                <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                  • {recurrenceLabel}
                </span>
                {task.dueTime ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                    • {task.dueTime}
                  </span>
                ) : null}
                {task.priority !== 2 ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                    {prioEmoji(task.priority)} {prioLabel(task.priority)}
                  </span>
                ) : null}
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "var(--ink)",
                  lineHeight: 1.3
                }}
              >
                {task.title}
              </h1>
              {task.notes ? (
                <div style={{ fontSize: "0.84rem", color: "var(--ink-muted)", marginTop: 4 }}>
                  {task.notes}
                </div>
              ) : null}
            </div>

            {/* Target Badge for Goals */}
            {taskType === "duration" && task.durationTargetMinutes ? (
              <div
                style={{
                  textAlign: "right",
                  background: "var(--surface)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  flexShrink: 0
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600 }}>TARGET</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink)" }}>
                  {formatDuration(task.durationTargetMinutes)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>per day</div>
              </div>
            ) : null}

            {taskType === "quantity" && task.quantityTarget ? (
              <div
                style={{
                  textAlign: "right",
                  background: "var(--surface)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  flexShrink: 0
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600 }}>TARGET</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink)" }}>
                  {formatQuantity(task.quantityTarget, quantityUnit)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>per day</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 1. TODAY PROMINENT CARD */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px 18px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--ink-muted)"
                }}
              >
                TODAY
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                • {formatShort(todayStr())}
              </span>
            </div>

            {todayStatus.completed ? (
              <span
                className="completion-achievement-pill"
                style={{
                  fontSize: "0.78rem",
                  padding: "3px 8px"
                }}
              >
                ✓ Completed
              </span>
            ) : (
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--ink-muted)",
                  background: "var(--surface-subtle, rgba(0,0,0,0.05))",
                  padding: "3px 8px",
                  borderRadius: 6
                }}
              >
                In progress
              </span>
            )}
          </div>

          {/* Type-specific Today display */}
          {taskType === "checklist" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 8,
                background: todayStatus.completed
                  ? "var(--accent-soft, rgba(16, 185, 129, 0.1))"
                  : "var(--surface-subtle, rgba(0,0,0,0.03))",
                border: "1px solid " + (todayStatus.completed ? "rgba(16, 185, 129, 0.3)" : "var(--border)")
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: "1.4rem",
                    color: todayStatus.completed ? "var(--accent, #10b981)" : "var(--ink-muted)"
                  }}
                >
                  {todayStatus.completed ? "✓" : "○"}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>
                    {todayStatus.completed ? "Completed for Today" : "Not yet completed"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
                    {todayStatus.completedAt
                      ? `Completed at ${new Date(todayStatus.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Tap to mark as finished"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={todayStatus.completed ? "btn btn-ghost" : "btn btn-primary"}
                onClick={() => handleToggleChecklist(todayStr())}
                style={{ fontSize: "0.85rem", padding: "6px 14px" }}
              >
                {todayStatus.completed ? "Mark Incomplete" : "✓ Mark as Completed"}
              </button>
            </div>
          ) : taskType === "duration" ? (
            <div>
              {/* Progress text & remaining */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 6
                }}
              >
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>
                  {formatDuration(todayStatus.durationCompleted || 0)} / {formatDuration(task.durationTargetMinutes || 0)}
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: todayStatus.completed ? "var(--accent, #10b981)" : "var(--teal, #0d9488)" }}>
                  {todayStatus.pct}% {todayStatus.completed ? "• Target reached" : `(${formatDuration(Math.max(0, (task.durationTargetMinutes || 0) - (todayStatus.durationCompleted || 0)))} remaining)`}
                </div>
              </div>

              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={task.durationTargetMinutes || 0}
                aria-valuenow={todayStatus.durationCompleted || 0}
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: "var(--border, rgba(0,0,0,0.08))",
                  overflow: "hidden",
                  marginBottom: 12
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, todayStatus.pct)}%`,
                    height: "100%",
                    background: todayStatus.completed ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
                    borderRadius: 5,
                    transition: "width 0.35s ease"
                  }}
                />
              </div>

              {/* Quick Actions */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className="chip-btn"
                    onClick={() => handleLogDurationDelta(todayStr(), mins)}
                  >
                    +{mins}m
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary-btn"
                  style={{ fontSize: "0.82rem", padding: "4px 10px" }}
                  onClick={() => {
                    setSelectedDate(todayStr());
                    setLogTimeModalOpen(true);
                  }}
                >
                  ⏱ Log Time
                </button>
                <button
                  type="button"
                  className="btn secondary-btn"
                  style={{
                    fontSize: "0.82rem",
                    padding: "4px 10px",
                    color: "var(--accent, #10b981)",
                    borderColor: "var(--accent, #10b981)"
                  }}
                  onClick={() => {
                    focusTimer.startFocus(task, todayStr());
                    onToast?.(`🎯 Focus started for "${task.title}"`);
                    onClose();
                  }}
                >
                  🎯 Start Focus
                </button>
              </div>
            </div>
          ) : (
            // Quantity Today card (V12.4.1 verified implementation)
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 6
                }}
              >
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>
                  {formatQuantity(todayStatus.quantityCompleted || 0, quantityUnit)} / {formatQuantity(task.quantityTarget || 0, quantityUnit)}
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: todayStatus.completed ? "var(--accent, #10b981)" : "var(--teal, #0d9488)" }}>
                  {todayStatus.pct}% {todayStatus.completed ? "• Target reached" : `(${formatQuantity(Math.max(0, (task.quantityTarget || 0) - (todayStatus.quantityCompleted || 0)), quantityUnit)} remaining)`}
                </div>
              </div>

              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={task.quantityTarget || 0}
                aria-valuenow={todayStatus.quantityCompleted || 0}
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: "var(--border, rgba(0,0,0,0.08))",
                  overflow: "hidden",
                  marginBottom: 12
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, todayStatus.pct)}%`,
                    height: "100%",
                    background: todayStatus.completed ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
                    borderRadius: 5,
                    transition: "width 0.35s ease"
                  }}
                />
              </div>

              {/* Quick Adds */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {quantityQuickAddOptions.map((opt) => (
                  <button
                    key={opt.delta}
                    type="button"
                    className="chip-btn"
                    onClick={() => handleLogQuantityDelta(todayStr(), opt.delta)}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary-btn"
                  style={{ fontSize: "0.82rem", padding: "4px 10px" }}
                  onClick={() => {
                    setSelectedDate(todayStr());
                    setEditQuantityModalOpen(true);
                  }}
                >
                  + Log / Set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. OVERVIEW STATISTICS CARD */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ink-muted)",
              marginBottom: 12
            }}
          >
            OVERVIEW STATISTICS
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10
            }}
          >
            {/* Streak metrics */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>🔥 CURRENT STREAK</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                {overviewStats.currentStreak} {overviewStats.currentStreak === 1 ? "day" : "days"}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>🏆 BEST STREAK</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                {overviewStats.bestStreak} {overviewStats.bestStreak === 1 ? "day" : "days"}
              </div>
              {overviewStats.bestStreakRange ? (
                <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
                  {formatShort(overviewStats.bestStreakRange.startDate)} → {formatShort(overviewStats.bestStreakRange.endDate)}
                </div>
              ) : null}
            </div>

            {/* Type-specific overview metrics */}
            {taskType === "checklist" ? (
              <>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>COMPLETION RATE</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent, #10b981)", marginTop: 2 }}>
                    {overviewStats.completionRate}%
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
                    {overviewStats.totalCompletedDays} / {overviewStats.totalScheduledDays} scheduled
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>TOTAL COMPLETED</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                    {overviewStats.totalCompletedDays}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
                    occurrences
                  </div>
                </div>
              </>
            ) : taskType === "duration" ? (
              <>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>AVERAGE DAILY</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                    {formatDuration(overviewStats.avgDailyDurationMinutes)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
                    on scheduled days
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>TARGET REACHED</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent, #10b981)", marginTop: 2 }}>
                    {overviewStats.totalCompletedDays} {overviewStats.totalCompletedDays === 1 ? "day" : "days"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
                    Total: {formatDuration(overviewStats.totalDurationMinutes)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>AVERAGE DAILY</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                    {formatQuantity(overviewStats.avgDailyQuantity, quantityUnit)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
                    on scheduled days
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontWeight: 600 }}>TARGET REACHED</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent, #10b981)", marginTop: 2 }}>
                    {overviewStats.totalCompletedDays} {overviewStats.totalCompletedDays === 1 ? "day" : "days"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
                    Total: {formatQuantity(overviewStats.totalQuantity, quantityUnit)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Optional Focus session row for duration */}
          {taskType === "duration" && overviewStats.focusDaysCount > 0 ? (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(13, 148, 136, 0.08)",
                border: "1px solid rgba(13, 148, 136, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.82rem"
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--teal, #0d9488)" }}>
                🎯 Focus Sessions Logged
              </span>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                {overviewStats.focusDaysCount} {overviewStats.focusDaysCount === 1 ? "session" : "sessions"}
              </span>
            </div>
          ) : null}
        </div>

        {/* 3. THIS WEEK (Weekly Summary) */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)" }}>
              THIS WEEK
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
              {formatShort(weekDates[0])} – {formatShort(weekDates[6])}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              textAlign: "center"
            }}
          >
            <div style={{ padding: "8px", background: "var(--surface-subtle, rgba(0,0,0,0.02))", borderRadius: 8 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600 }}>COMPLETED</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                {weekSummary.completedDays} / {weekSummary.scheduledDays}
              </div>
            </div>
            <div style={{ padding: "8px", background: "var(--surface-subtle, rgba(0,0,0,0.02))", borderRadius: 8 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600 }}>AVERAGE</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                {taskType === "duration"
                  ? formatDuration(weekSummary.avgDurationMinutes)
                  : taskType === "quantity"
                  ? formatQuantity(weekSummary.avgQuantity, quantityUnit)
                  : `${weekSummary.completionRate}%`}
              </div>
            </div>
            <div style={{ padding: "8px", background: "var(--surface-subtle, rgba(0,0,0,0.02))", borderRadius: 8 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600 }}>RATE</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent, #10b981)", marginTop: 2 }}>
                {weekSummary.completionRate}%
              </div>
            </div>
          </div>
        </div>

        {/* 4. 7-DAY HISTORY BAR / COMPARISON */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ink-muted)",
              marginBottom: 12
            }}
          >
            7-DAY HISTORY
          </div>

          {taskType === "checklist" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 6,
                textAlign: "center"
              }}
            >
              {weekDates.map((dateStr) => {
                const s = getTaskStatusOnDate(task, dateStr, appData.days);
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      background: isSelected
                        ? "rgba(13, 148, 136, 0.14)"
                        : "var(--surface-subtle, rgba(0,0,0,0.03))",
                      border: isSelected ? "2px solid var(--teal, #0d9488)" : "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 2px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                      {weekdayLetter(dateStr)}
                    </span>
                    <span
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: s.completed
                          ? "var(--accent, #10b981)"
                          : s.isScheduled
                          ? "var(--ink-muted)"
                          : "var(--border)"
                      }}
                    >
                      {s.completed ? "✓" : s.isScheduled ? "✕" : "—"}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--ink-muted)" }}>
                      {parseDateStr(dateStr).getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            // Duration & Quantity 7-Day Vertical Bars with Target Reference
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 6,
                alignItems: "flex-end",
                minHeight: 140,
                paddingTop: 10
              }}
            >
              {weekDates.map((dateStr) => {
                const s = getTaskStatusOnDate(task, dateStr, appData.days);
                const isSelected = dateStr === selectedDate;
                const pct = s.pct;
                const isReached = s.completed;
                const amountLabel =
                  taskType === "duration"
                    ? formatDuration(s.durationCompleted || 0)
                    : formatQuantityNumber(s.quantityCompleted || 0);

                const barHeight = Math.min(100, Math.max(8, pct));

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      background: isSelected ? "rgba(13, 148, 136, 0.12)" : "transparent",
                      border: isSelected ? "2px solid var(--teal, #0d9488)" : "1px solid transparent",
                      borderRadius: 8,
                      padding: "6px 2px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      height: "100%",
                      justifyContent: "flex-end"
                    }}
                  >
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isReached ? "var(--accent, #10b981)" : "var(--ink-muted)" }}>
                      {amountLabel}
                    </span>

                    <div
                      style={{
                        width: 14,
                        height: 70,
                        background: "var(--surface-subtle, rgba(0,0,0,0.06))",
                        borderRadius: 4,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${barHeight}%`,
                          background: isReached ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
                          borderRadius: 4,
                          transition: "height 0.3s ease"
                        }}
                      />
                    </div>

                    <span style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                      {weekdayLetter(dateStr)}
                    </span>
                    <span style={{ fontSize: "0.66rem", color: "var(--ink-muted)" }}>
                      {parseDateStr(dateStr).getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. 30-DAY ACTIVITY HEATMAP */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)" }}>
              30-DAY ACTIVITY HEATMAP
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
              Tap any date to inspect
            </div>
          </div>

          {/* 30 Day Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 5
            }}
          >
            {heatmapDates.map((dStr) => {
              const status = getTaskStatusOnDate(task, dStr, appData.days);
              const isSelected = dStr === selectedDate;
              const bg = getHeatmapColor(status.pct, status.isScheduled);
              const dNum = parseDateStr(dStr).getDate();

              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => setSelectedDate(dStr)}
                  title={`${formatShort(dStr)}: ${status.completed ? "Completed" : status.pct + "%"}`}
                  aria-label={`${formatShort(dStr)}: ${status.completed ? "Completed" : status.pct + "%"}`}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 6,
                    background: bg,
                    border: isSelected
                      ? "2px solid var(--ink)"
                      : "1px solid var(--border, rgba(0,0,0,0.08))",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: status.pct >= 75 ? "#ffffff" : "var(--ink)",
                    transition: "transform 0.15s ease"
                  }}
                >
                  {dNum}
                </button>
              );
            })}
          </div>

          {/* Heatmap Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
              marginTop: 10,
              fontSize: "0.7rem",
              color: "var(--ink-muted)"
            }}
          >
            <span>Less</span>
            {[0, 20, 45, 70, 90, 100].map((level) => (
              <div
                key={level}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: getHeatmapColor(level, true),
                  border: "1px solid var(--border)"
                }}
              />
            ))}
            <span>Target Reached</span>
          </div>
        </div>

        {/* 6. UNIVERSAL DATE INSPECTION CARD */}
        <div
          style={{
            border: "1px solid var(--teal, #0d9488)",
            borderRadius: 12,
            padding: "16px 18px",
            background: "rgba(13, 148, 136, 0.04)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              flexWrap: "wrap",
              gap: 6
            }}
          >
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--teal, #0d9488)", letterSpacing: "0.06em" }}>
                DATE INSPECTION
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)" }}>
                {formatLong(selectedDate)}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {selectedDateStatus.completed ? (
                <span
                  className="completion-achievement-pill"
                  style={{ fontSize: "0.76rem", padding: "3px 8px" }}
                >
                  ✓ Completed
                </span>
              ) : selectedDateStatus.isScheduled ? (
                <span
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    background: "var(--surface-subtle, rgba(0,0,0,0.05))",
                    padding: "3px 8px",
                    borderRadius: 6
                  }}
                >
                  Scheduled • Incomplete
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--ink-muted)",
                    background: "var(--surface-subtle, rgba(0,0,0,0.05))",
                    padding: "3px 8px",
                    borderRadius: 6
                  }}
                >
                  Not scheduled
                </span>
              )}
            </div>
          </div>

          {/* Date Inspection Controls */}
          {taskType === "checklist" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                {selectedDateStatus.completed
                  ? "Marked completed on this date."
                  : "Not yet completed on this date."}
              </div>
              <button
                type="button"
                className={selectedDateStatus.completed ? "btn btn-ghost" : "btn btn-primary"}
                onClick={() => handleToggleChecklist(selectedDate)}
                style={{ fontSize: "0.82rem", padding: "4px 12px" }}
              >
                {selectedDateStatus.completed ? "Mark Incomplete" : "✓ Mark as Completed"}
              </button>
            </div>
          ) : taskType === "duration" ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.88rem" }}>
                <span style={{ color: "var(--ink-muted)" }}>Completed:</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                  {formatDuration(selectedDateStatus.durationCompleted || 0)} / {formatDuration(task.durationTargetMinutes || 0)} ({selectedDateStatus.pct}%)
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className="chip-btn"
                    onClick={() => handleLogDurationDelta(selectedDate, mins)}
                  >
                    +{mins}m
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary-btn"
                  style={{ fontSize: "0.8rem", padding: "3px 8px" }}
                  onClick={() => setLogTimeModalOpen(true)}
                >
                  ⏱ Log Time
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.88rem" }}>
                <span style={{ color: "var(--ink-muted)" }}>Completed:</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                  {formatQuantity(selectedDateStatus.quantityCompleted || 0, quantityUnit)} / {formatQuantity(task.quantityTarget || 0, quantityUnit)} ({selectedDateStatus.pct}%)
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {quantityQuickAddOptions.map((opt) => (
                  <button
                    key={opt.delta}
                    type="button"
                    className="chip-btn"
                    onClick={() => handleLogQuantityDelta(selectedDate, opt.delta)}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary-btn"
                  style={{ fontSize: "0.8rem", padding: "3px 8px" }}
                  onClick={() => setEditQuantityModalOpen(true)}
                >
                  + Log / Set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 7. MONTHLY CALENDAR VIEW */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px",
            background: "var(--surface)"
          }}
        >
          {/* Calendar Header with Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>
              {monthLabel(calendarMonth)}
            </span>

            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
                aria-label="Previous month"
                style={{ minHeight: 30, minWidth: 30 }}
              >
                ‹
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCalendarMonth(monthAnchor(todayStr()))}
                aria-label="Current month"
                style={{ minHeight: 30, minWidth: 30, fontSize: "0.75rem", fontWeight: 700 }}
              >
                •
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                style={{ minHeight: 30, minWidth: 30 }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--ink-muted)",
              marginBottom: 6
            }}
          >
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          {/* Month day cells */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4
            }}
          >
            {monthCells.map((cell) => {
              const status = getTaskStatusOnDate(task, cell.date, appData.days);
              const isSelected = cell.date === selectedDate;
              const isTodayDate = cell.date === todayStr();

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  style={{
                    minHeight: 38,
                    borderRadius: 6,
                    border: isSelected
                      ? "2px solid var(--teal, #0d9488)"
                      : isTodayDate
                      ? "1px solid var(--accent, #10b981)"
                      : "1px solid var(--border, rgba(0,0,0,0.06))",
                    background: status.completed
                      ? "rgba(16, 185, 129, 0.15)"
                      : cell.inMonth
                      ? "var(--surface)"
                      : "var(--surface-subtle, rgba(0,0,0,0.02))",
                    opacity: cell.inMonth ? 1 : 0.45,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: "2px"
                  }}
                >
                  <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--ink)" }}>
                    {parseDateStr(cell.date).getDate()}
                  </span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: status.completed
                        ? "var(--accent, #10b981)"
                        : status.isScheduled
                        ? "var(--ink-muted)"
                        : "transparent"
                    }}
                  >
                    {status.completed ? "✓" : status.isScheduled ? "○" : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Monthly Summary Footer */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              color: "var(--ink-muted)"
            }}
          >
            <span>
              Target Reached: <strong>{monthSummary.completedDays} / {monthSummary.scheduledDays} days</strong>
            </span>
            <span>
              Rate: <strong>{monthSummary.completionRate}%</strong>
            </span>
          </div>
        </div>

        {/* 8. FREQUENCY BY WEEKDAY */}
        {weekdayFrequency.length > 0 ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px",
              background: "var(--surface)"
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ink-muted)",
                marginBottom: 10
              }}
            >
              FREQUENCY BY WEEKDAY
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weekdayFrequency.map((w) => (
                <div key={w.dayNumber} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem" }}>
                  <span style={{ width: 80, fontWeight: 600, color: "var(--ink)" }}>
                    {w.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: "var(--surface-subtle, rgba(0,0,0,0.08))",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        width: `${w.rate}%`,
                        height: "100%",
                        background: "var(--accent, #10b981)",
                        borderRadius: 4
                      }}
                    />
                  </div>
                  <span style={{ width: 40, textAlign: "right", fontWeight: 700, color: "var(--ink)" }}>
                    {w.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* 9. BEST DAY & ACHIEVEMENTS */}
        {overviewStats.bestDay ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 16px",
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--ink-muted)", letterSpacing: "0.06em" }}>
                ⭐ BEST DAY
              </div>
              <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
                {formatLong(overviewStats.bestDay.date)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span
                className="completion-achievement-pill"
                style={{ fontSize: "0.82rem", padding: "4px 10px" }}
              >
                {overviewStats.bestDay.amountFormatted || `${overviewStats.bestDay.pct}%`}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Sub-modals for Duration & Quantity */}
      {logTimeModalOpen ? (
        <LogTimeModal
          task={task}
          dateStr={selectedDate}
          onLogDelta={(mins) => handleLogDurationDelta(selectedDate, mins)}
          onSetTotal={(mins) => handleSetDurationTotal(selectedDate, mins)}
          onClose={() => setLogTimeModalOpen(false)}
        />
      ) : null}

      {editQuantityModalOpen && task.quantityTarget ? (
        <EditQuantityModal
          task={task}
          dateStr={selectedDate}
          onLogDelta={(delta) => handleLogQuantityDelta(selectedDate, delta)}
          onSetTotal={(total) => handleSetQuantityTotal(selectedDate, total)}
          onClose={() => setEditQuantityModalOpen(false)}
        />
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
}
