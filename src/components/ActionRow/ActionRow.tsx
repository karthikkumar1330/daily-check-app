import type { ReactNode } from "react";

interface ActionRowProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
}

export default function ActionRow({ icon, title, description, actionLabel, onAction }: ActionRowProps) {
  return (
    <div className="action-row">
      <div className="action-row-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="action-row-text">
        <div className="action-row-title">{title}</div>
        {description ? <div className="action-row-desc">{description}</div> : null}
      </div>
      <button type="button" className="btn-ghost action-row-btn" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
