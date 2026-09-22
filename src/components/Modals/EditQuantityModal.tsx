import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Task } from "../../types";
import { calculateQuantityPct, formatQuantity, formatQuantityNumber } from "../../utils/quantityUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

interface EditQuantityModalProps {
  task: Task;
  dateStr: string;
  onLogDelta: (delta: number) => void;
  onSetTotal: (total: number) => void;
  onClose: () => void;
}

export default function EditQuantityModal({
  task,
  onLogDelta,
  onSetTotal,
  onClose
}: EditQuantityModalProps) {
  const target = task.quantityTarget || 1;
  const current = task.quantityCompleted || 0;
  const unit = (task.quantityUnit || "").trim();
  const step = task.quantityStep && task.quantityStep > 0 ? task.quantityStep : 1;

  const [mode, setMode] = useState<"add" | "set">("add");
  const [customDelta, setCustomDelta] = useState<string>(String(step));
  const [setAmount, setSetAmount] = useState<string>(String(current));
  const modalRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(true);

  const pct = calculateQuantityPct(current, target);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Compute preset buttons dynamically based on unit/step
  const presets: number[] = (() => {
    const u = unit.toLowerCase();
    if (u === "l" || u === "liter" || u === "liters") {
      return [0.25, 0.5, 1, 1.5];
    }
    if (u === "ml") {
      return [250, 500, 750, 1000];
    }
    if (u === "steps") {
      return [500, 1000, 2500, 5000];
    }
    if (u === "pages") {
      return [5, 10, 15, 20];
    }
    if (u === "questions") {
      return [5, 10, 20, 25];
    }
    // Generic
    return [step, step * 2, step * 5, step * 10];
  })();

  function handleQuickAdd(val: number) {
    if (val > 0) {
      onLogDelta(val);
      onClose();
    }
  }

  function handleApplyCustomAdd(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(customDelta);
    if (!isNaN(val) && val > 0) {
      onLogDelta(val);
      onClose();
    }
  }

  function handleApplySetTotal(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(setAmount);
    if (!isNaN(val) && val >= 0) {
      onSetTotal(val);
      onClose();
    }
  }

  const content = (
    <div
      className="overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-quantity-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal-card edit-quantity-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440, width: "100%" }}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12
          }}
        >
          <h2
            id="edit-quantity-title"
            style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}
          >
            Log Quantity
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close log quantity modal"
            style={{ minHeight: 36, minWidth: 36 }}
          >
            ✕
          </button>
        </div>

        {/* Task Summary Card */}
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--surface-subtle, rgba(0,0,0,0.03))",
            border: "1px solid var(--border)",
            marginBottom: 16
          }}
        >
          <div
            style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)", marginBottom: 6 }}
          >
            {task.title}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.82rem",
              color: "var(--ink-muted)",
              marginBottom: 4
            }}
          >
            <span>
              {formatQuantity(current, unit)} / {formatQuantity(target, unit)}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: current >= target ? "var(--accent, #10b981)" : "var(--ink)"
              }}
            >
              {pct}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={current}
            aria-label={`Progress: ${pct}%`}
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--border, rgba(0,0,0,0.1))",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: current >= target ? "var(--accent, #10b981)" : "var(--teal, #0d9488)",
                borderRadius: 3
              }}
            />
          </div>
        </div>

        {/* Mode Toggle: Add Amount vs Set Total */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={"chip-btn" + (mode === "add" ? " active" : "")}
            onClick={() => setMode("add")}
            style={{ flex: 1, textAlign: "center", padding: "8px 12px" }}
          >
            + Add Amount
          </button>
          <button
            type="button"
            className={"chip-btn" + (mode === "set" ? " active" : "")}
            onClick={() => setMode("set")}
            style={{ flex: 1, textAlign: "center", padding: "8px 12px" }}
          >
            Set Total
          </button>
        </div>

        {mode === "add" ? (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--ink-muted)",
                marginBottom: 8
              }}
            >
              Quick Presets
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                marginBottom: 16
              }}
            >
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => handleQuickAdd(val)}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    padding: "8px 4px",
                    minHeight: 44,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  +{formatQuantityNumber(val)}
                  {unit ? <span style={{ fontSize: "0.72rem", opacity: 0.8 }}>{unit}</span> : null}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleApplyCustomAdd}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <label
                htmlFor="custom-qty-input"
                style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-muted)" }}
              >
                Custom Amount to Add
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  id="custom-qty-input"
                  type="number"
                  step="any"
                  min="0.01"
                  value={customDelta}
                  onChange={(e) => setCustomDelta(e.target.value)}
                  className="form-input"
                  style={{ width: 130, padding: "8px 12px" }}
                  placeholder="Amount"
                />
                <button
                  type="submit"
                  className="btn primary-btn"
                  style={{ flex: 1, minHeight: 44, fontWeight: 600 }}
                >
                  Log +{customDelta || 0} {unit}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form
            onSubmit={handleApplySetTotal}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <label
              htmlFor="set-total-qty-input"
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-muted)" }}
            >
              Directly Set Total Completed Amount
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                id="set-total-qty-input"
                type="number"
                step="any"
                min="0"
                value={setAmount}
                onChange={(e) => setSetAmount(e.target.value)}
                className="form-input"
                style={{ width: 140, padding: "8px 12px" }}
              />
              <span style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
                {unit ? unit : ""}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => {
                  onSetTotal(0);
                  onClose();
                }}
                style={{ flex: 1, minHeight: 44 }}
              >
                Reset to 0
              </button>
              <button
                type="submit"
                className="btn primary-btn"
                style={{ flex: 1, minHeight: 44, fontWeight: 600 }}
              >
                Save Total
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
