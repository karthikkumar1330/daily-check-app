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
  calculateQuantityAverages,
  calculateQuantityPct,
  calculateQuantityStreak,
  formatQuantity,
  formatQuantityNumber,
  formatQuantityProgress,
  getPeriodQuantitySummary,
  getQuickAddOptions,
  getTaskQuantityOnDate
} from "../../utils/quantityUtils";
import { categoryMeta, prioEmoji, prioLabel } from "../../utils/taskUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useTasks } from "../../hooks/useTasks";
import EditQuantityModal from "../Modals/EditQuantityModal";

interface QuantityGoalDetailsProps {
  task: Task;
  initialDate?: string;
  onClose: () => void;
  onToast?: (message: string) => void;
}

export default function QuantityGoalDetails({
  task,
  initialDate,
  onClose,
  onToast
}: QuantityGoalDetailsProps) {
  const { appData, logTaskQuantity, setTaskQuantityCompleted } = useTasks();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr());
  const [calendarMonth, setCalendarMonth] = useState<string>(monthAnchor(initialDate || todayStr()));
  const [editModalOpen, setEditModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(true);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !editModalOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editModalOpen]);

  const target = task.quantityTarget || 1;
  const unit = (task.quantityUnit || "").trim();
  const step = task.quantityStep && task.quantityStep > 0 ? task.quantityStep : 1;

  // Real-time task resolution for selected date
  const selectedDateAmount = useMemo(() => {
    return getTaskQuantityOnDate(task, selectedDate, appData.days);
  }, [task, selectedDate, appData.days]);

  const selectedPct = calculateQuantityPct(selectedDateAmount, target);
  const isSelectedReached = selectedDateAmount >= target;
  const remaining = Math.max(0, target - selectedDateAmount);

  // Quick add options
  const quickAddOptions = useMemo(() => {
    return getQuickAddOptions(step, unit);
  }, [step, unit]);

  // Streaks
  const streaks = useMemo(() => {
    return calculateQuantityStreak(task, todayStr(), appData.days);
  }, [task, appData.days]);

  // Averages & historical metrics
  const averages = useMemo(() => {
    return calculateQuantityAverages(task, appData.days);
  }, [task, appData.days]);

  // 7-day week breakdown around selectedDate
  const currentWeekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
  const weekSummary = useMemo(() => {
    return getPeriodQuantitySummary(task, weekDates, appData.days);
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
    return getPeriodQuantitySummary(task, datesInMonth, appData.days);
  }, [task, monthCells, appData.days]);

  const cat = categoryMeta(task.category);

  function handleLogDelta(delta: number) {
    const res = logTaskQuantity(selectedDate, task.id, delta);
    if (res.ok) {
      if (res.completed && !isSelectedReached) {
        onToast?.(`🎯 Target reached! ${formatQuantity(target, unit)} completed for ${formatShort(selectedDate)}`);
      } else {
        onToast?.(`Logged +${formatQuantity(delta, unit)} · ${formatQuantity(res.newTotal, unit)} / ${formatQuantity(target, unit)}`);
      }
    }
  }

  function handleSetTotal(total: number) {
    const res = setTaskQuantityCompleted(selectedDate, task.id, total);
    if (res.ok) {
      if (res.completed && !isSelectedReached) {
        onToast?.(`🎯 Target reached! ${formatQuantity(target, unit)} completed for ${formatShort(selectedDate)}`);
      } else {
        onToast?.(`Updated: ${formatQuantity(res.newTotal, unit)} / ${formatQuantity(target, unit)}`);
      }
    }
  }

  function getHeatmapColor(pct: number): string {
    if (pct <= 0) return "var(--surface-subtle, rgba(0,0,0,0.05))";
    if (pct < 25) return "rgba(16, 185, 129, 0.22)";
    if (pct < 50) return "rgba(16, 185, 129, 0.45)";
    if (pct < 75) return "rgba(16, 185, 129, 0.68)";
    if (pct < 100) return "rgba(16, 185, 129, 0.85)";
    return "var(--accent, #10b981)";
  }

  const isTodaySelected = selectedDate === todayStr();

  const content = (
    <div
      className="overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quantity-goal-details-title"
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
        className="modal modal-card quantity-details-dialog"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 620,
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
        {/* Top App Bar / Navigation */}
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
            id="quantity-goal-details-title"
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "0.02em"
            }}
          >
            Quantity Goal Details
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close quantity goal details"
            style={{ minHeight: 34, minWidth: 34 }}
          >
            ✕
          </button>
        </div>

        {/* Goal Hero Card */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-subtle, rgba(0,0,0,0.02)) 100%)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px"
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
                  📊 Quantity Goal
                </span>
                {cat.id ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                    {cat.emoji} {cat.label}
                  </span>
                ) : null}
                <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                  {prioEmoji(task.priority)} {prioLabel(task.priority)}
                </span>
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
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

            <div
              style={{
                textAlign: "right",
                background: "var(--surface)",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>TARGET</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink)" }}>
                {formatQuantity(target, unit)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>per day</div>
            </div>
          </div>
        </div>

        {/* 1. Selected Date Progress Card */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px",
            background: "var(--surface)"
          }}
        >
          {/* Date Selector Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                aria-label="Previous day"
                style={{ minHeight: 32, minWidth: 32 }}
              >
                ‹
              </button>
              <span style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--ink)" }}>
                {formatLong(selectedDate)}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                aria-label="Next day"
                style={{ minHeight: 32, minWidth: 32 }}
              >
                ›
              </button>
            </div>

            {!isTodaySelected ? (
              <button
                type="button"
                className="chip-btn"
                onClick={() => setSelectedDate(todayStr())}
                style={{ padding: "4px 10px", fontSize: "0.78rem" }}
              >
                Jump to Today
              </button>
            ) : (
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--accent, #10b981)",
                  background: "rgba(16, 185, 129, 0.12)",
                  padding: "3px 8px",
                  borderRadius: 6
                }}
              >
                Today
              </span>
            )}
          </div>

          {/* Metric Row: Completed, Target, Remaining, Pct */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginBottom: 12,
              textAlign: "center"
            }}
          >
            <div
              style={{
                padding: "10px 8px",
                background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                borderRadius: 8,
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>COMPLETED</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: isSelectedReached ? "var(--accent, #10b981)" : "var(--ink)", marginTop: 2 }}>
                {formatQuantity(selectedDateAmount, unit)}
              </div>
            </div>

            <div
              style={{
                padding: "10px 8px",
                background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                borderRadius: 8,
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>REMAINING</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                {formatQuantity(remaining, unit)}
              </div>
            </div>

            <div
              style={{
                padding: "10px 8px",
                background: "var(--surface-subtle, rgba(0,0,0,0.03))",
                borderRadius: 8,
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>PROGRESS</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: isSelectedReached ? "var(--accent, #10b981)" : "var(--teal, #0d9488)", marginTop: 2 }}>
                {selectedPct}%
              </div>
            </div>
          </div>

          {/* Large Progress Bar */}
          <div style={{ marginBottom: 12 }}>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={target}
              aria-valuenow={selectedDateAmount}
              aria-label={`Progress on ${formatShort(selectedDate)}: ${selectedPct}%`}
              style={{
                height: 10,
                borderRadius: 5,
                background: "var(--border, rgba(0,0,0,0.1))",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${selectedPct}%`,
                  height: "100%",
                  background: isSelectedReached ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
                  borderRadius: 5,
                  transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>
          </div>

          {/* Status & Quick Action Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              paddingTop: 4
            }}
          >
            <div>
              {isSelectedReached ? (
                <span
                  className="completion-achievement-pill"
                  style={{
                    fontSize: "0.82rem",
                    padding: "4px 10px"
                  }}
                >
                  ✓ Target Reached! 🎯
                </span>
              ) : (
                <span style={{ fontSize: "0.82rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                  {selectedDateAmount > 0 ? "In progress" : "Not started yet"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {quickAddOptions.map((opt) => (
                <button
                  key={opt.delta}
                  type="button"
                  className="btn primary-btn"
                  onClick={() => handleLogDelta(opt.delta)}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "4px 10px",
                    minHeight: 32
                  }}
                >
                  {opt.label}
                </button>
              ))}

              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => setEditModalOpen(true)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "4px 10px",
                  minHeight: 32
                }}
              >
                ✏ Set Total
              </button>
            </div>
          </div>
        </div>

        {/* 2. 7-Day Progress Breakdown */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)" }}>
              7-Day Week Progress
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
              Week total: <strong>{formatQuantity(weekSummary.total, unit)}</strong> · {weekSummary.reachedCount}/7 reached
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6
            }}
          >
            {weekDates.map((d) => {
              const amount = getTaskQuantityOnDate(task, d, appData.days);
              const reached = amount >= target;
              const pct = calculateQuantityPct(amount, target);
              const isSelected = d === selectedDate;
              const isToday = d === todayStr();
              const dateObj = parseDateStr(d);

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "8px 2px",
                    borderRadius: 8,
                    border: isSelected ? "2px solid var(--accent, #10b981)" : "1px solid var(--border)",
                    background: isSelected
                      ? "var(--accent-soft, rgba(16, 185, 129, 0.08))"
                      : "var(--surface-subtle, rgba(0,0,0,0.02))",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                  aria-label={`${formatShort(d)}: ${formatQuantity(amount, unit)}`}
                >
                  <span style={{ fontSize: "0.72rem", color: isToday ? "var(--accent, #10b981)" : "var(--ink-muted)", fontWeight: 600 }}>
                    {weekdayLetter(d)}
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)", margin: "2px 0" }}>
                    {dateObj.getDate()}
                  </span>

                  {/* Micro Progress Bar */}
                  <div
                    style={{
                      width: "80%",
                      height: 4,
                      background: "var(--border)",
                      borderRadius: 2,
                      overflow: "hidden",
                      margin: "4px 0"
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: reached ? "var(--accent, #10b981)" : "var(--teal, #0d9488)"
                      }}
                    />
                  </div>

                  <span style={{ fontSize: "0.68rem", fontWeight: 600, color: reached ? "var(--accent, #10b981)" : "var(--ink-muted)" }}>
                    {reached ? "✓" : formatQuantityNumber(amount)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 30-Day Heatmap */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)" }}>
              30-Day History Heatmap
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
              Tap any day to inspect
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 6,
              marginBottom: 10
            }}
          >
            {heatmapDates.map((d) => {
              const amount = getTaskQuantityOnDate(task, d, appData.days);
              const pct = calculateQuantityPct(amount, target);
              const isSelected = d === selectedDate;
              const dateObj = parseDateStr(d);

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  title={`${formatShort(d)}: ${formatQuantity(amount, unit)} (${pct}%)`}
                  aria-label={`${formatShort(d)}: ${formatQuantity(amount, unit)} (${pct}%)`}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 6,
                    border: isSelected ? "2px solid var(--ink)" : "1px solid var(--border)",
                    background: getHeatmapColor(pct),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.66rem",
                      fontWeight: 600,
                      color: pct >= 50 ? "#ffffff" : "var(--ink)",
                      textShadow: pct >= 50 ? "0 1px 2px rgba(0,0,0,0.3)" : "none"
                    }}
                  >
                    {dateObj.getDate()}
                  </span>
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
              fontSize: "0.72rem",
              color: "var(--ink-muted)"
            }}
          >
            <span>Less</span>
            {[0, 24, 49, 74, 100].map((p) => (
              <span
                key={p}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: getHeatmapColor(p),
                  display: "inline-block",
                  border: "1px solid var(--border)"
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* 4. Monthly Calendar View */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
            background: "var(--surface)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
                aria-label="Previous month"
                style={{ minHeight: 30, minWidth: 30 }}
              >
                ‹
              </button>
              <span style={{ fontWeight: 700, fontSize: "0.94rem", color: "var(--ink)" }}>
                {monthLabel(calendarMonth)}
              </span>
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

            <div style={{ fontSize: "0.76rem", color: "var(--ink-muted)" }}>
              {monthSummary.reachedCount} targets reached
            </div>
          </div>

          {/* Weekday headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              textAlign: "center",
              marginBottom: 4,
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--ink-muted)"
            }}
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4
            }}
          >
            {monthCells.map((cell) => {
              const amount = getTaskQuantityOnDate(task, cell.date, appData.days);
              const reached = amount >= target;
              const pct = calculateQuantityPct(amount, target);
              const isSelected = cell.date === selectedDate;
              const dateObj = parseDateStr(cell.date);

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 6,
                    border: isSelected
                      ? "2px solid var(--accent, #10b981)"
                      : "1px solid var(--border)",
                    background: isSelected
                      ? "var(--accent-soft, rgba(16, 185, 129, 0.1))"
                      : cell.inMonth
                      ? getHeatmapColor(pct)
                      : "transparent",
                    opacity: cell.inMonth ? 1 : 0.25,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 2
                  }}
                  aria-label={`${formatShort(cell.date)}: ${formatQuantity(amount, unit)}`}
                >
                  <span
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: cell.inMonth && pct >= 50 ? "#ffffff" : "var(--ink)",
                      textShadow: cell.inMonth && pct >= 50 ? "0 1px 2px rgba(0,0,0,0.3)" : "none"
                    }}
                  >
                    {dateObj.getDate()}
                  </span>
                  {reached && cell.inMonth ? (
                    <span style={{ fontSize: "0.62rem", color: pct >= 50 ? "#ffffff" : "var(--accent, #10b981)" }}>
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Quantity Streaks & Achievement Badges */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
            background: "var(--surface)"
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)", marginBottom: 10 }}>
            Streaks & Milestones
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <span style={{ fontSize: "1.6rem" }}>🔥</span>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                  CURRENT STREAK
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)" }}>
                  {streaks.currentStreak} {streaks.currentStreak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <span style={{ fontSize: "1.6rem" }}>🏆</span>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                  BEST STREAK
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)" }}>
                  {streaks.bestStreak} {streaks.bestStreak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <span style={{ fontSize: "1.6rem" }}>🎯</span>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                  TARGETS REACHED
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)" }}>
                  {averages.targetReachedDays} {averages.targetReachedDays === 1 ? "day" : "days"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <span style={{ fontSize: "1.6rem" }}>📦</span>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                  TOTAL LOGGED
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)" }}>
                  {formatQuantity(averages.totalQuantity, unit)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Averages & Statistics */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
            background: "var(--surface)"
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)", marginBottom: 10 }}>
            Analytics & Averages
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>DAILY AVERAGE</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
                {formatQuantity(averages.avgDaily, unit)}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>AVG COMPLETION RATE</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--teal, #0d9488)", marginTop: 2 }}>
                {averages.avgPct}%
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>BEST DAY</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
                {averages.bestDay
                  ? `${formatShort(averages.bestDay.date)} · ${formatQuantity(averages.bestDay.amount, unit)}`
                  : "—"}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>DAYS TRACKED</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
                {averages.daysTracked} {averages.daysTracked === 1 ? "day" : "days"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Quantity Modal */}
      {editModalOpen ? (
        <EditQuantityModal
          task={{
            ...task,
            quantityCompleted: selectedDateAmount
          }}
          dateStr={selectedDate}
          onLogDelta={(delta) => {
            handleLogDelta(delta);
            setEditModalOpen(false);
          }}
          onSetTotal={(total) => {
            handleSetTotal(total);
            setEditModalOpen(false);
          }}
          onClose={() => setEditModalOpen(false)}
        />
      ) : null}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
