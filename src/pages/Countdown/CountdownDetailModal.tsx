import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Countdown } from "../../types";
import { computeCountdownStatus, formatMilestoneDays } from "../../utils/countdownUtils";
import { formatLong, formatShort, todayStr } from "../../utils/dateUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { BackIcon, CloseIcon, EditIcon } from "../../components/icons";
import ConfirmModal from "../../components/Modals/ConfirmModal";

interface CountdownDetailModalProps {
  countdown: Countdown;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
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
  onToggleShowOnToday,
  onToast
}: CountdownDetailModalProps) {
  useBodyScrollLock(true);
  const [isClosing, setIsClosing] = useState(false);
  const closingTimeoutRef = useRef<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReached, setShowReached] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const status = computeCountdownStatus(countdown, todayStr());
  const nextMilestone = status.nextMilestone;
  const upcomingMilestones = nextMilestone
    ? status.milestones.filter((m) => m.days < nextMilestone.days)
    : [];
  const reachedMilestones = nextMilestone
    ? status.milestones.filter((m) => m.days > nextMilestone.days && m.isReached)
    : [];

  function handleClose() {
    if (isClosing) return;
    setIsClosing(true);
    closingTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, 280);
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

  // Close overflow menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing]);

  async function handleShare() {
    const text = `${countdown.icon} ${countdown.title}\n${status.displayValue} ${status.displayUnit}\nTarget: ${formatLong(countdown.targetDate)}${countdown.targetTime ? " at " + countdown.targetTime : ""}\n— via Daily Check`;

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

  // Header status banner
  const isCompleted = countdown.mode !== "countup" && status.phase === "completed";
  const isCountUp = countdown.mode === "countup";

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
        className={`countdown-sheet is-expanded ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="countdown-detail-title"
      >
        {/* Header Bar with Grab Handle */}
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
            <button
              type="button"
              className="icon-btn"
              onClick={handleClose}
              aria-label="Back to countdowns"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--ink)",
                width: "auto",
                padding: "4px 8px"
              }}
            >
              <BackIcon />
              <span>Countdown</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {countdown.pinned ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent, #10b981)",
                    background: "rgba(16, 185, 129, 0.12)",
                    padding: "3px 8px",
                    borderRadius: 12
                  }}
                >
                  PINNED
                </span>
              ) : null}

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
        </div>

        {/* Scrollable Content */}
        <div className="countdown-sheet-body" style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {/* Hero Section */}
          <div
            style={{
              textAlign: "center",
              padding: "4px 8px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            {/* Status pill (if Completed or Started Count-Up) */}
            {isCompleted ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--accent, #10b981)",
                  background: "rgba(16, 185, 129, 0.12)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  marginBottom: 8
                }}
              >
                <span>🎉</span>
                <span>Completed</span>
              </div>
            ) : isCountUp ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#3b82f6",
                  background: "rgba(59, 130, 246, 0.12)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  marginBottom: 8
                }}
              >
                <span>🏆</span>
                <span>Started</span>
              </div>
            ) : null}

            {/* Goal Title with Icon */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                maxWidth: "100%",
                marginBottom: 6
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }} aria-hidden="true">
                {countdown.icon}
              </span>
              <h2
                id="countdown-detail-title"
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                  wordBreak: "break-word"
                }}
              >
                {countdown.title}
              </h2>
            </div>

            {/* Hero Number & Unit */}
            <div style={{ margin: "0 0 4px" }}>
              <div
                style={{
                  fontSize: "clamp(46px, 12vw, 66px)",
                  fontWeight: 800,
                  lineHeight: 1,
                  color: isCompleted ? "var(--ink-muted)" : "var(--accent, #10b981)",
                  letterSpacing: "-0.03em"
                }}
              >
                {isCompleted ? "0" : status.displayValue}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginTop: 4
                }}
              >
                {isCompleted
                  ? "DAYS LEFT"
                  : isCountUp
                  ? "DAYS"
                  : status.displayUnit || "DAYS LEFT"}
              </div>
            </div>

            {/* Subtext Date */}
            <div
              style={{
                fontSize: 13.5,
                color: "var(--ink-muted)",
                fontWeight: 500,
                marginTop: 2
              }}
            >
              {isCompleted
                ? `Target reached · ${formatLong(countdown.targetDate)}`
                : isCountUp
                ? `Since ${formatLong(countdown.targetDate)}`
                : formatLong(countdown.targetDate)}
              {countdown.targetTime && !countdown.allDay ? ` at ${countdown.targetTime}` : ""}
            </div>
          </div>

          {/* Progress Bar & Percentage */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 14px"
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
                height: 7,
                background: "var(--surface-hover)",
                borderRadius: 4,
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${status.progressPct}%`,
                  height: "100%",
                  background: isCompleted ? "var(--ink-muted)" : "var(--accent, #10b981)",
                  borderRadius: 4,
                  transition: "width 0.3s ease"
                }}
              />
            </div>
          </div>

          {/* Key Details Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 13.5
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)" }}>Target date</span>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                {formatShort(countdown.targetDate)}
              </span>
            </div>

            {countdown.createdAt ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--ink-muted)" }}>Created</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {formatShort(countdown.createdAt.slice(0, 10))}
                </span>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)" }}>Calculation</span>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                {countdown.countWorkingDays ? "Working days only" : "Calendar days"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)" }}>Show on Today</span>
              <button
                type="button"
                onClick={onToggleShowOnToday}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 12,
                  background: countdown.showOnToday ? "rgba(16, 185, 129, 0.12)" : "var(--surface-hover)",
                  color: countdown.showOnToday ? "var(--accent, #10b981)" : "var(--ink-muted)",
                  border: "1px solid var(--border)",
                  cursor: "pointer"
                }}
              >
                {countdown.showOnToday ? "Active on Today" : "Hidden from Today"}
              </button>
            </div>
          </div>

          {/* Notes if present */}
          {countdown.notes ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 14px"
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
                  fontSize: 13.5,
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
                padding: "13px 14px"
              }}
            >
              {/* Featured Next Milestone */}
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 2
                  }}
                >
                  NEXT MILESTONE
                </div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em"
                  }}
                >
                  {formatMilestoneDays(nextMilestone.days)}
                </div>
              </div>

              {/* Remaining Milestones List (Next milestone is NOT repeated!) */}
              {upcomingMilestones.length > 0 ? (
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
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
                          fontSize: 13,
                          minHeight: 26
                        }}
                      >
                        <span
                          style={{
                            color: "var(--ink)",
                            fontWeight: isFinal ? 600 : 500
                          }}
                        >
                          {formatMilestoneDays(m.days)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: isFinal ? 700 : 600,
                            padding: "2px 8px",
                            borderRadius: 8,
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
                          {isFinal ? "Final" : "Upcoming"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Reached Milestones toggle (if any passed) */}
              {reachedMilestones.length > 0 ? (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setShowReached((v) => !v)}
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
                    <span>{showReached ? "▾ Hide" : "▸ Show"} passed milestones ({reachedMilestones.length})</span>
                  </button>

                  {showReached ? (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {reachedMilestones.map((m) => (
                        <div
                          key={m.days}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 12.5,
                            opacity: 0.75
                          }}
                        >
                          <span style={{ color: "var(--ink-muted)" }}>{formatMilestoneDays(m.days)}</span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 8,
                              background: "rgba(16, 185, 129, 0.1)",
                              color: "var(--accent, #10b981)"
                            }}
                          >
                            ✓ Reached
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Action Row: [ Edit ] and [ ⋮ ] */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingTop: 8,
              position: "relative"
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={onEdit}
              style={{
                flex: 1,
                minHeight: 46,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "var(--accent, #10b981)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 12
              }}
            >
              <EditIcon />
              <span>Edit</span>
            </button>

            {/* Overflow menu button [ ⋮ ] */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More actions"
                style={{
                  width: 46,
                  height: 46,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  borderRadius: 12
                }}
              >
                ⋮
              </button>

              {menuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    bottom: 52,
                    right: 0,
                    zIndex: 50,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                    minWidth: 190,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onTogglePin();
                    }}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span>📌</span>
                    <span>{countdown.pinned ? "Unpin from top" : "Pin to top"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleShowOnToday();
                    }}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span>📅</span>
                    <span>{countdown.showOnToday ? "Hide from Today" : "Show on Today"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleShare();
                    }}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span>🔗</span>
                    <span>Share / Copy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate();
                    }}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span>📋</span>
                    <span>Duplicate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDeleteOpen(true);
                    }}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--danger, #ef4444)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span>🗑️</span>
                    <span>Delete countdown</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

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
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(detailContent, document.body) : null;
}
