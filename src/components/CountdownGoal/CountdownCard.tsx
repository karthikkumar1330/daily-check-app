import { useState } from "react";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import { useTodayDate } from "../../hooks/useTodayDate";
import { computeCountdownStatus } from "../../utils/countdownUtils";
import { formatDateMedium } from "../../utils/dateUtils";
import GoalsManagerModal from "./GoalsManagerModal";

export default function CountdownCard() {
  const { primaryGoal, goals } = useCountdownGoals();
  const today = useTodayDate();
  const [managerOpen, setManagerOpen] = useState(false);

  if (!primaryGoal) {
    return (
      <>
        <button className="link-btn countdown-add-link" onClick={() => setManagerOpen(true)}>
          + Add a countdown goal
        </button>
        {managerOpen ? <GoalsManagerModal onClose={() => setManagerOpen(false)} /> : null}
      </>
    );
  }

  const status = computeCountdownStatus(primaryGoal, today);
  const dateRange = `${formatDateMedium(primaryGoal.startDate)} \u2192 ${formatDateMedium(primaryGoal.targetDate)}`;
  const manageLabel = goals.length > 1 ? "Manage goals" : "Manage";

  let bigNumber: string;
  let bigLabel: string;
  let srLabel: string;

  if (status.phase === "upcoming") {
    bigNumber = String(status.daysUntilStart);
    bigLabel = status.daysUntilStart === 1 ? "DAY UNTIL START" : "DAYS UNTIL START";
    srLabel = `${primaryGoal.title} starts in ${status.daysUntilStart} day${status.daysUntilStart === 1 ? "" : "s"}.`;
  } else if (status.phase === "complete") {
    bigNumber = "Completed";
    bigLabel = "";
    srLabel = `${primaryGoal.title} is complete.`;
  } else {
    bigNumber = String(status.daysLeft);
    bigLabel = status.daysLeft === 1 ? "DAY LEFT" : "DAYS LEFT";
    srLabel = `${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} remaining in ${primaryGoal.title}.`;
  }

  return (
    <div className="card countdown-card">
      <div className="countdown-head">
        <span className="countdown-title">
          {primaryGoal.icon} {primaryGoal.title}
        </span>
        <button className="link-btn" onClick={() => setManagerOpen(true)}>
          {manageLabel}
        </button>
      </div>

      <div className="countdown-figure" aria-label={srLabel}>
        <div className={"countdown-number" + (status.phase === "complete" ? " countdown-number-complete" : "")}>
          {bigNumber}
        </div>
        {bigLabel ? <div className="countdown-label">{bigLabel}</div> : null}
      </div>

      <div className="countdown-range">{dateRange}</div>

      {status.phase !== "upcoming" ? (
        <div className="bar-track countdown-bar-track">
          <div className="bar-fill" style={{ width: status.progressPct + "%" }} />
        </div>
      ) : null}

      {managerOpen ? <GoalsManagerModal onClose={() => setManagerOpen(false)} /> : null}
    </div>
  );
}
