import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Countdown, CountdownReminder } from "../../types";
import { addDays, todayStr } from "../../utils/dateUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CloseIcon } from "../../components/icons";
import CountdownDatePicker from "./CountdownDatePicker";

interface CountdownFormModalProps {
  initialCountdown?: Countdown | null;
  onSave: (data: Omit<Countdown, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const COMMON_EMOJIS = [
  "🎯", "📚", "✈️", "🎂", "⏰", "🏃", "💍", "🎓", "🚀", "🏝️",
  "💼", "💻", "🎉", "👶", "🚗", "🏠", "🌟", "🔥", "🏆", "❤️"
];

const PRIMARY_TEMPLATES = [
  { key: "exam", name: "Exam", icon: "📚" },
  { key: "trip", name: "Trip", icon: "✈️" },
  { key: "birthday", name: "Birthday", icon: "🎂" },
  { key: "deadline", name: "Deadline", icon: "⏰" },
  { key: "fitness", name: "Fitness", icon: "🏃" },
  { key: "custom", name: "Custom", icon: "✨" }
];

const STREAMLINED_REMINDERS = [
  { daysBefore: 7, label: "7d" },
  { daysBefore: 3, label: "3d" },
  { daysBefore: 1, label: "1d" },
  { daysBefore: 0, label: "On day" }
];

function ToggleRow({
  checked,
  onChange,
  icon,
  label,
  description
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  icon?: string;
  label: string;
  description?: string;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        userSelect: "none",
        minHeight: 46
      }}
    >
      <div style={{ flex: 1, paddingRight: 10, display: "flex", alignItems: "center", gap: 8 }}>
        {icon ? <span style={{ fontSize: 16 }} aria-hidden="true">{icon}</span> : null}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{label}</div>
          {description ? (
            <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 1, lineHeight: 1.3 }}>
              {description}
            </div>
          ) : null}
        </div>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: checked ? "var(--accent, #10b981)" : "var(--border)",
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            transition: "left 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
          }}
        />
      </div>
    </div>
  );
}

