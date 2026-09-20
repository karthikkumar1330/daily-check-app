import { useEffect, useRef, useState } from "react";
import type { CountdownGoal } from "../../types";
import type { NewGoalInput } from "../../hooks/useCountdownGoals";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { todayStr } from "../../utils/dateUtils";

const ICON_CHOICES = ["\uD83C\uDFAF", "\uD83D\uDCDA", "\uD83D\uDCAA", "\uD83C\uDF93", "\uD83D\uDCCC", "\u2728"];

interface GoalFormModalProps {
  goal?: CountdownGoal;
  onSubmit: (input: NewGoalInput) => { ok: boolean; error?: string };
  onCancel: () => void;
}

export default function GoalFormModal({ goal, onSubmit, onCancel }: GoalFormModalProps) {
  const isEdit = !!goal;
  const [title, setTitle] = useState(goal?.title ?? "");
  const [startDate, setStartDate] = useState(goal?.startDate ?? todayStr());
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? todayStr());
  const [icon, setIcon] = useState(goal?.icon ?? ICON_CHOICES[0]);
  const [description, setDescription] = useState(goal?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    titleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit() {
    const result = onSubmit({ title, startDate, targetDate, icon, description });
    if (!result.ok) {
      setError(result.error || "Couldn't save this goal.");
      return;
    }
  }

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
        <h2 id="goal-modal-title">{isEdit ? "Edit Goal" : "New Countdown Goal"}</h2>

        <label className="field-label" htmlFor="goal-title">
          Goal name
        </label>
        <input
          id="goal-title"
          ref={titleRef}
          type="text"
          className="modal-input"
          maxLength={60}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />

        <div className="field-label">Icon</div>
        <div className="radio-row" role="radiogroup" aria-label="Icon">
          {ICON_CHOICES.map((emoji) => (
            <label key={emoji} className="radio-pill" style={{ flex: "none", padding: "9px 12px" }}>
              <input
                type="radio"
                name="goal-icon"
                checked={icon === emoji}
                onChange={() => setIcon(emoji)}
                style={{ display: "none" }}
              />
              <span aria-hidden="true">{emoji}</span>
            </label>
          ))}
        </div>

        <div className="edit-row" style={{ marginTop: 4 }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="field-label" htmlFor="goal-start">
              Start date
            </label>
            <input
              id="goal-start"
              type="date"
              className="modal-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="field-label" htmlFor="goal-target">
              Target date
            </label>
            <input
              id="goal-target"
              type="date"
              className="modal-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        <label className="field-label" htmlFor="goal-description">
          Description (optional)
        </label>
        <textarea
          id="goal-description"
          className="modal-input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error ? (
          <p role="alert" style={{ color: "var(--red)", fontSize: 13, margin: "10px 0 0" }}>
            {error}
          </p>
        ) : null}

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            {isEdit ? "Save Changes" : "Create Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
