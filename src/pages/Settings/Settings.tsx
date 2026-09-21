import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import type { AppData, ThemePreference } from "../../types";
import { CURRENT_DATA_VERSION, CURRENT_COUNTDOWN_VERSION } from "../../types";
import { exportBackup, parseImportFile, getStorageUsageKb } from "../../utils/storageUtils";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  sendTestNotification
} from "../../utils/notificationUtils";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import ActionRow from "../../components/ActionRow/ActionRow";
import { DownloadIcon, InstallIcon, PrintIcon, UploadIcon } from "../../components/icons";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import GoalsManagerModal from "../../components/CountdownGoal/GoalsManagerModal";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "\u2600\uFE0F Light" },
  { value: "dark", label: "\uD83C\uDF19 Dark" },
  { value: "auto", label: "\uD83D\uDDA5\uFE0F System" }
];

const IMPORT_ERROR = "Couldn't import this backup. Check that the file is a valid Daily Check backup.";

export default function Settings() {
  const { appData, setTheme, replaceAllData } = useTasks();
  const { goals } = useCountdownGoals();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [, setNotifStateVersion] = useState(0);

  const storageUsage = useMemo(() => getStorageUsageKb(), [appData, goals]);

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
    exportBackup(appData);
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
      setPendingImport(result.data);
    };
    reader.onerror = () => showToast(IMPORT_ERROR);
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pendingImport) return;
    replaceAllData(pendingImport);
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

      {/* Appearance */}
      <div className="card settings-card">
        <div className="settings-heading">Appearance</div>
        <div className="seg" style={{ width: "100%" }} role="radiogroup" aria-label="Theme">
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="about-details" style={{ margin: 0 }}>
            <div className="about-row">
              <span className="about-label">Notification support:</span>
              <span className="about-val" style={{ fontWeight: 600 }}>
                {isSupported ? "Supported" : "Unsupported"}
              </span>
            </div>
            <div className="about-row">
              <span className="about-label">Permission:</span>
              <span className="about-val" style={{ fontWeight: 600 }}>
                {notifPermission === "granted"
                  ? "Granted"
                  : notifPermission === "denied"
                  ? "Denied"
                  : notifPermission === "unsupported"
                  ? "Unsupported"
                  : "Not granted"}
              </span>
            </div>
          </div>

          {/* Status Message / Actions */}
          {notifPermission === "unsupported" ? (
            <div className="settings-subtext" style={{ padding: "0 2px", fontSize: 13, color: "var(--ink-muted)" }}>
              Notifications are not supported by this browser.
            </div>
          ) : notifPermission === "denied" ? (
            <div className="settings-subtext" style={{ padding: "0 2px", fontSize: 13, color: "var(--danger, #ef4444)" }}>
              Notifications are blocked. Enable them in your browser/device settings.
            </div>
          ) : notifPermission === "granted" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", padding: "0 2px" }}>
                ✓ Reminders enabled
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 44, padding: "0 16px" }}
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
            <div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: 44, padding: "0 18px", width: "100%", justifyContent: "center" }}
                onClick={handleEnableReminders}
              >
                Enable Reminders
              </button>
            </div>
          )}

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
            Reminders work while Daily Check is running. Browser or operating-system restrictions may delay notifications when the app is suspended or completely closed.
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
            <span className="about-val">V5.1</span>
          </div>
          <div className="about-row">
            <span className="about-label">Task Schema:</span>
            <span className="about-val">v{CURRENT_DATA_VERSION}</span>
          </div>
          <div className="about-row">
            <span className="about-label">Countdown Goals Schema:</span>
            <span className="about-val">v{CURRENT_COUNTDOWN_VERSION}</span>
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

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      {goalsOpen ? <GoalsManagerModal onClose={() => setGoalsOpen(false)} /> : null}
    </div>
  );
}
