import { useFocusTimer } from "../../hooks/useFocusTimer";
import { formatDuration, formatTimerClock } from "../../utils/durationUtils";

export default function ActiveFocusBar() {
  const {
    session,
    isRunning,
    remainingSeconds,
    pct,
    currentCompletedMinutes,
    isTargetReached,
    pauseFocus,
    resumeFocus,
    stopFocus,
    addQuickMinutes,
    toggleMinimized
  } = useFocusTimer();

  if (!session) return null;

  if (session.isMinimized) {
    return (
      <aside
        className="active-focus-minimized"
        aria-label="Active Focus Session"
        style={{
          position: "fixed",
          bottom: 74,
          right: 16,
          zIndex: 90,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)",
          borderRadius: 24,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          maxWidth: "calc(100vw - 32px)"
        }}
        onClick={toggleMinimized}
      >
        <span aria-hidden="true" style={{ fontSize: "1rem" }}>🎯</span>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--ink)",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {session.taskTitle}
        </span>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: isTargetReached ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
            fontVariantNumeric: "tabular-nums"
          }}
        >
          {isTargetReached ? "100%" : formatTimerClock(remainingSeconds)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isRunning) pauseFocus();
            else resumeFocus();
          }}
          aria-label={isRunning ? "Pause focus" : "Resume focus"}
          style={{
            background: "none",
            border: "none",
            color: "var(--ink)",
            cursor: "pointer",
            fontSize: "0.9rem",
            padding: 2
          }}
        >
          {isRunning ? "⏸" : "▶"}
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={"active-focus-bar" + (isTargetReached ? " target-reached" : "")}
      aria-label="Active Focus Session"
      style={{
        position: "fixed",
        bottom: 70,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(560px, calc(100vw - 24px))",
        zIndex: 90,
        background: "var(--surface)",
        border: "1.5px solid var(--accent, #10b981)",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>🎯</span>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {session.taskTitle}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              color: isTargetReached ? "var(--accent, #10b981)" : "var(--teal, #0d9488)"
            }}
          >
            {isTargetReached ? "✓ Target Reached!" : `${formatTimerClock(remainingSeconds)} left`}
          </span>

          <button
            type="button"
            onClick={toggleMinimized}
            aria-label="Minimize focus timer"
            title="Minimize"
            style={{
              background: "none",
              border: "none",
              color: "var(--ink-muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              padding: "4px 6px"
            }}
          >
            ⎯
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--ink-muted)" }}>
          <span>
            {formatDuration(currentCompletedMinutes)} / {formatDuration(session.targetMinutes)}
          </span>
          <span style={{ fontWeight: 600, color: isTargetReached ? "var(--accent, #10b981)" : "var(--ink)" }}>
            {pct}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={session.targetMinutes}
          aria-valuenow={currentCompletedMinutes}
          aria-label={`Focus progress: ${pct}%`}
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
              transition: "width 0.2s ease"
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="btn secondary-btn"
            onClick={isRunning ? pauseFocus : resumeFocus}
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              padding: "6px 12px",
              minHeight: 36,
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <span>{isRunning ? "⏸ Pause" : "▶ Resume"}</span>
          </button>

          <button
            type="button"
            className="btn text-btn"
            onClick={() => addQuickMinutes(15)}
            title="Log 15 minutes of progress directly"
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "6px 10px",
              minHeight: 36
            }}
          >
            +15m
          </button>
        </div>

        <button
          type="button"
          className="btn primary-btn"
          onClick={stopFocus}
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            padding: "6px 14px",
            minHeight: 36
          }}
        >
          {isTargetReached ? "Done" : "Finish Focus"}
        </button>
      </div>
    </aside>
  );
}
