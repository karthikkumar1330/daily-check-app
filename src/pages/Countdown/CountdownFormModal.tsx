import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  Countdown,
  CountdownDisplayMode,
  CountdownMode,
  CountdownRecurrenceFrequency,
  CountdownReminder
} from "../../types";
import { addDays, todayStr } from "../../utils/dateUtils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CloseIcon, DownIcon, UpIcon } from "../../components/icons";

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
  { key: "exam", name: "Exam", icon: "📚", defaultAllDay: true, defaultWorkingDays: false },
  { key: "trip", name: "Trip", icon: "✈️", defaultAllDay: true, defaultWorkingDays: false },
  { key: "birthday", name: "Birthday", icon: "🎂", defaultAllDay: true, defaultWorkingDays: false },
  { key: "deadline", name: "Deadline", icon: "⏰", defaultAllDay: false, defaultWorkingDays: true },
  { key: "fitness", name: "Fitness", icon: "🏃", defaultAllDay: true, defaultWorkingDays: false },
  { key: "custom", name: "Custom", icon: "✨", defaultAllDay: true, defaultWorkingDays: false }
];

const REMINDER_OPTIONS = [
  { daysBefore: 30, label: "30 days before" },
  { daysBefore: 14, label: "14 days before" },
  { daysBefore: 7, label: "7 days before" },
  { daysBefore: 3, label: "3 days before" },
  { daysBefore: 1, label: "1 day before" },
  { daysBefore: 0, label: "On the day" }
];

