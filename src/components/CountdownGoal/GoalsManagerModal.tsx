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
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="goals-manager-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 id="goals-manager-title" style={{ margin: 0 }}>
            Countdown Goals
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {goals.length === 0 ? (
          <p className="settings-note">No countdown goals yet. Create one to see it on Today.</p>
        ) : (
          <div className="goal-manage-list">
            {goals.map((g) => (
              <div key={g.id} className="goal-manage-row">
                <label className="goal-manage-primary" title="Set as primary Today goal">
                  <input
                    type="radio"
                    name="primary-goal"
                    checked={primaryGoal?.id === g.id}
                    onChange={() => setPrimaryGoal(g.id)}
                    aria-label={`Set "${g.title}" as the primary Today goal`}
                  />
                </label>
                <div className="goal-manage-text">
                  <div className="goal-manage-title">
                    {g.icon} {g.title}
                  </div>
                  <div className="goal-manage-dates">
                    {formatDateMedium(g.startDate)} {"\u2192"} {formatDateMedium(g.targetDate)}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setFormMode(g)} aria-label={`Edit "${g.title}"`}>
                  <EditIcon />
                </button>
                <button className="icon-btn" onClick={() => setConfirmDelete(g)} aria-label={`Delete "${g.title}"`}>
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn-ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setFormMode("create")}>
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
          message={`"${confirmDelete.title}" will be permanently removed. This can\u2019t be undone.`}
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