export default function CountdownFormModal({
  initialCountdown,
  onSave,
  onCancel
}: CountdownFormModalProps) {
  useBodyScrollLock(true);

  const isEditing = Boolean(initialCountdown);
  const [isClosing, setIsClosing] = useState(false);
  const closingTimeoutRef = useRef<number | null>(null);

  const [title, setTitle] = useState(initialCountdown?.title || "");
  const [icon, setIcon] = useState(initialCountdown?.icon || "🎯");
  const [targetDate, setTargetDate] = useState(
    initialCountdown?.targetDate || addDays(todayStr(), 30)
  );
  const [showOnToday, setShowOnToday] = useState(initialCountdown?.showOnToday ?? true);
  const [featured, setFeatured] = useState(initialCountdown?.featured ?? false);
  const [pinned, setPinned] = useState(initialCountdown?.pinned ?? false);
  const [selectedReminders, setSelectedReminders] = useState<number[]>(() => {
    if (initialCountdown?.reminders) {
      return initialCountdown.reminders.map((r) => r.daysBefore ?? 0);
    }
    return [7, 1, 0];
  });
  const [notes, setNotes] = useState(initialCountdown?.notes || "");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Smooth exit handler
  function handleClose(callback?: () => void) {
    if (isClosing) return;
    setIsClosing(true);
    closingTimeoutRef.current = window.setTimeout(() => {
      if (callback) {
        callback();
      } else {
        onCancel();
      }
    }, 270);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) {
      handleClose();
    }
    touchStartY.current = null;
  }

  useEffect(() => {
    return () => {
      if (closingTimeoutRef.current) {
        window.clearTimeout(closingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing]);

  function handleSelectTemplate(tpl: (typeof PRIMARY_TEMPLATES)[0]) {
    setIcon(tpl.icon);
    if (!title || PRIMARY_TEMPLATES.some((t) => t.name === title) || title === "Goal") {
      setTitle(tpl.name === "Custom" ? "" : tpl.name);
    }
  }

  function toggleReminder(days: number) {
    setSelectedReminders((prev) =>
      prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please enter what you are counting down to.");
      return;
    }
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setError("Please choose a valid target date.");
      return;
    }

    const reminders: CountdownReminder[] = selectedReminders.map((d) => ({
      id: `rem_${d}`,
      type: d === 0 ? "same_day" : "days_before",
      daysBefore: d,
      enabled: true
    }));

    const dataToSave: Omit<Countdown, "id" | "createdAt" | "updatedAt"> = {
      title: cleanTitle,
      icon: icon || "🎯",
      targetDate,
      targetTime: initialCountdown?.targetTime,
      allDay: initialCountdown?.allDay ?? true,
      mode: initialCountdown?.mode || "countdown",
      displayMode: initialCountdown?.displayMode || "days",
      countWorkingDays: initialCountdown?.countWorkingDays ?? false,
      showOnToday,
      featured,
      pinned,
      recurring: initialCountdown?.recurring,
      reminders,
      notes: notes.trim() || undefined
    };

    handleClose(() => {
      onSave(dataToSave);
    });
  }

  const modalContent = (
    <>
      {/* Viewport-level Backdrop */}
      <div
        className={`countdown-sheet-backdrop ${isClosing ? "is-closing" : ""}`}
        onClick={() => handleClose()}
        aria-hidden="true"
      />

      {/* True Viewport-anchored Bottom Sheet */}
      <div
        className={`countdown-sheet ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="countdown-modal-title"
      >
        <form onSubmit={handleSubmit} className="countdown-sheet-form">
          {/* Header with visual drag handle & sticky title row */}
          <div className="countdown-sheet-header">
            <div
              className="countdown-grab-handle-bar"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              title="Drag down to close"
            >
              <div className="countdown-grab-handle" />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                paddingTop: 2
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }} aria-hidden="true">
                  {icon}
                </span>
                <h2
                  id="countdown-modal-title"
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em"
                  }}
                >
                  {isEditing ? "Edit Countdown" : "New Countdown"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => handleClose()}
                aria-label="Close dialog"
                style={{ width: 36, height: 36 }}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="countdown-sheet-body">
            {error ? (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "var(--danger, #ef4444)",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14
                }}
              >
                {error}
              </div>
            ) : null}

            {/* 1. What are you counting down to? */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="countdown-title"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: 6
                }}
              >
                What are you counting down to?
              </label>

              <div style={{ display: "flex", gap: 8, position: "relative" }}>
                {/* Emoji Selector Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  style={{
                    width: 46,
                    height: 44,
                    fontSize: 22,
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                  aria-label="Choose icon"
                >
                  {icon}
                </button>

                {showEmojiPicker ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 50,
                      left: 0,
                      zIndex: 40,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: 6,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                      width: 230
                    }}
                  >
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setIcon(emoji);
                          setShowEmojiPicker(false);
                        }}
                        style={{
                          fontSize: 20,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 6,
                          borderRadius: 8
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}

                <input
                  id="countdown-title"
                  type="text"
                  className="input"
                  placeholder="e.g. Exam, Trip, Birthday..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus={!isEditing}
                  required
                  style={{
                    flex: 1,
                    minHeight: 44,
                    fontSize: 14.5,
                    borderRadius: 12,
                    padding: "0 14px"
                  }}
                />
              </div>
            </div>

            {/* 2. Choose a template */}
            {!isEditing ? (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    marginBottom: 6
                  }}
                >
                  Templates
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PRIMARY_TEMPLATES.map((tpl) => {
                    const isSelected = icon === tpl.icon;
                    return (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: "6px 12px",
                          minHeight: 36,
                          borderRadius: 18,
                          background: isSelected ? "var(--surface-hover)" : "var(--surface)",
                          border: `1px solid ${isSelected ? "var(--ink)" : "var(--border)"}`,
                          color: "var(--ink)",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span aria-hidden="true">{tpl.icon}</span>
                        <span>{tpl.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 3. Target Date with Smart Date Picker */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 6
                }}
              >
                Target date
              </div>

              <CountdownDatePicker
                selectedDate={targetDate}
                onChange={setTargetDate}
              />
            </div>

            {/* 4. Streamlined Toggles */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <ToggleRow
                checked={showOnToday}
                onChange={setShowOnToday}
                icon="🏠"
                label="Show on Today"
                description="Put this countdown in your Daily Check Today context"
              />

              <ToggleRow
                checked={featured}
                onChange={setFeatured}
                icon="⭐"
                label="Featured"
                description="Highlight as the main Hero card on your Countdown dashboard"
              />

              <ToggleRow
                checked={pinned}
                onChange={setPinned}
                icon="📌"
                label="Pin to top"
                description="Keep near the top of your upcoming countdowns list"
              />
            </div>

            {/* 5. Reminders */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 6
                }}
              >
                Reminders
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STREAMLINED_REMINDERS.map((opt) => {
                  const isChecked = selectedReminders.includes(opt.daysBefore);
                  return (
                    <button
                      key={opt.daysBefore}
                      type="button"
                      onClick={() => toggleReminder(opt.daysBefore)}
                      style={{
                        flex: "1 1 calc(25% - 6px)",
                        minWidth: 62,
                        minHeight: 38,
                        borderRadius: 10,
                        border: isChecked ? "1.5px solid var(--accent, #10b981)" : "1px solid var(--border)",
                        background: isChecked ? "rgba(16, 185, 129, 0.12)" : "var(--surface)",
                        color: isChecked ? "var(--accent, #10b981)" : "var(--ink)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        transition: "all 0.15s ease"
                      }}
                    >
                      <span>{isChecked ? "✓" : "+"}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Notes (Optional) */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="countdown-notes"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  display: "block",
                  marginBottom: 6
                }}
              >
                Notes (optional)
              </label>
              <textarea
                id="countdown-notes"
                className="input"
                rows={2}
                placeholder="Details, milestone checklist, goals..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "inherit",
                  background: "var(--surface)",
                  borderRadius: 12
                }}
              />
            </div>

            {/* 7. Submit Action Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                minHeight: 48,
                background: "var(--accent, #10b981)",
                color: "#fff",
                fontSize: 14.5,
                fontWeight: 700,
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)"
              }}
            >
              {isEditing ? "Save Changes" : "Create Countdown"}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
