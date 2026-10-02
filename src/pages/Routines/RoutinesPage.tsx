import { useEffect, useMemo, useRef, useState } from "react";
import { useRoutines } from "../../hooks/useRoutines";
import { useTasks } from "../../hooks/useTasks";
import { todayStr } from "../../utils/dateUtils";
import { categoryMeta } from "../../utils/taskUtils";
import { DEFAULT_ROUTINES } from "../../utils/routineStorage";
import type { Routine } from "../../types";
import RoutineEditorModal from "../../components/Routines/RoutineEditorModal";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import { CheckIcon, EditIcon, PlusIcon, TrashIcon } from "../../components/icons";

export default function RoutinesPage() {
  const {
    routines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    applyRoutineToDate,
    isRoutineAppliedOnDate,
    replaceAllRoutines
  } = useRoutines();
  const { getDay } = useTasks();

  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Routine | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState<Routine | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedTasksId, setExpandedTasksId] = useState<string | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const today = todayStr();
  const todayDay = getDay(today);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3200);
  }

  // Listen to Global Header + New button event
  useEffect(() => {
    function handleOpenCreate() {
      setIsCreating(true);
    }
    window.addEventListener("open-routine-create", handleOpenCreate);
    return () => window.removeEventListener("open-routine-create", handleOpenCreate);
  }, []);

  // Close kebab menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

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

  // Count applied routines today
  const appliedCount = useMemo(() => {
    return routines.filter((r) => isRoutineAppliedOnDate(r.id, todayDay.tasks)).length;
  }, [routines, todayDay.tasks, isRoutineAppliedOnDate]);

  // Split routines into Applied Today vs Available Routines
  const { appliedRoutines, availableRoutines } = useMemo(() => {
    const applied: Routine[] = [];
    const available: Routine[] = [];
    for (const r of routines) {
      if (isRoutineAppliedOnDate(r.id, todayDay.tasks)) {
        applied.push(r);
      } else {
        available.push(r);
      }
    }
    return { appliedRoutines: applied, availableRoutines: available };
  }, [routines, todayDay.tasks, isRoutineAppliedOnDate]);

  function formatRoutineMetadata(routine: Routine) {
    const categories = Array.from(
      new Set(
        routine.tasks
          .map((t) => categoryMeta(t.category).label)
          .filter((l) => l && l !== "Other")
      )
    ).slice(0, 2);

    const times = routine.tasks
      .map((t) => t.dueTime)
      .filter((time): time is string => Boolean(time))
      .sort();

    return {
      categoriesText: categories.length > 0 ? categories.join(", ") : null,
      earliestTime: times.length > 0 ? times[0] : null
    };
  }

  return (
    <div className="page routines-page" ref={menuContainerRef}>
      {/* 1. Compact Context Row (when routines exist) */}
      {routines.length > 0 && (
        <div className="routines-context-bar" role="region" aria-label="Routines overview">
          <div className="routines-context-left">
            <span className="routines-context-title">Daily Routines</span>
            <span className="routines-context-sub">
              {appliedCount > 0
                ? `${appliedCount} applied today · ${routines.length - appliedCount} ready`
                : `${routines.length} ${routines.length === 1 ? "routine" : "routines"} ready to apply`}
            </span>
          </div>
        </div>
      )}

      {/* 2. Empty State */}
      {routines.length === 0 ? (
        <div className="routines-empty-card" role="region" aria-label="No routines yet">
          <div className="routines-empty-icon" aria-hidden="true">📋</div>
          <div className="routines-empty-title">No routines yet</div>
          <div className="routines-empty-desc">
            Create custom daily templates for study plans, workouts, or morning rituals to populate your checklist in one tap.
          </div>
          <div className="routines-empty-actions">
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
        <>
          {/* 3. Applied Today Section (if any) */}
          {appliedRoutines.length > 0 && (
            <section className="routines-section" aria-label="Applied Today">
              <div className="routines-section-label">Applied Today</div>
              <div className="routines-list">
                {appliedRoutines.map((routine) => (
                  <RoutineCardItem
                    key={routine.id}
                    routine={routine}
                    isAppliedToday={true}
                    onApply={() => handleApply(routine)}
                    onEdit={() => setEditingRoutine(routine)}
                    onDelete={() => setConfirmDelete(routine)}
                    isMenuOpen={openMenuId === routine.id}
                    onToggleMenu={() => setOpenMenuId((curr) => (curr === routine.id ? null : routine.id))}
                    isTasksExpanded={expandedTasksId === routine.id}
                    onToggleTasks={() => setExpandedTasksId((curr) => (curr === routine.id ? null : routine.id))}
                    metadata={formatRoutineMetadata(routine)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 4. Available / All Routines Section */}
          <section className="routines-section" aria-label={appliedRoutines.length > 0 ? "Available Routines" : "All Routines"}>
            <div className="routines-section-label">
              {appliedRoutines.length > 0 ? "Available Routines" : "Routines"}
            </div>
            <div className="routines-list">
              {availableRoutines.map((routine) => (
                <RoutineCardItem
                  key={routine.id}
                  routine={routine}
                  isAppliedToday={false}
                  onApply={() => handleApply(routine)}
                  onEdit={() => setEditingRoutine(routine)}
                  onDelete={() => setConfirmDelete(routine)}
                  isMenuOpen={openMenuId === routine.id}
                  onToggleMenu={() => setOpenMenuId((curr) => (curr === routine.id ? null : routine.id))}
                  isTasksExpanded={expandedTasksId === routine.id}
                  onToggleTasks={() => setExpandedTasksId((curr) => (curr === routine.id ? null : routine.id))}
                  metadata={formatRoutineMetadata(routine)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Editor Modal for Create / Edit */}
      {isCreating && (
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
      )}

      {editingRoutine && (
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
      )}

      {/* Confirm Delete Routine Modal */}
      {confirmDelete && (
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
      )}

      {/* Confirm Duplicate Application */}
      {confirmDuplicate && (
        <ConfirmModal
          title="Apply Routine Again?"
          message={`Tasks from "${confirmDuplicate.name}" are already in today's checklist. Would you like to add another set of these tasks?`}
          confirmLabel="Add Again"
          onConfirm={handleForceApply}
          onCancel={() => setConfirmDuplicate(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

interface RoutineCardItemProps {
  routine: Routine;
  isAppliedToday: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  isTasksExpanded: boolean;
  onToggleTasks: () => void;
  metadata: {
    categoriesText: string | null;
    earliestTime: string | null;
  };
}

function RoutineCardItem({
  routine,
  isAppliedToday,
  onApply,
  onEdit,
  onDelete,
  isMenuOpen,
  onToggleMenu,
  isTasksExpanded,
  onToggleTasks,
  metadata
}: RoutineCardItemProps) {
  return (
    <div className={`routine-card-item${isAppliedToday ? " is-applied" : ""}`}>
      <div className="routine-card-header">
        <div className="routine-card-left">
          <div className="routine-icon-avatar" aria-hidden="true">
            {routine.icon || "📋"}
          </div>
          <div className="routine-card-info">
            <div className="routine-title-row">
              <h3 className="routine-name">{routine.name}</h3>
              {isAppliedToday ? (
                <span className="routine-status-badge badge-active">Applied Today</span>
              ) : (
                <span className="routine-status-badge badge-ready">Ready to apply</span>
              )}
            </div>
            <div className="routine-meta-row">
              <span>{routine.tasks.length} {routine.tasks.length === 1 ? "task" : "tasks"}</span>
              {metadata.categoriesText && (
                <>
                  <span className="routine-meta-dot" aria-hidden="true">·</span>
                  <span>{metadata.categoriesText}</span>
                </>
              )}
              {metadata.earliestTime && (
                <>
                  <span className="routine-meta-dot" aria-hidden="true">·</span>
                  <span>🕒 {metadata.earliestTime}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="routine-card-actions">
          <button
            type="button"
            className={`btn ${isAppliedToday ? "btn-secondary" : "btn-primary"} routine-apply-btn`}
            onClick={onApply}
            aria-label={isAppliedToday ? `Add ${routine.name} again to Today` : `Apply ${routine.name} to Today`}
          >
            {isAppliedToday ? (
              <>
                <CheckIcon />
                <span>Applied</span>
              </>
            ) : (
              <>
                <PlusIcon />
                <span>Apply</span>
              </>
            )}
          </button>

          <div className="routine-kebab-container">
            <button
              type="button"
              className="icon-btn routine-kebab-btn"
              onClick={onToggleMenu}
              aria-label={`Options for ${routine.name}`}
              aria-expanded={isMenuOpen}
            >
              ⋯
            </button>
            {isMenuOpen && (
              <div className="routine-dropdown-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="routine-dropdown-item"
                  onClick={() => {
                    onToggleMenu();
                    onEdit();
                  }}
                >
                  <EditIcon />
                  <span>Edit routine</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="routine-dropdown-item"
                  onClick={() => {
                    onToggleMenu();
                    onToggleTasks();
                  }}
                >
                  <span aria-hidden="true">📋</span>
                  <span>{isTasksExpanded ? "Hide tasks" : "View tasks"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="routine-dropdown-item danger"
                  onClick={() => {
                    onToggleMenu();
                    onDelete();
                  }}
                >
                  <TrashIcon />
                  <span>Delete routine</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Tasks Preview */}
      {isTasksExpanded && (
        <div className="routine-tasks-preview" role="region" aria-label={`Tasks in ${routine.name}`}>
          {routine.tasks.map((t, idx) => {
            const cat = categoryMeta(t.category);
            return (
              <div key={t.id || idx} className="routine-task-preview-row">
                <div className="routine-task-preview-left">
                  <span className="routine-task-num">{idx + 1}.</span>
                  <span className="routine-task-title">{t.title}</span>
                </div>
                <div className="routine-task-tags">
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
      )}
    </div>
  );
}
