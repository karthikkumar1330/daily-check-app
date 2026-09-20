import { useState } from "react";
import type { CountdownGoal } from "../../types";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { formatDateMedium } from "../../utils/dateUtils";
import { CloseIcon, EditIcon, TrashIcon } from "../icons";
import GoalFormModal from "./GoalFormModal";
import ConfirmModal from "../Modals/ConfirmModal";

interface GoalsManagerModalProps {
  onClose: () => void;
}

export default function GoalsManagerModal({ onClose }: GoalsManagerModalProps) {
  const { goals, primaryGoal, createGoal, updateGoal, deleteGoal, setPrimaryGoal } = useCountdownGoals();
  const [formMode, setFormMode] = useState<"none" | "create" | CountdownGoal>("none");
  const [confirmDelete, setConfirmDelete] = useState<CountdownGoal | null>(null);

  useBodyScrollLock(true);

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal goals-modal" role="dialog" aria-modal="true" aria-labelledby="goals-manager-title">
        <div className="modal-header">
          <h2 id="goals-manager-title">Countdown Goals</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <p className="modal-subtitle">
          Select which goal is featured on your Today page.
        </p>

        {goals.length === 0 ? (
          <div className="empty-state" style={{ margin: "16px 0" }}>
            <div className="empty-state-icon" aria-hidden="true">
              🎯
            </div>
            <div className="empty-state-title">No countdown goals yet</div>
            <div className="empty-state-subtitle">Create your first goal below.</div>
          </div>
        ) : (
          <div className="goal-manage-list">
            {goals.map((g) => {
              const isPrimary = primaryGoal?.id === g.id;
              return (
                <div key={g.id} className={`goal-manage-row ${isPrimary ? "is-primary" : ""}`}>
                  <label className="goal-manage-primary" title="Set as primary Today goal">
                    <input
                      type="radio"
                      name="primary-goal"
                      checked={isPrimary}
                      onChange={() => setPrimaryGoal(g.id)}
                      aria-label={`Set "${g.title}" as the primary Today goal`}
                    />
                  </label>
                  <div
                    className="goal-manage-text"
                    onClick={() => setPrimaryGoal(g.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="goal-manage-title-row">
                      <span className="goal-manage-title">
                        {g.icon} {g.title}
                      </span>
                      {isPrimary ? <span className="primary-pill">Primary</span> : null}
                    </div>
                    <div className="goal-manage-dates">
                      {formatDateMedium(g.startDate)} &rarr; {formatDateMedium(g.targetDate)}
                    </div>
                  </div>
                  <div className="goal-manage-actions">
                    <button
                      className="icon-btn"
                      onClick={() => setFormMode(g)}
                      aria-label={`Edit "${g.title}"`}
                      title="Edit goal"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="icon-btn danger-hover"
                      onClick={() => setConfirmDelete(g)}
                      aria-label={`Delete "${g.title}"`}
                      title="Delete goal"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className="btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => setFormMode("create")}>
          + New Goal
        </button>
      </div>

      {formMode !== "none" ? (
        <GoalFormModal
          goal={formMode === "create" ? undefined : formMode}
          onSubmit={(input) => {
            const result = formMode === "create" ? createGoal(input) : updateGoal(formMode.id, input);
            if (result.ok) setFormMode("none");
            return result;
          }}
          onCancel={() => setFormMode("none")}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmModal
          title="Delete this goal?"
          message={`"${confirmDelete.title}" will be permanently removed. This can’t be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteGoal(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </div>
  );
}
