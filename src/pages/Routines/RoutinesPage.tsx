import { useState } from "react";
import { useRoutines } from "../../hooks/useRoutines";
import { useTasks } from "../../hooks/useTasks";
import { todayStr } from "../../utils/dateUtils";
import { categoryMeta } from "../../utils/taskUtils";
import { DEFAULT_ROUTINES } from "../../utils/routineStorage";
import type { Routine } from "../../types";
import RoutineEditorModal from "../../components/Routines/RoutineEditorModal";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import EmptyState from "../../components/EmptyState/EmptyState";
import { CheckIcon, EditIcon, PlusIcon, TrashIcon } from "../../components/icons";

export default function RoutinesPage() {
  const { routines, createRoutine, updateRoutine, deleteRoutine, applyRoutineToDate, isRoutineAppliedOnDate, replaceAllRoutines } = useRoutines();
  const { getDay } = useTasks();

  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Routine | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState<Routine | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const today = todayStr();
  const todayDay = getDay(today);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function handleApply(routine: Routine) {
    const isApplied = isRoutineAppliedOnDate(routine.id, todayDay.tasks);
    if (isApplied) {
      setConfirmDuplicate(routine);
      return;
    }

    const res = applyRoutineToDate(routine.id, today);
    if (res.ok) {
      showToast(`Added ${res.count} tasks from "${routine.name}" to Today.`);
    }
  }

  function handleForceApply() {
    if (!confirmDuplicate) return;
    const res = applyRoutineToDate(confirmDuplicate.id, today, { force: true });
    if (res.ok) {
      showToast(`Added ${res.count} tasks from "${confirmDuplicate.name}" to Today.`);
    }
    setConfirmDuplicate(null);
  }

  function handleLoadDefaults() {
    const seeded: Record<string, Routine> = {};
    for (const def of DEFAULT_ROUTINES) {
      seeded[def.id] = { ...def, createdAt: Date.now(), updatedAt: Date.now() };
    }
    replaceAllRoutines({ version: 1, routines: seeded });
    showToast("Loaded starter routines.");
  }

  return (
    <div className="page routines-page" style={{ paddingBottom: 64 }}>
      <div
        className="section-row"
        style={{
          margin: "0 0 4px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Daily Routines
          </h1>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreating(true)}
          style={{ minHeight: 44, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <PlusIcon />
          <span>New Routine</span>
        </button>
      </div>

      <p className="page-subtitle" style={{ marginTop: 0, marginBottom: 20 }}>
        Reusable task templates to populate your daily checklist in one tap.
      </p>

      {routines.length === 0 ? (
        <div className="card" style={{ padding: "32px 20px", textAlign: "center" }}>
          <EmptyState
            variant="custom"
            icon="📋"
            title="No routines yet."
            subtitle="Create custom daily templates for study plans, workouts, or morning rituals."
          />
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCreating(true)}
              style={{ minHeight: 44, padding: "0 18px" }}
            >
              + Create Routine
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLoadDefaults}
              style={{ minHeight: 44, padding: "0 18px" }}
            >
              Load Example Templates
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16
          }}
        >
          {routines.map((routine) => {
            const isAppliedToday = isRoutineAppliedOnDate(routine.id, todayDay.tasks);
            return (
              <div
                key={routine.id}
                className="card routine-card"
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md, 12px)",
                  background: "var(--surface)",
                  position: "relative"
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "var(--radius-sm, 8px)",
                        background: "var(--surface-sunken, rgba(0,0,0,0.04))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0
                      }}
                      aria-hidden="true"
                    >
                      {routine.icon || "📋"}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                        {routine.name}
                      </h2>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                        {routine.tasks.length} task{routine.tasks.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setEditingRoutine(routine)}
                      aria-label={`Edit ${routine.name}`}
                      title="Edit routine"
                      style={{ width: 36, height: 36 }}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setConfirmDelete(routine)}
                      aria-label={`Delete ${routine.name}`}
                      title="Delete routine"
                      style={{ width: 36, height: 36, color: "var(--danger, #ef4444)" }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                {/* Tasks Preview */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    margin: "4px 0 16px",
                    background: "var(--surface-sunken, rgba(0,0,0,0.02))",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)"
                  }}
                >
                  {routine.tasks.map((t, idx) => {
                    const cat = categoryMeta(t.category);
                    return (
                      <div
                        key={t.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 13,
                          padding: "3px 0"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                          <span style={{ color: "var(--ink-muted)", fontSize: 11, width: 14 }}>
                            {idx + 1}.
                          </span>
                          <span
                            style={{
                              fontWeight: 500,
                              color: "var(--ink)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {t.title}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {cat.id ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "1px 6px",
                                borderRadius: 6,
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                color: "var(--ink-muted)"
                              }}
                            >
                              {cat.emoji} {cat.label}
                            </span>
                          ) : null}

                          {t.priority === 1 ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "var(--danger, #ef4444)"
                              }}
                            >
                              HIGH
                            </span>
                          ) : null}

                          {t.dueTime ? (
                            <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                              🕒 {t.dueTime}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Action */}
                <div style={{ marginTop: "auto" }}>
                  <button
                    type="button"
                    className={`btn ${isAppliedToday ? "btn-secondary" : "btn-primary"}`}
                    onClick={() => handleApply(routine)}
                    style={{
                      width: "100%",
                      minHeight: 44,
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      gap: 6
                    }}
                    aria-label={`Apply ${routine.name} to Today`}
                  >
                    {isAppliedToday ? (
                      <>
                        <CheckIcon />
                        <span>Applied to Today (Add Again)</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon />
                        <span>Apply to Today ({routine.tasks.length} tasks)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal for Create / Edit */}
      {isCreating ? (
        <RoutineEditorModal
          onSave={(data) => {
            const res = createRoutine(data);
            if (res.ok) {
              setIsCreating(false);
              showToast(`Created routine "${data.name}".`);
            }
            return res;
          }}
          onCancel={() => setIsCreating(false)}
        />
      ) : null}

      {editingRoutine ? (
        <RoutineEditorModal
          routine={editingRoutine}
          onSave={(data) => {
            const res = updateRoutine(editingRoutine.id, data);
            if (res.ok) {
              setEditingRoutine(null);
              showToast(`Updated routine "${data.name}".`);
            }
            return res;
          }}
          onCancel={() => setEditingRoutine(null)}
        />
      ) : null}

      {/* Confirm Delete Routine Modal */}
      {confirmDelete ? (
        <ConfirmModal
          title={`Delete "${confirmDelete.name}"?`}
          message="This template will be removed. Any tasks previously created from this routine on your checklists will remain intact."
          confirmLabel="Delete Routine"
          danger
          onConfirm={() => {
            deleteRoutine(confirmDelete.id);
            setConfirmDelete(null);
            showToast(`Deleted routine "${confirmDelete.name}".`);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}

      {/* Confirm Duplicate Application */}
      {confirmDuplicate ? (
        <ConfirmModal
          title="Apply Routine Again?"
          message={`Tasks from "${confirmDuplicate.name}" are already in today's checklist. Would you like to add another set of these tasks?`}
          confirmLabel="Add Again"
          onConfirm={handleForceApply}
          onCancel={() => setConfirmDuplicate(null)}
        />
      ) : null}

      {/* Toast */}
      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
