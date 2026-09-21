import { useEffect, useState } from "react";
import type { Task } from "../../types";
import { categoryMeta, prioClass, prioLabel } from "../../utils/taskUtils";
import { formatTimeDisplay } from "../../utils/scheduleUtils";
import { CheckIcon, CloseIcon, FocusIcon } from "../icons";
import { useScrollLock } from "../../utils/scrollLock";

interface FocusSelectorModalProps {
  dateStr: string;
  tasks: Task[];
  initialFocusIds: string[];
  onSave: (selectedIds: string[]) => void;
  onClose: () => void;
}

export default function FocusSelectorModal({
  dateStr: _dateStr,
  tasks,
  initialFocusIds,
  onSave,
  onClose
}: FocusSelectorModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialFocusIds);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useScrollLock(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function handleToggle(id: string) {
    setErrorMsg(null);
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 3) {
        setErrorMsg("You can choose up to 3 focus tasks per day.");
        return;
      }
      setSelectedIds((prev) => [...prev, id]);
    }
  }

  function handleConfirm() {
    onSave(selectedIds);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-card focus-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="modal-header">
          <div>
            <h2 id="focus-modal-title" className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true">🎯</span>
              <span>Today&apos;s Focus</span>
            </h2>
            <p className="modal-subtitle" style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--ink-muted)" }}>
              Choose 1 to 3 tasks that matter most for today.
            </p>
          </div>
          <button className="icon-btn close-btn" onClick={onClose} aria-label="Close focus selector">
            <CloseIcon />
          </button>
        </div>

        <div className="focus-modal-body" style={{ padding: "16px 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "var(--ink-muted)"
            }}
          >
            <span>Selected ({selectedIds.length}/3)</span>
            {selectedIds.length > 0 ? (
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setSelectedIds([]);
                  setErrorMsg(null);
                }}
                style={{ fontSize: "0.8rem", color: "var(--ink-muted)", cursor: "pointer" }}
              >
                Clear all
              </button>
            ) : null}
          </div>

          {errorMsg ? (
            <div
              className="form-error"
              role="alert"
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--danger-soft, rgba(239, 68, 68, 0.12))",
                color: "var(--danger, #dc2626)",
                fontSize: "0.85rem"
              }}
            >
              {errorMsg}
            </div>
          ) : null}

          {tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--ink-muted)" }}>
              <p style={{ margin: "0 0 4px", fontSize: "0.95rem" }}>No tasks on today&apos;s checklist.</p>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Add tasks first, then choose up to 3 as your focus.</p>
            </div>
          ) : (
            <div
              className="focus-tasks-picker-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: "52vh",
                overflowY: "auto",
                paddingRight: 4
              }}
            >
              {tasks.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                const isAtLimit = selectedIds.length >= 3 && !isSelected;
                const cat = categoryMeta(t.category);
                const timeFormatted = formatTimeDisplay(t.dueTime);

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggle(t.id)}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Deselect" : "Select"} "${t.title}" for focus`}
                    className={"focus-picker-item" + (isSelected ? " selected" : "")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: isSelected ? "1.5px solid var(--accent, #10b981)" : "1px solid var(--border)",
                      background: isSelected
                        ? "var(--accent-soft, rgba(16, 185, 129, 0.08))"
                        : "var(--surface)",
                      textAlign: "left",
                      cursor: "pointer",
                      opacity: isAtLimit ? 0.65 : 1,
                      transition: "background 0.15s ease, border-color 0.15s ease",
                      minHeight: 44
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: isSelected ? "2px solid var(--accent, #10b981)" : "1.5px solid var(--border)",
                        background: isSelected ? "var(--accent, #10b981)" : "transparent",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      {isSelected ? <CheckIcon /> : null}
                    </span>

                    <span
                      className={"prio-dot " + prioClass(t.priority)}
                      title={prioLabel(t.priority) + " priority"}
                      style={{ flexShrink: 0 }}
                    />

                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.9rem",
                        fontWeight: isSelected ? 600 : 400,
                        color: "var(--ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {t.title}
                    </span>

                    {cat.id ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--ink-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          flexShrink: 0
                        }}
                      >
                        {cat.emoji}
                      </span>
                    ) : null}

                    {timeFormatted ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--ink-muted)",
                          flexShrink: 0
                        }}
                      >
                        🕒 {timeFormatted}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "12px 20px",
            borderTop: "1px solid var(--border)"
          }}
        >
          <button type="button" className="btn secondary-btn" onClick={onClose} style={{ minHeight: 44 }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary-btn"
            onClick={handleConfirm}
            style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 6 }}
          >
            <FocusIcon />
            <span>Set Focus ({selectedIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
