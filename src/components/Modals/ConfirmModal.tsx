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
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? "confirm-modal-title" : undefined}
        aria-describedby="confirm-modal-message"
      >
        {title ? (
          <h2 id="confirm-modal-title" style={{ marginBottom: 8 }}>
            {title}
          </h2>
        ) : null}
        <p id="confirm-modal-message">{message}</p>
        <div className="row">
          <button ref={cancelRef} className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={danger ? { background: "var(--red)" } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
