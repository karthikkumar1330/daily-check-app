import { useEffect, useState } from "react";
import type {
  Countdown,
  CountdownDisplayMode,
  CountdownMode,
  CountdownRecurrenceFrequency,
  CountdownReminder
} from "../../types";
import { COUNTDOWN_TEMPLATES } from "../../utils/countdownUtils";
import { addDays, todayStr } from "../../utils/dateUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CloseIcon } from "../../components/icons";

interface CountdownFormModalProps {
  initialCountdown?: Countdown | null;
  onSave: (data: Omit<Countdown, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const COMMON_EMOJIS = [
  "🎯", "📚", "✈️", "🎂", "⏳", "🏃", "💍", "🎓", "🚀", "🏝️",
  "💼", "💻", "🎉", "👶", "🚗", "🏠", "🌟", "🔥", "🏆", "❤️"
];

const REMINDER_OPTIONS = [
  { daysBefore: 30, label: "30 days before" },
  { daysBefore: 14, label: "14 days before" },
  { daysBefore: 7, label: "7 days before" },
  { daysBefore: 3, label: "3 days before" },
  { daysBefore: 1, label: "1 day before" },
  { daysBefore: 0, label: "On the day" }
];

export default function CountdownFormModal({
  initialCountdown,
  onSave,
  onCancel
}: CountdownFormModalProps) {
  useBodyScrollLock(true);

  const isEditing = Boolean(initialCountdown);

  const [title, setTitle] = useState(initialCountdown?.title || "");
  const [icon, setIcon] = useState(initialCountdown?.icon || "🎯");
  const [targetDate, setTargetDate] = useState(
    initialCountdown?.targetDate || addDays(todayStr(), 30)
  );
  const [targetTime, setTargetTime] = useState(initialCountdown?.targetTime || "09:00");
  const [allDay, setAllDay] = useState(initialCountdown?.allDay ?? true);
  const [mode, setMode] = useState<CountdownMode>(initialCountdown?.mode || "countdown");
  const [displayMode, setDisplayMode] = useState<CountdownDisplayMode>(
    initialCountdown?.displayMode || "days"
  );
  const [countWorkingDays, setCountWorkingDays] = useState(
    initialCountdown?.countWorkingDays ?? false
  );
  const [showOnToday, setShowOnToday] = useState(initialCountdown?.showOnToday ?? true);
  const [pinned, setPinned] = useState(initialCountdown?.pinned ?? false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<CountdownRecurrenceFrequency | "none">(
    initialCountdown?.recurring?.frequency || "none"
  );
  const [selectedReminders, setSelectedReminders] = useState<number[]>(() => {
    if (initialCountdown?.reminders) {
      return initialCountdown.reminders.map((r) => r.daysBefore ?? 0);
    }
    return [7, 1, 0];
  });
  const [notes, setNotes] = useState(initialCountdown?.notes || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleSelectTemplate(tpl: (typeof COUNTDOWN_TEMPLATES)[0]) {
    setIcon(tpl.icon);
    if (!title || COUNTDOWN_TEMPLATES.some((t) => t.name === title)) {
      setTitle(tpl.name);
    }
    setAllDay(tpl.defaultAllDay);
    setCountWorkingDays(tpl.defaultWorkingDays);
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
      setError("Please enter a countdown title.");
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
      time: allDay ? "09:00" : targetTime,
      enabled: true
    }));

    onSave({
      title: cleanTitle,
      icon: icon || "🎯",
      targetDate,
      targetTime: allDay ? undefined : targetTime,
      allDay,
      mode,
      displayMode,
      countWorkingDays,
      showOnToday,
      pinned,
      recurring:
        recurrenceFreq !== "none"
          ? {
              frequency: recurrenceFreq,
              interval: 1
            }
          : undefined,
      reminders,
      notes: notes.trim() || undefined
    });
  }

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 1050 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="countdown-modal-title"
        style={{
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          width: "100%",
          padding: 0
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            background: "var(--surface)",
            zIndex: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }} aria-hidden="true">{icon}</span>
            <h2 id="countdown-modal-title" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              {isEditing ? "Edit Countdown" : "New Countdown"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onCancel}
            aria-label="Close dialog"
            style={{ width: 36, height: 36 }}
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {error ? (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--danger, #ef4444)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500
              }}
            >
              {error}
            </div>
          ) : null}

          {/* Quick Templates (only on new) */}
          {!isEditing ? (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                Quick Templates
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COUNTDOWN_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    className="chip"
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12.5,
                      padding: "5px 10px",
                      borderRadius: 16,
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                      color: "var(--ink)",
                      cursor: "pointer"
                    }}
                  >
                    <span>{tpl.icon}</span>
                    <span>{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Title & Icon */}
          <div>
            <label htmlFor="countdown-title" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
              Name *
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  style={{
                    width: 48,
                    height: 44,
                    fontSize: 22,
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm, 8px)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  aria-label="Change icon"
                >
                  {icon}
                </button>
                {showEmojiPicker ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 50,
                      left: 0,
                      zIndex: 30,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: 6,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                      width: 220
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
                          borderRadius: 6
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <input
                id="countdown-title"
                type="text"
                className="input"
                placeholder="e.g. SBI PO, Hawaii Trip, Launch Day"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                required
                style={{ flex: 1, minHeight: 44 }}
              />
            </div>
          </div>

          {/* Target Date & Time */}
          <div style={{ display: "grid", gridTemplateColumns: allDay ? "1fr" : "1fr 1fr", gap: 10 }}>
            <div>
              <label htmlFor="countdown-target-date" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
                Target Date *
              </label>
              <input
                id="countdown-target-date"
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                style={{ width: "100%", minHeight: 44 }}
              />
            </div>

            {!allDay ? (
              <div>
                <label htmlFor="countdown-target-time" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
                  Target Time
                </label>
                <input
                  id="countdown-target-time"
                  type="time"
                  className="input"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  style={{ width: "100%", minHeight: 44 }}
                />
              </div>
            ) : null}
          </div>

          {/* All Day Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>All-day event</span>
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              aria-label="All-day event"
            />
          </div>

          {/* Mode & Display Mode */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
                Mode
              </label>
              <select
                className="input"
                value={mode}
                onChange={(e) => setMode(e.target.value as CountdownMode)}
                style={{ width: "100%", minHeight: 40 }}
              >
                <option value="countdown">Countdown (Days Left)</option>
                <option value="countup">Count-up (Days Ago)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
                Units
              </label>
              <select
                className="input"
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as CountdownDisplayMode)}
                style={{ width: "100%", minHeight: 40 }}
              >
                <option value="days">Days</option>
                <option value="weeksDays">Weeks + Days</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>

          {/* Working Days Mode */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <div>
              <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>Working days only</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>Exclude Saturday &amp; Sunday</div>
            </div>
            <input
              type="checkbox"
              checked={countWorkingDays}
              onChange={(e) => setCountWorkingDays(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              aria-label="Exclude weekends"
            />
          </div>

          {/* Show on Today & Pin toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--surface-hover)", padding: 12, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600 }}>Show on Today page</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>Display in compact Today&rsquo;s Context</div>
              </div>
              <input
                type="checkbox"
                checked={showOnToday}
                onChange={(e) => setShowOnToday(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                aria-label="Show on Today page"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600 }}>Pin as Featured</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>Feature at top of Countdowns</div>
              </div>
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                aria-label="Pin as featured"
              />
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
              Repeat (for Birthdays, Anniversaries)
            </label>
            <select
              className="input"
              value={recurrenceFreq}
              onChange={(e) => setRecurrenceFreq(e.target.value as any)}
              style={{ width: "100%", minHeight: 40 }}
            >
              <option value="none">Does not repeat</option>
              <option value="yearly">Every year (Yearly)</option>
              <option value="monthly">Every month (Monthly)</option>
              <option value="weekly">Every week (Weekly)</option>
              <option value="daily">Every day (Daily)</option>
            </select>
          </div>

          {/* Reminders */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
              Reminders
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {REMINDER_OPTIONS.map((opt) => {
                const checked = selectedReminders.includes(opt.daysBefore);
                return (
                  <label
                    key={opt.daysBefore}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12.5,
                      color: "var(--ink)",
                      cursor: "pointer",
                      padding: "4px 0"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReminder(opt.daysBefore)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="countdown-notes" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
              Notes (optional)
            </label>
            <textarea
              id="countdown-notes"
              className="input"
              rows={2}
              placeholder="Study schedule, flight details, milestone reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{ minHeight: 44, padding: "0 18px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minHeight: 44, padding: "0 22px", background: "var(--accent, #10b981)", color: "#fff" }}
            >
              {isEditing ? "Save Changes" : "Create Countdown"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
