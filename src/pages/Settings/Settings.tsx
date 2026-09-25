import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import { useRoutines } from "../../hooks/useRoutines";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import type { AppData, CountdownGoalsData, RoutinesData, ThemePreference } from "../../types";
import { CURRENT_DATA_VERSION, CURRENT_COUNTDOWN_VERSION, CURRENT_ROUTINES_VERSION } from "../../types";
import { APP_VERSION } from "../../version";
import { exportBackup, parseImportFile, getStorageUsageKb } from "../../utils/storageUtils";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  sendTestNotification
} from "../../utils/notificationUtils";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import ActionRow from "../../components/ActionRow/ActionRow";
import { DownloadIcon, InstallIcon, PrintIcon, TrashIcon, UploadIcon } from "../../components/icons";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import GoalsManagerModal from "../../components/CountdownGoal/GoalsManagerModal";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "\u2600\uFE0F Light" },
  { value: "dark", label: "\uD83C\uDF19 Dark" },
  { value: "auto", label: "\uD83D\uDDA5\uFE0F System" }
];

const IMPORT_ERROR = "Couldn't import this backup. Check that the file is a valid Daily Check backup.";

interface PendingImportState {
  data: AppData;
  countdownGoals?: CountdownGoalsData;
  routines?: RoutinesData;
}