function ToggleSwitch({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
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
        padding: "12px 14px",
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        userSelect: "none",
        minHeight: 48
      }}
    >
      <div style={{ flex: 1, paddingRight: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{label}</div>
        {description ? (
          <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2, lineHeight: 1.4 }}>
            {description}
          </div>
        ) : null}
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
          width: 44,
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
            left: checked ? 23 : 3,
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

  // Progressive disclosure: collapsed by default for compact native sheet
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(
      initialCountdown &&
        (initialCountdown.mode === "countup" ||
          initialCountdown.countWorkingDays ||
          !initialCountdown.allDay ||
          initialCountdown.displayMode !== "days" ||
          initialCountdown.recurring ||
          initialCountdown.notes)
    )
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      time: allDay ? "09:00" : targetTime,
      enabled: true
    }));

    const dataToSave = {
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
    };

    // Smooth exit animation before unmounting on successful creation
    handleClose(() => {
      onSave(dataToSave);
    });
  }

  // Smooth scroll into view when input receives focus to prevent keyboard obstruction
  function handleInputFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
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
        className={`countdown-sheet ${advancedOpen ? "is-expanded" : ""} ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="countdown-modal-title"
      >
        {/* Form wrapping sticky header and scrollable body */}
        <form onSubmit={handleSubmit} className="countdown-sheet-form">
          {/* Header with visual drag handle & sticky title row */}
          <div className="countdown-sheet-header">
            <div className="countdown-grab-handle-bar">
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

          {/* Scrollable Body - ONLY this area scrolls */}
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

            {/* Step 1: What are you counting down to? */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="countdown-title"
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: 8
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
                    width: 48,
                    height: 46,
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
                      top: 52,
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

                {/* Name Input */}
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
                  onFocus={handleInputFocus}
                  autoFocus={!isEditing}
                  required
                  style={{
                    flex: 1,
                    minHeight: 46,
                    fontSize: 14.5,
                    borderRadius: 12,
                    padding: "0 14px"
                  }}
                />
              </div>
            </div>

            {/* Step 2: Choose a template (only on new countdown) */}
            {!isEditing ? (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    marginBottom: 8
                  }}
                >
                  Choose a template
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
                          fontSize: 13,
                          fontWeight: 600,
                          padding: "8px 14px",
                          minHeight: 42,
                          borderRadius: 20,
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

            {/* Step 3: Target date */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="countdown-target-date"
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: 8
                }}
              >
                Target date
              </label>
              <input
                id="countdown-target-date"
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                onFocus={handleInputFocus}
                required
                style={{
                  width: "100%",
                  minHeight: 46,
                  fontSize: 14.5,
                  borderRadius: 12,
                  padding: "0 14px"
                }}
              />
            </div>

            {/* Primary Action Button: Create Countdown */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                minHeight: 48,
                background: "var(--accent, #10b981)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 14,
                marginBottom: 12,
                boxShadow: "0 3px 10px rgba(16, 185, 129, 0.28)"
              }}
            >
              {isEditing ? "Save Changes" : "Create Countdown"}
            </button>

            {/* Progressive Disclosure: Advanced options accordion */}
            <div style={{ marginBottom: 4 }}>
              <button
                type="button"
                className="countdown-accordion-toggle"
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
              >
                <span>Advanced options</span>
                <span style={{ display: "flex", alignItems: "center" }}>
                  {advancedOpen ? <UpIcon /> : <DownIcon />}
                </span>
              </button>

              {advancedOpen ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: "16px 14px",
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14
                  }}
                >
                  {/* Mode: Countdown vs Count Up */}
                  <div>
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--ink-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        display: "block",
                        marginBottom: 6
                      }}
                    >
                      Mode
                    </label>
                    <div
                      style={{
                        display: "flex",
                        background: "var(--surface)",
                        borderRadius: 12,
                        padding: 3,
                        border: "1px solid var(--border)"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setMode("countdown")}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          background: mode === "countdown" ? "var(--ink)" : "transparent",
                          color: mode === "countdown" ? "var(--surface)" : "var(--ink-muted)",
                          transition: "all 0.15s ease"
                        }}
                      >
                        Countdown
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("countup")}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          background: mode === "countup" ? "var(--ink)" : "transparent",
                          color: mode === "countup" ? "var(--surface)" : "var(--ink-muted)",
                          transition: "all 0.15s ease"
                        }}
                      >
                        Count Up
                      </button>
                    </div>
                  </div>

                  {/* Units */}
                  <div>
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--ink-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        display: "block",
                        marginBottom: 6
                      }}
                    >
                      Units
                    </label>
                    <select
                      className="input"
                      value={displayMode}
                      onChange={(e) => setDisplayMode(e.target.value as CountdownDisplayMode)}
                      style={{
                        width: "100%",
                        minHeight: 44,
                        background: "var(--surface)",
                        fontSize: 13.5,
                        borderRadius: 12
                      }}
                    >
                      <option value="days">Days</option>
                      <option value="weeksDays">Weeks + Days</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>

                  {/* Working days toggle */}
                  <ToggleSwitch
                    checked={countWorkingDays}
                    onChange={setCountWorkingDays}
                    label="Working days only"
                    description="Exclude Saturdays &amp; Sundays from remaining count"
                  />

                  {/* Show on Today toggle */}
                  <ToggleSwitch
                    checked={showOnToday}
                    onChange={setShowOnToday}
                    label="Show on Today"
                    description="Display this countdown in your Today screen contextual slot"
                  />

                  {/* Pin to top toggle */}
                  <ToggleSwitch
                    checked={pinned}
                    onChange={setPinned}
                    label="Pin to top"
                    description="Feature as pinned card at the top of Countdowns"
                  />

                  {/* All-day event & Time */}
                  <div
                    style={{
                      background: "var(--surface)",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid var(--border)"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        minHeight: 32
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                        All-day event
                      </span>
                      <input
                        type="checkbox"
                        checked={allDay}
                        onChange={(e) => setAllDay(e.target.checked)}
                        style={{ width: 20, height: 20, accentColor: "var(--accent)" }}
                      />
                    </div>

                    {!allDay ? (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                        <label
                          style={{
                            fontSize: 12,
                            color: "var(--ink-muted)",
                            display: "block",
                            marginBottom: 4
                          }}
                        >
                          Target Time
                        </label>
                        <input
                          type="time"
                          className="input"
                          value={targetTime}
                          onChange={(e) => setTargetTime(e.target.value)}
                          onFocus={handleInputFocus}
                          style={{ width: "100%", minHeight: 40, borderRadius: 10 }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Recurrence (Birthdays, Anniversaries) */}
                  <div>
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--ink-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        display: "block",
                        marginBottom: 6
                      }}
                    >
                      Repeat
                    </label>
                    <select
                      className="input"
                      value={recurrenceFreq}
                      onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                      style={{
                        width: "100%",
                        minHeight: 44,
                        background: "var(--surface)",
                        fontSize: 13.5,
                        borderRadius: 12
                      }}
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
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--ink-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        display: "block",
                        marginBottom: 6
                      }}
                    >
                      Reminders
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        background: "var(--surface)",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid var(--border)"
                      }}
                    >
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
                              padding: "6px 0",
                              minHeight: 38
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleReminder(opt.daysBefore)}
                              style={{ width: 17, height: 17, accentColor: "var(--accent)" }}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label
                      htmlFor="countdown-notes"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--ink-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
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
                      placeholder="Details, flight numbers, milestone checklist..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onFocus={handleInputFocus}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        fontFamily: "inherit",
                        background: "var(--surface)",
                        borderRadius: 12
                      }}
                    />
                  </div>

                  {/* Secondary Create/Save button at the base of Advanced Options */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      minHeight: 46,
                      background: "var(--accent, #10b981)",
                      color: "#fff",
                      fontSize: 14.5,
                      fontWeight: 700,
                      borderRadius: 12,
                      marginTop: 6
                    }}
                  >
                    {isEditing ? "Save Changes" : "Create Countdown"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
