import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import { useCountdowns } from "../../hooks/useCountdowns";
import { useRoutines } from "../../hooks/useRoutines";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import type { AppData, CountdownsData, RoutinesData, ThemePreference } from "../../types";
import { CURRENT_DATA_VERSION, CURRENT_COUNTDOWN_VERSION, CURRENT_ROUTINES_VERSION } from "../../types";
import { APP_VERSION } from "../../version";
import { exportBackup, parseImportFile, getStorageUsageKb } from "../../utils/storageUtils";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  sendTestNotification
} from "../../utils/notificationUtils";
import { formatDayMonth, todayStr } from "../../utils/dateUtils";
import { dayStats, formatPct } from "../../utils/progressUtils";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import { usePwaInstall } from "../../hooks/usePwaInstall";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "☀️ Light" },
  { value: "dark", label: "🌙 Dark" },
  { value: "auto", label: "🖥️ System" }
];

const IMPORT_ERROR = "Couldn't import this backup. Check that the file is a valid Daily Check backup.";

interface PendingImportState {
  data: AppData;
  countdowns?: CountdownsData;
  routines?: RoutinesData;
}

export default function Settings() {
  const { appData, setTheme, setWeekStartsOn, setHapticsEnabled, replaceAllData, resetAllData, getDay } = useTasks();
  const { countdownsData, replaceAllCountdowns } = useCountdowns();
  const { routines, routinesData, replaceAllRoutines } = useRoutines();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } = useNotificationCenter();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [showTechInfo, setShowTechInfo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, setNotifStateVersion] = useState(0);

  const storageUsage = useMemo(() => getStorageUsageKb(), [appData, routines]);

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

  async function handleShare() {
    const today = todayStr();
    const day = getDay(today);
    const stats = dayStats(day);

    let text = `Daily Check — ${formatDayMonth(today)}: `;
    if (stats.total === 0) {
      text += "Ready to make progress today!";
    } else {
      text += `${stats.completed}/${stats.total} completed (${formatPct(stats.pct)}) · ${stats.remaining} remaining`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Daily Check",
          text
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          await copyToClipboard(text);
        }
      }
    } else {
      await copyToClipboard(text);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast("Daily summary copied to clipboard!");
      } else {
        showToast(text);
      }
    } catch {
      showToast("Could not copy summary");
    }
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
        countdowns: result.countdowns,
        routines: result.routines
      });
    };
    reader.onerror = () => showToast(IMPORT_ERROR);
    reader.readAsText(file);
  }

  function handleExport() {
    exportBackup(appData, countdownsData, routinesData);
    showToast("Backup downloaded.");
  }

  function confirmImport() {
    if (!pendingImport) return;
    replaceAllData(pendingImport.data);
    if (pendingImport.countdowns) {
      replaceAllCountdowns(pendingImport.countdowns);
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
      {/* 1. APPEARANCE */}
      <div className="settings-group">
        <div className="settings-group-label">Appearance</div>
        <div className="settings-group-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Theme</div>
              <div className="settings-row-desc">Light, dark, or follow device theme</div>
            </div>
            <div className="settings-row-action">
              <div className="seg-compact" role="radiogroup" aria-label="Theme preference">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={appData.theme === opt.value}
                    className={appData.theme === opt.value ? "active" : ""}
                    onClick={() => setTheme(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PREFERENCES */}
      <div className="settings-group">
        <div className="settings-group-label">Preferences</div>
        <div className="settings-group-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Week starts on</div>
              <div className="settings-row-desc">Used in calendar views and weekly progress</div>
            </div>
            <div className="settings-row-action">
              <div className="seg-compact" role="radiogroup" aria-label="First day of the week">
                <button
                  type="button"
                  role="radio"
                  aria-checked={(appData.weekStartsOn ?? 1) === 1}
                  className={(appData.weekStartsOn ?? 1) === 1 ? "active" : ""}
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
                  onClick={() => {
                    setWeekStartsOn(0);
                    showToast("Week starts on Sunday.");
                  }}
                >
                  Sunday
                </button>
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Haptic feedback</div>
              <div className="settings-row-desc">Vibration cues on completion &amp; milestones</div>
            </div>
            <div className="settings-row-action">
              <label className="dc-switch" aria-label="Toggle haptic feedback">
                <input
                  type="checkbox"
                  checked={appData.hapticsEnabled !== false}
                  onChange={(e) => {
                    setHapticsEnabled(e.target.checked);
                    showToast(e.target.checked ? "Haptic feedback enabled." : "Haptic feedback disabled.");
                  }}
                />
                <span className="dc-switch-slider" />
              </label>
            </div>
          </div>

          {!installed && canInstall ? (
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-row-title">Install app</div>
                <div className="settings-row-desc">Add Daily Check to home screen for offline access</div>
              </div>
              <div className="settings-row-action">
                <button
                  type="button"
                  className="btn btn-secondary settings-action-btn"
                  onClick={handleInstall}
                >
                  Install →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. NOTIFICATIONS */}
      <div className="settings-group">
        <div className="settings-group-label">Notifications</div>
        <div className="settings-group-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Browser notifications</div>
              <div className="settings-row-desc">
                {notifPermission === "granted"
                  ? "Notifications allowed by browser"
                  : notifPermission === "denied"
                  ? "Blocked in browser site settings"
                  : notifPermission === "unsupported"
                  ? "Unsupported by this browser"
                  : "Receive scheduled reminders and cues"}
              </div>
            </div>
            <div className="settings-row-action">
              {notifPermission === "granted" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="settings-status-pill status-granted">Allowed</span>
                  <button
                    type="button"
                    className="btn btn-secondary settings-btn-compact"
                    onClick={async () => {
                      const sent = await sendTestNotification();
                      showToast(sent ? "Test notification sent." : "Could not send test notification.");
                    }}
                    title="Send a test notification"
                  >
                    🔔 Test
                  </button>
                </div>
              ) : notifPermission === "denied" ? (
                <span className="settings-status-pill status-denied">Blocked</span>
              ) : notifPermission === "unsupported" ? (
                <span className="settings-status-pill status-unsupported">Unsupported</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary settings-btn-compact"
                  onClick={handleEnableReminders}
                >
                  Enable →
                </button>
              )}
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">In-app notification center</div>
              <div className="settings-row-desc">
                Alerts, unread badge, and notification center
              </div>
            </div>
            <div className="settings-row-action">
              <label className="dc-switch" aria-label="Toggle in-app notification center">
                <input
                  type="checkbox"
                  checked={notifPrefs.centerEnabled}
                  onChange={(e) => updateNotifPrefs({ centerEnabled: e.target.checked })}
                />
                <span className="dc-switch-slider" />
              </label>
            </div>
          </div>

          {notifPrefs.centerEnabled ? (
            <>
              <div className="settings-subgroup-label">
                Notification preferences
              </div>

              {[
                { key: "taskDue", label: "Task due reminders", sub: "Scheduled reminder alerts" },
                { key: "taskOverdue", label: "Overdue tasks", sub: "Alert when scheduled time passes" },
                { key: "recurringTask", label: "Recurring tasks", sub: "Daily & routine occurrences" },
                { key: "durationReminder", label: "Duration reminders", sub: "Timed task milestones" },
                { key: "quantityReminder", label: "Quantity reminders", sub: "Target check-ins" },
                { key: "focusReminder", label: "Focus reminders", sub: "Top priority task cues" }
              ].map((cat) => (
                <div key={cat.key} className="settings-row settings-row-sub">
                  <div className="settings-row-text">
                    <div className="settings-row-title">{cat.label}</div>
                    <div className="settings-row-desc">{cat.sub}</div>
                  </div>
                  <div className="settings-row-action">
                    <label className="dc-switch" aria-label={`Toggle ${cat.label}`}>
                      <input
                        type="checkbox"
                        checked={Boolean((notifPrefs as any)[cat.key])}
                        onChange={(e) => updateNotifPrefs({ [cat.key]: e.target.checked })}
                      />
                      <span className="dc-switch-slider" />
                    </label>
                  </div>
                </div>
              ))}
            </>
          ) : null}

          <div className="settings-footnote">
            Reminders work while Daily Check is active. Background delivery depends on browser and operating-system restrictions.
          </div>
        </div>
      </div>

      {/* 4. DATA & BACKUPS */}
      <div className="settings-group">
        <div className="settings-group-label">Data &amp; Backups</div>
        <div className="settings-group-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Export backup</div>
              <div className="settings-row-desc">Download complete JSON backup with history</div>
            </div>
            <div className="settings-row-action">
              <button
                type="button"
                className="btn btn-secondary settings-action-btn"
                onClick={handleExport}
              >
                Export →
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Import backup</div>
              <div className="settings-row-desc">Restore your data from a backup JSON file</div>
            </div>
            <div className="settings-row-action">
              <button
                type="button"
                className="btn btn-secondary settings-action-btn"
                onClick={() => fileRef.current?.click()}
              >
                Import →
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Share daily summary</div>
              <div className="settings-row-desc">Copy or share today’s progress summary</div>
            </div>
            <div className="settings-row-action">
              <button
                type="button"
                className="btn btn-secondary settings-action-btn"
                onClick={handleShare}
              >
                Share →
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Print weekly progress</div>
              <div className="settings-row-desc">Formatted weekly view to print or save as PDF</div>
            </div>
            <div className="settings-row-action">
              <button
                type="button"
                className="btn btn-secondary settings-action-btn"
                onClick={() => navigate("/weekly")}
              >
                Open →
              </button>
            </div>
          </div>

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
      </div>

      {/* 5. STORAGE & PRIVACY */}
      <div className="settings-group">
        <div className="settings-group-label">Storage &amp; Privacy</div>
        <div className="settings-group-card settings-privacy-card">
          <div className="settings-privacy-header">
            <span className="settings-privacy-icon" aria-hidden="true">🔒</span>
            <div className="settings-privacy-badge-text">
              Your data stays on this device
            </div>
          </div>
          <p className="settings-privacy-text">
            Daily Check stores your tasks, checklists, and countdowns locally in your browser storage. Nothing is sent to an external server.
          </p>
          <div className="settings-storage-pill">
            <span className="settings-storage-label">Local storage used:</span>
            <span className="settings-storage-val">{storageUsage}</span>
          </div>
          <p className="settings-privacy-note">
            Each browser profile or device maintains its own separate workspace. To transfer data across devices, use Export and Import under Data &amp; Backups.
          </p>
        </div>
      </div>

      {/* 6. DANGER ZONE */}
      <div className="settings-group">
        <div className="settings-group-label" style={{ color: "var(--danger, #ef4444)" }}>
          Danger Zone
        </div>
        <div className="settings-group-card settings-danger-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title" style={{ color: "var(--danger, #ef4444)" }}>
                Reset all data
              </div>
              <div className="settings-row-desc">
                Permanently erase all daily checklists and task records. This cannot be undone.
              </div>
            </div>
            <div className="settings-row-action">
              <button
                type="button"
                className="btn settings-action-btn-danger"
                onClick={() => setConfirmResetOpen(true)}
              >
                Reset →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. ABOUT */}
      <div className="settings-group">
        <div className="settings-group-label">About</div>
        <div className="settings-group-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <div className="settings-row-title">Daily Check</div>
              <div className="settings-row-desc">
                Version {APP_VERSION} · Local-first productivity app
              </div>
            </div>
            <div className="settings-row-action">
              <button
                type="button"
                className="settings-tech-toggle-btn"
                onClick={() => setShowTechInfo((v) => !v)}
                aria-expanded={showTechInfo}
              >
                Technical information {showTechInfo ? "▴" : "›"}
              </button>
            </div>
          </div>

          {showTechInfo ? (
            <div className="settings-tech-info-block">
              <div className="settings-tech-row">
                <span className="settings-tech-label">Application Version</span>
                <span className="settings-tech-val">v{APP_VERSION}</span>
              </div>
              <div className="settings-tech-row">
                <span className="settings-tech-label">Task Schema</span>
                <span className="settings-tech-val">v{CURRENT_DATA_VERSION}</span>
              </div>
              <div className="settings-tech-row">
                <span className="settings-tech-label">Countdowns Schema</span>
                <span className="settings-tech-val">v{CURRENT_COUNTDOWN_VERSION}</span>
              </div>
              <div className="settings-tech-row">
                <span className="settings-tech-label">Daily Routines Schema</span>
                <span className="settings-tech-val">v{CURRENT_ROUTINES_VERSION}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {pendingImport ? (
        <ConfirmModal
          title="Import this backup?"
          message="This will replace your current Daily Check data with the contents of the backup file."
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
    </div>
  );
}
