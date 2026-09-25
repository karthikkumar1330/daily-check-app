import type { ReactNode } from "react";

interface EmptyStateProps {
  variant?: "no-tasks" | "all-done" | "no-weekly" | "no-history" | "custom";
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function EmptyState({ variant = "no-tasks", icon, title, subtitle }: EmptyStateProps) {
  if (variant === "all-done") {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden="true">
          {"\uD83C\uDF89"}
        </div>
        <div className="empty-state-title">Everything done! 🎉</div>
        <div className="empty-state-subtitle">Great job completing your tasks.</div>
      </div>
    );
  }

  if (variant === "no-weekly") {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No activity this week yet.</div>
        <div className="empty-state-subtitle">Complete tasks during the week to see your progress chart.</div>
      </div>
    );
  }

  if (variant === "no-history") {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No history yet.</div>
        <div className="empty-state-subtitle">Your history will appear here as you complete tasks.</div>
      </div>
    );
  }

  if (variant === "custom") {
    return (
      <div className="empty-state">
        {icon ? (
          <div className="empty-state-icon" aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <div className="empty-state-title">{title}</div>
        {subtitle ? <div className="empty-state-subtitle">{subtitle}</div> : null}
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-state-title">Nothing planned yet.</div>
      <div className="empty-state-subtitle">Add your first task to get started.</div>
    </div>
  );
}
