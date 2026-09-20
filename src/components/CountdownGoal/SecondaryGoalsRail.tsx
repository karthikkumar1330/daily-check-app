import { useTodayDate } from "../../hooks/useTodayDate";
import type { CountdownGoal } from "../../types";
import { computeCountdownStatus } from "../../utils/countdownUtils";
import { formatDateMedium } from "../../utils/dateUtils";

interface SecondaryGoalsRailProps {
  goals: CountdownGoal[];
  primaryGoalId: string | null;
  onSetPrimary: (id: string) => void;
  onOpenManage: () => void;
  onOpenCreate: () => void;
}

export default function SecondaryGoalsRail({
  goals,
  primaryGoalId,
  onSetPrimary,
  onOpenManage,
  onOpenCreate
}: SecondaryGoalsRailProps) {
  const today = useTodayDate();
  const secondaryGoals = goals.filter((g) => g.id !== primaryGoalId);

  if (secondaryGoals.length === 0) {
    return (
      <div className="secondary-goals-prompt">
        <button className="link-btn secondary-add-btn" onClick={onOpenCreate}>
          + Add another countdown goal
        </button>
      </div>
    );
  }

  return (
    <div className="secondary-goals-container">
      <div className="secondary-goals-head">
        <div className="secondary-goals-title">
          Other Goals <span className="badge-count">{secondaryGoals.length}</span>
        </div>
        <div className="secondary-goals-actions">
          <button className="link-btn" onClick={onOpenCreate}>
            + Goal
          </button>
          <span className="dot-sep" aria-hidden="true">
            &middot;
          </span>
          <button className="link-btn" onClick={onOpenManage}>
            Manage all
          </button>
        </div>
      </div>

      <div className="secondary-goals-rail" role="region" aria-label="Secondary countdown goals">
        {secondaryGoals.map((goal) => {
          const status = computeCountdownStatus(goal, today);
          let badgeText = "";
          let badgeClass = "badge-active";

          if (status.phase === "upcoming") {
            badgeText = `${status.daysUntilStart}d until start`;
            badgeClass = "badge-upcoming";
          } else if (status.phase === "complete") {
            badgeText = "Completed";
            badgeClass = "badge-complete";
          } else {
            badgeText = `${status.daysLeft} ${status.daysLeft === 1 ? "day" : "days"} left`;
            badgeClass = "badge-active";
          }

          return (
            <div key={goal.id} className="card secondary-goal-card">
              <div className="sec-card-top">
                <span className="sec-goal-title" title={goal.title}>
                  <span className="sec-goal-icon" aria-hidden="true">
                    {goal.icon}
                  </span>
                  {goal.title}
                </span>
                <span className={`sec-goal-badge ${badgeClass}`}>{badgeText}</span>
              </div>

              <div className="sec-card-dates">
                {formatDateMedium(goal.startDate)} &rarr; {formatDateMedium(goal.targetDate)}
              </div>

              {status.phase !== "upcoming" && (
                <div className="bar-track sec-bar-track">
                  <div className="bar-fill" style={{ width: `${status.progressPct}%` }} />
                </div>
              )}

              <div className="sec-card-bottom">
                <button
                  className="sec-primary-btn"
                  onClick={() => onSetPrimary(goal.id)}
                  title={`Make "${goal.title}" your primary Today goal`}
                >
                  Set as primary
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
