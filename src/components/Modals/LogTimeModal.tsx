import { useEffect, useRef, useState } from "react";
import type { Task } from "../../types";
import { formatDuration, calculateDurationPct } from "../../utils/durationUtils";

interface LogTimeModalProps {
  task: Task;
  dateStr: string;
  onLogDelta: (minutes: number) => void;
  onSetTotal: (totalMinutes: number) => void;
  onClose: () => void;
}

export default function LogTimeModal({
  task,
  onLogDelta,
  onSetTotal,
  onClose
}: LogTimeModalProps) {
  const [customDelta, setCustomDelta] = useState<string>("30");
  const [mode, setMode] = useState<"add" | "set">("add");
  const [setMinutes, setSetMinutes] = useState<string>(
    String(task.durationCompletedMinutes || 0)
  );
  const modalRef = useRef<HTMLDivElement>(null);

  const target = task.durationTargetMinutes || 60;
  const current = task.durationCompletedMinutes || 0;
  const currentPct = calculateDurationPct(current, target);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleQuickAdd(mins: number) {
    onLogDelta(mins);
    onClose();
  }

  function handleApplyCustomAdd(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(customDelta, 10);
    if (!isNaN(val) && val > 0) {
      onLogDelta(val);
      onClose();
    }
  }

  function handleApplySetTotal(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(setMinutes, 10);
    if (!isNaN(val) && val >= 0) {
      onSetTotal(val);
      onClose();
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-time-title"
      onClick={onClose}
    >
      <div
        className="modal-card log-time-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440 }}
      >
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 id="log-time-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>
            Log Time
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close log time modal"
            style={{ minHeight: 36, minWidth: 36 }}
          >
            ✕
          </button>
        </div>

        {/* Task Summary Card */}
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--surface-subtle, rgba(0,0,0,0.03))",
            border: "1px solid var(--border)",
            marginBottom: 16
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)", marginBottom: 6 }}>
            {task.title}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--ink-muted)", marginBottom: 4 }}>
            <span>
              {formatDuration(current)} / {formatDuration(target)}
            </span>
            <span style={{ fontWeight: 600, color: current >= target ? "var(--accent, #10b981)" : "var(--ink)" }}>
              {currentPct}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={current}
            aria-label={`Progress: ${currentPct}%`}
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--border, rgba(0,0,0,0.1))",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width: `${currentPct}%`,
                height: "100%",
                background: current >= target ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
                borderRadius: 3
              }}
            />
          </div>
        </div>

        {/* Mode Toggle: Quick Add vs Set Exact */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={"chip-btn" + (mode === "add" ? " active" : "")}
            onClick={() => setMode("add")}
            style={{ flex: 1, textAlign: "center", padding: "8px 12px" }}
          >
            + Add Time
          </button>
          <button
            type="button"
            className={"chip-btn" + (mode === "set" ? " active" : "")}
            onClick={() => setMode("set")}
            style={{ flex: 1, textAlign: "center", padding: "8px 12px" }}
          >
            Set Total
          </button>
        </div>

        {mode === "add" ? (
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-muted)", marginBottom: 8 }}>
              Quick Presets
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => handleQuickAdd(mins)}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    padding: "8px 4px",
                    minHeight: 44,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  +{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>

            <form onSubmit={handleApplyCustomAdd} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="custom-mins-input" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-muted)" }}>
                Custom Minutes to Add
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  id="custom-mins-input"
                  type="number"
                  min="1"
                  max="720"
                  value={customDelta}
                  onChange={(e) => setCustomDelta(e.target.value)}
                  className="form-input"
                  style={{ width: 120, padding: "8px 12px" }}
                  placeholder="Minutes"
                />
                <button
                  type="submit"
                  className="btn primary-btn"
                  style={{ flex: 1, minHeight: 44, fontWeight: 600 }}
                >
                  Log +{customDelta || 0}m
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleApplySetTotal} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label htmlFor="set-total-input" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-muted)" }}>
              Directly Set Total Completed Minutes (0 to {target}m)
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                id="set-total-input"
                type="number"
                min="0"
                max={target * 2}
                value={setMinutes}
                onChange={(e) => setSetMinutes(e.target.value)}
                className="form-input"
                style={{ width: 120, padding: "8px 12px" }}
              />
              <span style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
                = {formatDuration(parseInt(setMinutes, 10) || 0)}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => {
                  onSetTotal(0);
                  onClose();
                }}
                style={{ flex: 1, minHeight: 44 }}
              >
                Reset to 0m
              </button>
              <button
                type="submit"
                className="btn primary-btn"
                style={{ flex: 1, minHeight: 44, fontWeight: 600 }}
              >
                Save Total
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
