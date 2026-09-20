import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import type { AppData, ThemePreference } from "../../types";
import { CURRENT_DATA_VERSION, CURRENT_COUNTDOWN_VERSION } from "../../types";
import { exportBackup, parseImportFile } from "../../utils/storageUtils";
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
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
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
        // Current data is left completely untouched on any validation failure.
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
    <div className="page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <div className="page-title">Settings</div>
      </div>

      <div className="settings-section">
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

      <div className="settings-section">
        <div className="settings-heading">Goals</div>
        <ActionRow
          icon={<span style={{ fontSize: 18 }}>{"\uD83C\uDFAF"}</span>}
          title="Countdown Goals"
          description="Create and manage calendar-day countdowns shown on Today."
          actionLabel="Manage"
          onAction={() => setGoalsOpen(true)}
        />
      </div>

      {!installed ? (
        <div className="settings-section">
          <div className="settings-heading">App</div>
          {canInstall ? (
            <ActionRow
              icon={<InstallIcon />}
              title="Install App"
              description="Add Daily Check to your home screen for quick, offline access."
              actionLabel="Install"
              onAction={handleInstall}
            />
          ) : (
            <p className="settings-note">
              On Android Chrome, use the browser menu {"\u2192"} <strong>Install app</strong> (or{" "}
              <strong>Add to Home screen</strong>). On iOS Safari, use Share {"\u2192"}{" "}
              <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
      ) : null}

      <div className="settings-section">
        <div className="settings-heading">Data</div>

        <ActionRow
          icon={<DownloadIcon />}
          title="Export Backup"
          description="Download a backup of your Daily Check data."
          actionLabel="Export"
          onAction={handleExport}
        />
        <ActionRow
          icon={<UploadIcon />}
          title="Import Backup"
          description="Restore Daily Check data from a backup file."
          actionLabel="Import"
          onAction={() => fileRef.current?.click()}
        />
        <ActionRow
          icon={<PrintIcon />}
          title="Print Weekly Progress"
          description="Open Weekly Progress to print or save it as a PDF."
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

        <p className="settings-note" style={{ marginTop: 4 }}>
          <strong>Your data is stored on this device.</strong> Export a backup regularly so you can restore it if
          browser storage is cleared.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-heading">About</div>
        <p className="settings-note">
          Daily Check
          <br />
          Version 4.1 {"\u00B7"} data schema v{CURRENT_DATA_VERSION} {"\u00B7"} countdown goals schema v
          {CURRENT_COUNTDOWN_VERSION}
        </p>
        <p className="settings-note" style={{ marginTop: 8 }}>
          Data is stored only on this device, in this browser (or this installed app if you opened it that
          way) — never on a server. A different device or browser always starts empty; use Export/Import to
          move data between them.
        </p>
      </div>

      {pendingImport ? (
        <ConfirmModal
          title="Import this backup?"
          message="This will replace your current Daily Check data."
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
