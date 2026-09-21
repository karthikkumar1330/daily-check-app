import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoutines } from "../../hooks/useRoutines";
import { useTasks } from "../../hooks/useTasks";
import type { Routine } from "../../types";
import ConfirmModal from "../Modals/ConfirmModal";
import RoutineEditorModal from "./RoutineEditorModal";

interface TodayRoutinesBarProps {
  viewDate: string;
  onToast?: (msg: string) => void;
}

export default function TodayRoutinesBar({ viewDate, onToast }: TodayRoutinesBarProps) {
  const { routines, applyRoutineToDate, isRoutineAppliedOnDate, createRoutine } = useRoutines();
  const { getDay } = useTasks();
  const navigate = useNavigate();

  const [confirmDuplicateRoutine, setConfirmDuplicateRoutine] = useState<Routine | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const day = getDay(viewDate);

  if (routines.length === 0) {
    return (
      <div className="routines-bar-wrapper" style={{ margin: "12px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "var(--ink-muted)", textTransform: "uppercase" }}>
            Daily Routines
          </span>
          <button
            type="button"
            className="link-btn"
            onClick={() => setCreateModalOpen(true)}
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            + Create Routine
          </button>
        </div>
        {createModalOpen ? (
          <RoutineEditorModal
            onSave={(data) => {
              const res = createRoutine(data);
              if (res.ok) {
                setCreateModalOpen(false);
                if (onToast) onToast(`Created routine "${data.name}".`);
              }
              return res;
            }}
            onCancel={() => setCreateModalOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  function handleRoutineClick(routine: Routine) {
    const isApplied = isRoutineAppliedOnDate(routine.id, day.tasks);
    if (isApplied) {
      setConfirmDuplicateRoutine(routine);
      return;
    }

    const res = applyRoutineToDate(routine.id, viewDate);
    if (res.ok) {
      if (onToast) {
        onToast(`Added ${res.count} task${res.count === 1 ? "" : "s"} from ${routine.name}.`);
      }
    }
  }

  function handleForceApply() {
    if (!confirmDuplicateRoutine) return;
    const res = applyRoutineToDate(confirmDuplicateRoutine.id, viewDate, { force: true });
    if (res.ok && onToast) {
      onToast(`Added ${res.count} task${res.count === 1 ? "" : "s"} from ${confirmDuplicateRoutine.name}.`);
    }
    setConfirmDuplicateRoutine(null);
  }

  return (
    <div
      className="routines-bar-wrapper"
      style={{
        margin: "12px 0 18px",
        padding: "10px 12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md, 12px)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.03em", color: "var(--ink-muted)", textTransform: "uppercase" }}>
            Routines
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
            Tap to apply to checklist
          </span>
        </div>
        <button
          type="button"
          className="link-btn"
          onClick={() => navigate("/routines")}
          style={{ fontSize: 12, fontWeight: 600 }}
          aria-label="Manage all daily routines"
        >
          Manage &rsaquo;
        </button>
      </div>

      <div
        className="routines-pill-scroll"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
          WebkitOverflowScrolling: "touch"
        }}
      >
        {routines.map((r) => {
          const applied = isRoutineAppliedOnDate(r.id, day.tasks);
          return (
            <button
              key={r.id}
              type="button"
              className={`chip ${applied ? "active" : ""}`}
              onClick={() => handleRoutineClick(r)}
              title={applied ? `"${r.name}" tasks are already in today's list (click to re-add)` : `Apply "${r.name}" (${r.tasks.length} tasks)`}
              aria-label={`Apply routine ${r.name} with ${r.tasks.length} tasks`}
              style={{
                minHeight: 44,
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                borderRadius: 20
              }}
            >
              <span aria-hidden="true">{r.icon || "📋"}</span>
              <span>{r.name}</span>
              {applied ? (
                <span
                  style={{
                    fontSize: 11,
                    background: "rgba(255, 255, 255, 0.25)",
                    padding: "1px 5px",
                    borderRadius: 10,
                    marginLeft: 2
                  }}
                  aria-label="Already applied"
                >
                  ✓ Added
                </span>
              ) : (
                <span style={{ fontSize: 11, opacity: 0.75 }}>
                  ({r.tasks.length})
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          className="chip"
          onClick={() => setCreateModalOpen(true)}
          style={{
            minHeight: 44,
            padding: "0 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            whiteSpace: "nowrap",
            border: "1px dashed var(--border)",
            background: "transparent",
            color: "var(--ink-muted)",
            cursor: "pointer",
            borderRadius: 20
          }}
          aria-label="Create new routine template"
        >
          <span>+ New</span>
        </button>
      </div>

      {confirmDuplicateRoutine ? (
        <ConfirmModal
          title="Apply Routine Again?"
          message={`Tasks from \u201c${confirmDuplicateRoutine.name}\u201d have already been added to this day\u2019s checklist. Would you like to add another copy of these tasks?`}
          confirmLabel="Add Again"
          onConfirm={handleForceApply}
          onCancel={() => setConfirmDuplicateRoutine(null)}
        />
      ) : null}

      {createModalOpen ? (
        <RoutineEditorModal
          onSave={(data) => {
            const res = createRoutine(data);
            if (res.ok) {
              setCreateModalOpen(false);
              if (onToast) onToast(`Created routine "${data.name}".`);
            }
            return res;
          }}
          onCancel={() => setCreateModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
