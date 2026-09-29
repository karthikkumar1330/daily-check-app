import { useState } from "react";
import type { Countdown } from "../../types";
import { computeCountdownStatus } from "../../utils/countdownUtils";
import { formatLong, formatShort, todayStr } from "../../utils/dateUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CloseIcon, EditIcon, ShareIcon, TrashIcon } from "../../components/icons";
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [milestonesExpanded, setMilestonesExpanded] = useState(false);

  const status = computeCountdownStatus(countdown, todayStr());

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

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1040 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="countdown-detail-title"
        style={{
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          width: "100%",
          padding: 0
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            background: "var(--surface)",
            zIndex: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="icon-btn"
              onClick={handleShare}
              aria-label="Share countdown"
              style={{ width: 36, height: 36 }}
            >
              <ShareIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onTogglePin}
              aria-label={countdown.pinned ? "Unpin countdown" : "Pin countdown as featured"}
              style={{
                width: 36,
                height: 36,
                color: countdown.pinned ? "var(--accent)" : "var(--ink-muted)"
              }}
            >
              📌
            </button>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close details"
            style={{ width: 36, height: 36 }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 22px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Hero Count */}
          <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
            <div style={{ fontSize: 36, marginBottom: 4 }} aria-hidden="true">
              {countdown.icon}
            </div>
            <h2
              id="countdown-detail-title"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--ink)",
                margin: "0 0 12px 0",
                wordBreak: "break-word"
              }}
            >
              {countdown.title}
            </h2>

            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1,
                color: status.phase === "completed" ? "var(--ink-muted)" : "var(--accent, #10b981)",
                letterSpacing: "-0.02em"
              }}
            >
              {status.displayValue}
            </div>
            {status.displayUnit ? (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginTop: 6
                }}
              >
                {status.displayUnit}
              </div>
            ) : null}

            <div
              style={{
                fontSize: 14,
                color: "var(--ink-muted)",
                fontWeight: 500,
                marginTop: 10
              }}
            >
              {formatLong(countdown.targetDate)}
              {countdown.targetTime ? ` at ${countdown.targetTime}` : ""}
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6 }}>
              <span>Progress</span>
              <span>{status.progressPct}% elapsed</span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "var(--surface-hover)",
                borderRadius: 4,
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${status.progressPct}%`,
                  height: "100%",
                  background: status.phase === "completed" ? "var(--ink-muted)" : "var(--accent, #10b981)",
                  borderRadius: 4,
                  transition: "width 0.3s ease"
                }}
              />
            </div>
          </div>

          {/* Next Milestone */}
          {status.nextMilestone && status.phase !== "completed" ? (
            <div
              style={{
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "12px 14px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Next Milestone
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {status.nextMilestone.label}
                  </div>
                </div>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setMilestonesExpanded((v) => !v)}
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {milestonesExpanded ? "Hide all" : "View all"}
                </button>
              </div>

              {milestonesExpanded ? (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {status.milestones.map((m) => (
                    <div
                      key={m.days}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12.5,
                        padding: "3px 0"
                      }}
                    >
                      <span style={{ color: m.isReached ? "var(--ink-muted)" : "var(--ink)", fontWeight: m.isNext ? 700 : 500 }}>
                        {m.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: m.isReached
                            ? "rgba(16, 185, 129, 0.12)"
                            : m.isNext
                            ? "rgba(59, 130, 246, 0.12)"
                            : "var(--surface)",
                          color: m.isReached
                            ? "var(--accent)"
                            : m.isNext
                            ? "#3b82f6"
                            : "var(--ink-muted)"
                        }}
                      >
                        {m.isReached ? "✓ Reached" : m.isNext ? "Next Goal" : "Upcoming"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Quick Details List */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--ink-muted)" }}>Calculation</span>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                {countdown.countWorkingDays ? "Working days (Mon–Fri)" : "Calendar days"}
              </span>
            </div>

            {countdown.recurring ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-muted)" }}>Repeats</span>
                <span style={{ fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>
                  Every {countdown.recurring.frequency}
                </span>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-muted)" }}>Show on Today</span>
              <button
                type="button"
                className="chip"
                onClick={onToggleShowOnToday}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: countdown.showOnToday ? "rgba(16, 185, 129, 0.12)" : "var(--surface-hover)",
                  color: countdown.showOnToday ? "var(--accent)" : "var(--ink-muted)",
                  border: "1px solid var(--border)",
                  cursor: "pointer"
                }}
              >
                {countdown.showOnToday ? "Visible" : "Hidden"}
              </button>
            </div>
          </div>

          {/* Notes */}
          {countdown.notes ? (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Notes
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                  background: "var(--surface-hover)",
                  padding: 12,
                  borderRadius: 10,
                  whiteSpace: "pre-wrap"
                }}
              >
                {countdown.notes}
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              paddingTop: 14,
              borderTop: "1px solid var(--border)"
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onEdit}
              style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}
            >
              <EditIcon />
              <span>Edit</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onDuplicate}
              style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}
            >
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmDeleteOpen(true)}
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 13,
                color: "var(--danger, #ef4444)"
              }}
            >
              <TrashIcon />
              <span>Delete</span>
            </button>
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
    </div>
  );
}
