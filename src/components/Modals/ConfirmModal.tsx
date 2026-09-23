import { useEffect, useRef } from "react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);

  // If title was not explicitly supplied, extract question as title if message contains '?'
  let displayTitle = title;
  let displayMessage = message;
  if (!displayTitle && message.includes("?")) {
    const qIndex = message.indexOf("?");
    displayTitle = message.slice(0, qIndex + 1).trim();
    displayMessage = message.slice(qIndex + 1).trim();
  }

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="overlay confirm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={displayTitle ? "confirm-modal-title" : undefined}
        aria-describedby={displayMessage ? "confirm-modal-message" : undefined}
      >
        {displayTitle ? (
          <h2 id="confirm-modal-title" className="confirm-modal-title">
            {displayTitle}
          </h2>
        ) : null}
        {displayMessage ? (
          <p id="confirm-modal-message" className="confirm-modal-message">
            {displayMessage}
          </p>
        ) : null}
        <div className="confirm-modal-actions row">
          <button
            ref={cancelRef}
            type="button"
            className="btn-ghost confirm-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn-primary confirm-action-btn ${danger ? "danger" : ""}`}
            style={danger ? { background: "var(--red)", borderColor: "var(--red)", color: "#ffffff" } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