export default function Settings() {
  const { appData, setTheme, setWeekStartsOn, setHapticsEnabled, replaceAllData, resetAllData } = useTasks();
  const { goals, goalsData, replaceAllGoals } = useCountdownGoals();
  const { routines, routinesData, replaceAllRoutines } = useRoutines();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } = useNotificationCenter();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [, setNotifStateVersion] = useState(0);

  const storageUsage = useMemo(() => getStorageUsageKb(), [appData, goals, routines]);

  const isSupported = isNotificationSupported();
  const notifPermission = getNotificationPermission();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  async function handleEnableReminders() {
    if (!isSupported) {
      showToast("Notifications are not supported by this browser.");
      return;
    }
    const res = await requestNotificationPermission();
    setNotifStateVersion((v) => v + 1);
    if (res === "granted") {
      showToast("Reminders enabled.");
    } else if (res === "denied") {
      showToast("Notifications are blocked in browser settings.");
    }
  }

  function handleExport() {
    exportBackup(appData, goalsData, routinesData);
    showToast("Backup downloaded.");
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseImportFile(text);
      if (!result.ok || !result.data) {
        showToast(result.error || IMPORT_ERROR);
        return;
      }
      setPendingImport({
        data: result.data,
        countdownGoals: result.countdownGoals,
        routines: result.routines
      });
    };
    reader.onerror = () => showToast(IMPORT_ERROR);
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pendingImport) return;
    replaceAllData(pendingImport.data);
    if (pendingImport.countdownGoals) {
      replaceAllGoals(pendingImport.countdownGoals);
    }
    if (pendingImport.routines) {
      replaceAllRoutines(pendingImport.routines);
    }
    setPendingImport(null);
    showToast("Data imported successfully.");
  }

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === "accepted") showToast("Daily Check installed.");
  }

  return (
    <div className="page settings-page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Appearance & Preferences */}
      <div className="card settings-card">
        <div className="settings-heading">Appearance &amp; Preferences</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
          Theme
        </div>
        <div className="seg" style={{ width: "100%", marginBottom: 16 }} role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={appData.theme === opt.value}
              className={appData.theme === opt.value ? "active" : ""}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setTheme(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            First Day of the Week
          </div>
          <div className="seg" style={{ width: "100%" }} role="radiogroup" aria-label="First day of the week">
            <button
              type="button"
              role="radio"
              aria-checked={(appData.weekStartsOn ?? 1) === 1}
              className={(appData.weekStartsOn ?? 1) === 1 ? "active" : ""}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                setWeekStartsOn(1);
                showToast("Week starts on Monday.");
              }}
            >
              Monday
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={(appData.weekStartsOn ?? 1) === 0}
              className={(appData.weekStartsOn ?? 1) === 0 ? "active" : ""}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                setWeekStartsOn(0);
                showToast("Week starts on Sunday.");
              }}
            >
              Sunday
            </button>
          </div>
        </div>

        <div style={{ paddingTop: 14, marginTop: 14, borderTop: "1px solid var(--border)" }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Haptic Feedback</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                Vibration cues on task completion and targets
              </div>
            </div>
            <input
              type="checkbox"
              checked={appData.hapticsEnabled !== false}
              onChange={(e) => {
                setHapticsEnabled(e.target.checked);
                showToast(e.target.checked ? "Haptic feedback enabled." : "Haptic feedback disabled.");
              }}
              style={{ accentColor: "var(--accent)", width: 18, height: 18, cursor: "pointer" }}
              aria-label="Toggle haptic feedback"
            />
          </label>
        </div>
      </div>

      {/* Goals */}
      <div className="card settings-card">
        <div className="settings-heading">Countdown Goals</div>
        <ActionRow
          icon={<span style={{ fontSize: 20 }}>{"\uD83C\uDFAF"}</span>}
          title="Manage Goals"
          description={
            goals.length === 0
              ? "No goals configured yet."
              : `${goals.length} active goal${goals.length === 1 ? "" : "s"} (${goals.map((g) => g.title).join(", ")})`
          }
          actionLabel="Manage"
          onAction={() => setGoalsOpen(true)}
        />
      </div>

      {/* Reminders & Notifications */}
      <div className="card settings-card">
        <div className="settings-heading">Reminders &amp; Notifications</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* OS/Browser Permission Sub-section */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
              Browser Notifications (System)
            </div>
            <div className="about-details" style={{ margin: 0 }}>
              <div className="about-row">
                <span className="about-label">System support:</span>
                <span className="about-val" style={{ fontWeight: 600 }}>
                  {isSupported ? "Supported" : "Unsupported"}
                </span>
              </div>
              <div className="about-row">
                <span className="about-label">Browser permission:</span>
                <span
                  className="about-val"
                  style={{
                    fontWeight: 600,
                    color:
                      notifPermission === "granted"
                        ? "var(--accent)"
                        : notifPermission === "denied"
                        ? "var(--danger, #ef4444)"
                        : "inherit"
                  }}
                >
                  {notifPermission === "granted"
                    ? "✓ Allowed"
                    : notifPermission === "denied"
                    ? "⚠ Blocked in browser"
                    : notifPermission === "unsupported"
                    ? "Unsupported"
                    : "Not granted"}
                </span>
              </div>
            </div>

            {/* Status Message / Actions */}
            {notifPermission === "unsupported" ? (
              <div className="settings-subtext" style={{ padding: "6px 2px 0", fontSize: 13, color: "var(--ink-muted)" }}>
                Notifications are not supported by this browser.
              </div>
            ) : notifPermission === "denied" ? (
              <div className="settings-subtext" style={{ padding: "6px 2px 0", fontSize: 13, color: "var(--danger, #ef4444)" }}>
                Browser notifications are blocked. Enable them in your browser/device site settings.
              </div>
            ) : notifPermission === "granted" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 40, padding: "0 14px", fontSize: 13 }}
                    onClick={async () => {
                      const sent = await sendTestNotification();
                      if (sent) {
                        showToast("Test notification sent.");
                      } else {
                        showToast("Could not send test notification.");
                      }
                    }}
                  >
                    🔔 Send test notification
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: 42, padding: "0 16px", width: "100%", justifyContent: "center" }}
                  onClick={handleEnableReminders}
                >
                  Enable Browser Reminders
                </button>
              </div>
            )}
          </div>

          {/* In-App Notification Center Sub-section */}
          <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>In-App Notification Center</div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  History, unread alerts, and deep links inside Daily Check
                </div>
              </div>
              <label className="toggle-switch" style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
                <input
                  type="checkbox"
                  checked={notifPrefs.centerEnabled}
                  onChange={(e) => updateNotifPrefs({ centerEnabled: e.target.checked })}
                  aria-label="Toggle Notification Center"
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    inset: 0,
                    backgroundColor: notifPrefs.centerEnabled ? "var(--accent, #10b981)" : "var(--border, #ccc)",
                    borderRadius: 24,
                    transition: "0.2s"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      height: 18,
                      width: 18,
                      left: notifPrefs.centerEnabled ? 22 : 3,
                      bottom: 3,
                      backgroundColor: "white",
                      borderRadius: "50%",
                      transition: "0.2s"
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Category Preferences */}
            {notifPrefs.centerEnabled ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, paddingLeft: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Notification Categories
                </div>

                {[
                  { key: "taskDue", label: "⏰ Task Due Reminders", sub: "Scheduled reminder alerts" },
                  { key: "taskOverdue", label: "⚠️ Overdue Tasks", sub: "Alert when scheduled time passes" },
                  { key: "recurringTask", label: "🔁 Recurring Tasks", sub: "Daily & routine occurrences" },
                  { key: "durationReminder", label: "⏱️ Duration Reminders", sub: "Timed task milestones" },
                  { key: "quantityReminder", label: "💧 Quantity Reminders", sub: "Target check-ins" },
                  { key: "focusReminder", label: "🎯 Focus Reminders", sub: "Top priority task cues" }
                ].map((cat) => (
                  <label
                    key={cat.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      cursor: "pointer",
                      fontSize: 13
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{cat.sub}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean((notifPrefs as any)[cat.key])}
                      onChange={(e) => updateNotifPrefs({ [cat.key]: e.target.checked })}
                      style={{ accentColor: "var(--accent, #10b981)", width: 18, height: 18, cursor: "pointer" }}
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div
            className="settings-subtext"
            style={{
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--ink-muted)",
              lineHeight: 1.45
            }}
          >
            Reminders work while Daily Check is active. Browser or operating-system restrictions may delay notifications when the app is suspended or completely closed.
          </div>
        </div>
      </div>

      {/* App Install */}
      {!installed && canInstall ? (
        <div className="card settings-card">
          <div className="settings-heading">App Installation</div>
          <ActionRow
            icon={<InstallIcon />}
            title="Install App"
            description="Add Daily Check to your home screen for quick, offline access."
            actionLabel="Install"
            onAction={handleInstall}
          />
        </div>
      ) : null}

      {/* Data Management */}
      <div className="card settings-card">
        <div className="settings-heading">Data &amp; Backups</div>

        <ActionRow
          icon={<DownloadIcon />}
          title="Export Backup"
          description="Download a complete JSON backup of your tasks and checklist history."
          actionLabel="Export"
          onAction={handleExport}
        />
        <ActionRow
          icon={<UploadIcon />}
          title="Import Backup"
          description="Restore your Daily Check data from a previously downloaded backup file."
          actionLabel="Import"
          onAction={() => fileRef.current?.click()}
        />
        <ActionRow
          icon={<PrintIcon />}
          title="Print Weekly Progress"
          description="Open formatted weekly view to print or save as a PDF."
          actionLabel="Open"
          onAction={() => navigate("/weekly")}
        />
        <ActionRow
          icon={<TrashIcon />}
          title="Reset All Tasks &amp; History"
          description="Erase all checklists, days, and recurring tasks to start fresh."
          actionLabel="Reset"
          onAction={() => setConfirmResetOpen(true)}
        />

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Storage & Privacy Guarantee */}
      <div className="card settings-card storage-privacy-card">
        <div className="settings-heading">Storage &amp; Privacy Architecture</div>
        <div className="privacy-info-block">
          <div className="privacy-badge">
            <span className="privacy-icon" aria-hidden="true">
              🔒
            </span>
            <strong>100% Client-Side Local Storage</strong>
          </div>
          <p className="privacy-text">
            Your tasks, checklists, and goals are stored <strong>strictly on this device</strong> in your
            browser&rsquo;s local storage. No data is sent to or stored on any external server.
          </p>
          <div className="storage-stat-row">
            <span className="storage-stat-label">Local Storage Used:</span>
            <span className="storage-stat-value">{storageUsage}</span>
          </div>
          <p className="privacy-subtext">
            <strong>Cross-Device Note:</strong> Another person opening or sharing this URL on a different
            device or browser profile starts with their own separate, empty workspace. To transfer your data
            between devices, use the <strong>Export Backup</strong> and <strong>Import Backup</strong> buttons above.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="card settings-card">
        <div className="settings-heading">About Daily Check</div>
        <div className="about-details">
          <div className="about-row">
            <span className="about-label">Application Version:</span>
            <span className="about-val">v{APP_VERSION}</span>
          </div>
          <div className="about-row">
            <span className="about-label">Task Schema:</span>
            <span className="about-val">v{CURRENT_DATA_VERSION}</span>
          </div>
          <div className="about-row">
            <span className="about-label">Countdown Goals Schema:</span>
            <span className="about-val">v{CURRENT_COUNTDOWN_VERSION}</span>
          </div>
          <div className="about-row">
            <span className="about-label">Daily Routines Schema:</span>
            <span className="about-val">v{CURRENT_ROUTINES_VERSION}</span>
          </div>
        </div>
      </div>

      {pendingImport ? (
        <ConfirmModal
          title="Import this backup?"
          message="This will replace your current Daily Check data with the contents of the backup."
          confirmLabel="Import Backup"
          danger
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      ) : null}

      {confirmResetOpen ? (
        <ConfirmModal
          title="Reset All Tasks & History?"
          message="This will erase all daily checklists and task records on this device. This cannot be undone."
          confirmLabel="Reset Everything"
          danger
          onConfirm={() => {
            resetAllData();
            setConfirmResetOpen(false);
            showToast("All tasks and history have been cleared.");
          }}
          onCancel={() => setConfirmResetOpen(false)}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      {goalsOpen ? <GoalsManagerModal onClose={() => setGoalsOpen(false)} /> : null}
    </div>
  );
}
