import { useMemo, useState } from "react";
import type { Task } from "../../types";
import { getTodayPlan } from "../../utils/todayPlannerUtils";
import { categoryMeta, prioClass } from "../../utils/taskUtils";
import { formatTimeDisplay, getTaskScheduleStatus } from "../../utils/scheduleUtils";
import { CheckIcon } from "../icons";

interface TodayPlanSectionProps {
  dateStr: string;
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onToast?: (message: string) => void;
}

export default function TodayPlanSection({
  dateStr,
  tasks,
  onToggleTask
}: TodayPlanSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [highlightActive, setHighlightActive] = useState(false);

  // Deterministically derive ordered plan from active tasks
  const plannedList = useMemo(() => {
    return getTodayPlan(tasks, dateStr);
  }, [tasks, dateStr]);

  const visibleTasks = showAll ? plannedList : plannedList.slice(0, 5);
  const hasMore = plannedList.length > 5;

  function handlePlanMyDay() {
    setHighlightActive(true);
    setShowAll(true);
    setTimeout(() => {
      setHighlightActive(false);
    }, 1800);
  }

  return (
    <section
      className={`card today-plan-section ${highlightActive ? "plan-highlight-active" : ""}`}
      aria-labelledby="today-plan-heading"
      style={{ marginBottom: 16 }}
    >
      <div className="today-plan-header">
        <div className="today-plan-title-block">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 id="today-plan-heading" className="today-plan-title">
              <span aria-hidden="true" className="today-plan-icon">📋</span>
              <span>Today&rsquo;s Plan</span>
            </h2>
            {plannedList.length > 0 ? (
              <span className="today-plan-count-badge" aria-label={`${plannedList.length} tasks planned`}>
                {plannedList.length}
              </span>
            ) : null}
          </div>
          <p className="today-plan-subtitle">
            Your most important tasks, organized by urgency.
          </p>
        </div>

        {plannedList.length > 0 ? (
          <button
            type="button"
            className="btn-plan-day"
            onClick={handlePlanMyDay}
            aria-label="Plan My Day: View prioritized ordered task list"
            title="View prioritized task order for today"
          >
            <span aria-hidden="true">⚡</span>
            <span>Plan My Day</span>
          </button>
        ) : null}
      </div>

      {plannedList.length === 0 ? (
        <div className="today-plan-empty" role="status">
          <span className="today-plan-empty-icon" aria-hidden="true">✨</span>
          <p className="today-plan-empty-text">No tasks planned for today.</p>
        </div>
      ) : (
        <div className="today-plan-list" role="list">
          {visibleTasks.map(({ task, isOverdue, isFocus }, index) => {
            const cat = categoryMeta(task.category);
            const timeFormatted = task.dueTime ? formatTimeDisplay(task.dueTime) : null;
            const scheduleStatus = task.dueTime ? getTaskScheduleStatus(task, dateStr) : null;

            return (
              <div
                key={task.id}
                className={`today-plan-item ${isOverdue ? "is-overdue" : ""} ${isFocus ? "is-focus" : ""}`}
                role="listitem"
              >
                <div className="today-plan-item-left">
                  <span className="today-plan-rank" aria-label={`Priority rank ${index + 1}`}>
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className="plan-check-btn"
                    onClick={() => onToggleTask(task.id)}
                    aria-label={`Mark "${task.title}" as complete`}
                  >
                    <CheckIcon />
                  </button>
                  <span
                    className={`prio-dot ${prioClass(task.priority)}`}
                    title={`Priority ${task.priority === 1 ? "High" : task.priority === 2 ? "Medium" : "Low"}`}
                    aria-hidden="true"
                  />
                </div>

                <div className="today-plan-item-content">
                  <div className="today-plan-item-title-row">
                    <span className="today-plan-item-title">{task.title}</span>
                  </div>

                  <div className="today-plan-badges-row">
                    {/* Overdue indicator */}
                    {isOverdue ? (
                      <span
                        className="planner-badge overdue"
                        title={timeFormatted ? `Overdue · Due at ${timeFormatted}` : "Task is overdue"}
                        aria-label="Overdue task"
                      >
                        ⚠️ Overdue
                      </span>
                    ) : null}

                    {/* Focus badge */}
                    {isFocus ? (
                      <span
                        className="planner-badge focus"
                        title="Today's Focus task"
                        aria-label="Today's Focus task"
                      >
                        🎯 Focus
                      </span>
                    ) : null}

                    {/* Due time badge */}
                    {timeFormatted && !isOverdue ? (
                      <span
                        className={`planner-badge ${scheduleStatus === "due" ? "due" : "time"}`}
                        title={`Due at ${timeFormatted}`}
                        aria-label={`Due at ${timeFormatted}`}
                      >
                        {scheduleStatus === "due" ? "⏰ Due" : "🕒"} {timeFormatted}
                      </span>
                    ) : null}

                    {/* High Priority badge */}
                    {task.priority === 1 && !isOverdue && !isFocus ? (
                      <span className="planner-badge prio-high-badge" aria-label="High priority">
                        High Priority
                      </span>
                    ) : null}

                    {/* Category badge */}
                    {cat.id ? (
                      <span className="task-cat" aria-label={`Category: ${cat.label}`}>
                        {cat.emoji} {cat.label}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore ? (
            <div className="today-plan-footer">
              <button
                type="button"
                className="btn-plan-toggle"
                onClick={() => setShowAll((prev) => !prev)}
                aria-expanded={showAll}
              >
                {showAll ? "Show Top 5" : `Show All ${plannedList.length} Tasks`}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
