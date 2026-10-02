import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Countdown } from "../../types";
import {
  computeCountdownStatus,
  formatFullTargetDate,
  formatMilestoneDays,
  formatTargetWeekday
} from "../../utils/countdownUtils";
import { todayStr } from "../../utils/dateUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CloseIcon } from "../../components/icons";
import ConfirmModal from "../../components/Modals/ConfirmModal";

interface CountdownDetailModalProps {
  countdown: Countdown;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleFeatured: () => void;
  onToggleShowOnToday: () => void;
  onToast?: (msg: string) => void;
}

export default function CountdownDetailModal({
  countdown,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePin,
  onToggleFeatured,
  onToggleShowOnToday,
  onToast
}: CountdownDetailModalProps) {
  useBodyScrollLock(true);
  const [isClosing, setIsClosing] = useState(false);
  const closingTimeoutRef = useRef<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [showPassedMilestones, setShowPassedMilestones] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const status = computeCountdownStatus(countdown, todayStr());
  const isCompleted = status.phase === "completed";
  const formattedTargetDate = formatFullTargetDate(countdown.targetDate);
  const targetWeekday = formatTargetWeekday(countdown.targetDate);

  const nextMilestone = status.nextMilestone;
  const upcomingMilestones = nextMilestone
    ? status.milestones.filter((m) => m.days < nextMilestone.days)
    : [];
  const passedMilestones = nextMilestone
    ? status.milestones.filter((m) => m.days > nextMilestone.days && m.isReached)
    : [];

  function handleClose() {
    if (isClosing) return;
    setIsClosing(true);
    closingTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, 270);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) {
      handleClose();
    }
    touchStartY.current = null;
  }

  useEffect(() => {
    return () => {
      if (closingTimeoutRef.current) {
        window.clearTimeout(closingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing]);

  async function handleShare() {
    const text = `${countdown.icon} ${countdown.title}\n${status.displayValue} ${status.displayUnit}\nTarget: ${formattedTargetDate} (${targetWeekday})\n— via Daily Check`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: countdown.title,
          text
        });
        if (onToast) onToast("Shared countdown.");
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      if (onToast) onToast("Copied countdown summary to clipboard!");
    } catch {
      if (onToast) onToast("Unable to share countdown.");
    }
  }

  const detailContent = (
    <>
      {/* Viewport-level Backdrop */}
      <div
        className={`countdown-sheet-backdrop ${isClosing ? "is-closing" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* True Viewport-anchored Bottom Sheet */}
      <div
        className={`countdown-sheet ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="countdown-detail-title"
      >
        {/* Header Bar */}
        <div className="countdown-sheet-header">
          <div
            className="countdown-grab-handle-bar"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            title="Drag down to close"
          >
            <div className="countdown-grab-handle" />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingTop: 2
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, paddingRight: 8 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">
                {countdown.icon}
              </span>
              <h2
                id="countdown-detail-title"
                style={{
                  fontSize: 16.5,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {countdown.title}
              </h2>
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={handleClose}
              aria-label="Close dialog"
              style={{ width: 36, height: 36 }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="countdown-sheet-body">
          {/* Hero Number Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "20px 16px",
              textAlign: "center",
              marginBottom: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
            }}
          >
            {isCompleted ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  background: "var(--surface-hover)",
                  padding: "4px 10px",
                  borderRadius: 16,
                  marginBottom: 8
                }}
              >
                ✓ Completed
              </div>
            ) : null}

            {/* Title */}
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: 8,
                letterSpacing: "-0.01em"
              }}
            >
              {countdown.title}
            </div>

            {/* Prominent Number */}
            <div
              style={{
                fontSize: "clamp(44px, 12vw, 62px)",
                fontWeight: 800,
                lineHeight: 1,
                color: isCompleted ? "var(--ink-muted)" : "var(--accent, #10b981)",
                letterSpacing: "-0.03em"
              }}
            >
              {status.displayValue}
            </div>

            {status.displayUnit ? (
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginTop: 6
                }}
              >
                {status.displayUnit}
              </div>
            ) : null}

            {/* Target Date Subtitle */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 10
              }}
            >
              {formattedTargetDate}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--ink-muted)",
                fontWeight: 500,
                marginTop: 2
              }}
            >
              {targetWeekday}
            </div>
          </div>

          {/* Meaningful Progress Bar (Only when meaningful: not 0%) */}
          {status.hasMeaningfulProgress && status.progressPct > 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 14
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-muted)",
                  marginBottom: 8
                }}
              >
                <span>Progress</span>
                <span style={{ color: "var(--ink)", fontWeight: 700 }}>
                  {status.progressPct}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 6,
                  background: "var(--surface-hover)",
                  borderRadius: 3,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${status.progressPct}%`,
                    height: "100%",
                    background: isCompleted ? "var(--ink-muted)" : "var(--accent, #10b981)",
                    borderRadius: 3,
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* Compact Details Box */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 13,
              marginBottom: 14
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)", textTransform: "uppercase", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>Target</span>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{formattedTargetDate}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)", textTransform: "uppercase", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>Calculation</span>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>Calendar days</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)", textTransform: "uppercase", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>On Today</span>
              <button
                type="button"
                onClick={onToggleShowOnToday}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: countdown.showOnToday ? "rgba(16, 185, 129, 0.12)" : "var(--surface-hover)",
                  color: countdown.showOnToday ? "var(--accent, #10b981)" : "var(--ink-muted)",
                  border: "1px solid var(--border)",
                  cursor: "pointer"
                }}
              >
                {countdown.showOnToday ? "Yes" : "No"}
              </button>
            </div>

            {countdown.featured ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--ink-muted)", textTransform: "uppercase", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>Featured</span>
                <span style={{ fontWeight: 600, color: "var(--accent, #10b981)" }}>⭐ Yes</span>
              </div>
            ) : null}

            {countdown.pinned ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--ink-muted)", textTransform: "uppercase", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>Pinned</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>📌 Yes</span>
              </div>
            ) : null}
          </div>

          {/* Notes (Only when notes actually exist) */}
          {countdown.notes && countdown.notes.trim() ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 14
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6
                }}
              >
                Notes
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap"
                }}
              >
                {countdown.notes}
              </div>
            </div>
          ) : null}

          {/* Milestones Hierarchy */}
          {nextMilestone && !isCompleted ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 16
              }}
            >
              {/* Featured Next Milestone */}
              <div style={{ marginBottom: upcomingMilestones.length > 0 ? 8 : 0 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "var(--ink-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 3
                  }}
                >
                  NEXT MILESTONE
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em"
                  }}
                >
                  {formatMilestoneDays(nextMilestone.days)}
                </div>

                {upcomingMilestones.length > 0 && !showAllMilestones ? (
                  <button
                    type="button"
                    onClick={() => setShowAllMilestones(true)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      marginTop: 6,
                      color: "var(--accent, #10b981)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center"
                    }}
                  >
                    View all milestones →
                  </button>
                ) : null}
              </div>

              {/* Upcoming Milestones List (When expanded, no duplicate of next milestone) */}
              {upcomingMilestones.length > 0 && showAllMilestones ? (
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}
                >
                  {upcomingMilestones.map((m) => {
                    const isFinal = m.days === 0;
                    return (
                      <div
                        key={m.days}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 12.5,
                          minHeight: 24
                        }}
                      >
                        <span style={{ color: "var(--ink)", fontWeight: isFinal ? 600 : 500 }}>
                          {formatMilestoneDays(m.days)}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: isFinal ? 700 : 600,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: isFinal
                              ? "rgba(16, 185, 129, 0.14)"
                              : "var(--surface-hover)",
                            color: isFinal
                              ? "var(--accent, #10b981)"
                              : "var(--ink-muted)",
                            border: isFinal
                              ? "1px solid rgba(16, 185, 129, 0.25)"
                              : "1px solid var(--border)"
                          }}
                        >
                          {isFinal ? "Target day · Final" : "Upcoming"}
                        </span>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowAllMilestones(false)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      marginTop: 4,
                      color: "var(--ink-muted)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    Hide upcoming milestones ▴
                  </button>
                </div>
              ) : null}

              {/* Passed Milestones Disclosure */}
              {passedMilestones.length > 0 ? (
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setShowPassedMilestones((v) => !v)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--ink-muted)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <span>{showPassedMilestones ? "▾ Hide" : "▸ Show"} passed milestones ({passedMilestones.length})</span>
                  </button>

                  {showPassedMilestones ? (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {passedMilestones.map((m) => (
                        <div
                          key={m.days}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 12,
                            color: "var(--ink-muted)"
                          }}
                        >
                          <span>{formatMilestoneDays(m.days)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700 }}>✓ Reached</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Quick Actions Row */}
          <div className="countdown-detail-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onEdit}
            >
              ✏️ Edit
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleShare}
            >
              ↗ Share
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmDeleteOpen(true)}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--danger, #ef4444)",
                border: "1px solid rgba(239, 68, 68, 0.25)"
              }}
              aria-label="Delete countdown"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteOpen ? (
        <ConfirmModal
          title={`Delete "${countdown.title}"?`}
          message="This countdown will be permanently removed."
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            setConfirmDeleteOpen(false);
            onDelete();
          }}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      ) : null}
    </>
  );

  return typeof document !== "undefined" ? createPortal(detailContent, document.body) : null;
}
