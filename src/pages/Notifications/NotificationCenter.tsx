import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import type { NotificationPreferences, NotificationRecord, NotificationType } from "../../types/notification";
import { formatDayMonth, toDateStr, todayStr } from "../../utils/dateUtils";
import { CloseIcon } from "../../components/icons";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationSupportStatus
} from "../../utils/notificationUtils";

const NOTIFICATION_TYPES: Array<{
  key: keyof Omit<NotificationPreferences, "centerEnabled">;
  label: string;
  desc: string;
}> = [
  { key: "taskDue", label: "Task due reminders", desc: "Scheduled reminder alerts" },
  { key: "taskOverdue", label: "Overdue tasks", desc: "Alert when scheduled time passes" },
  { key: "recurringTask", label: "Recurring tasks", desc: "Daily & routine occurrences" },
  { key: "durationReminder", label: "Duration reminders", desc: "Timed task milestones" },
  { key: "quantityReminder", label: "Quantity reminders", desc: "Target check-ins" },
  { key: "focusReminder", label: "Focus reminders", desc: "Top priority task cues" }
];

function formatNotificationTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const timeStr = `${displayHours}:${minutes} ${ampm}`;

    const today = todayStr();
    const itemDateStr = toDateStr(d);

    if (itemDateStr === today) {
      return timeStr;
    }
    return `${formatDayMonth(itemDateStr)}, ${timeStr}`;
  } catch {
    return "";
  }
}

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "task_due":
      return "⏰";
    case "task_overdue":
      return "⚠️";
    case "recurring_task":
      return "🔁";
    case "duration_reminder":
      return "⏱️";
    case "quantity_reminder":
      return "💧";
    case "focus_reminder":
      return "🎯";
    case "achievement":
      return "🏆";
    case "general":
    default:
      return "🔔";
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    preferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotificationCenter();

  const [permission, setPermission] = useState<NotificationSupportStatus>(() => getNotificationPermission());
  const [showPreferences, setShowPreferences] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3200);
  }

  // Sync permission state when window regains focus
  useEffect(() => {
    function handleFocus() {
      setPermission(getNotificationPermission());
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  async function handleRequestPermission() {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      showToast("Notifications enabled.");
    } else if (result === "denied") {
      showToast("Notifications were blocked by the browser.");
    }
  }

  async function handleSendTest() {
    const sent = await sendTestNotification();
    showToast(sent ? "Test notification sent." : "Could not display test notification.");
  }

  const todayNotifications: NotificationRecord[] = [];
  const earlierNotifications: NotificationRecord[] = [];

  for (const n of notifications) {
    try {
      const d = new Date(n.createdAt);
      const datePart = !isNaN(d.getTime()) ? toDateStr(d) : "";
      if (datePart && datePart === todayStr()) {
        todayNotifications.push(n);
      } else {
        earlierNotifications.push(n);
      }
    } catch {
      earlierNotifications.push(n);
    }
  }

  function handleCardClick(n: NotificationRecord) {
    markAsRead(n.id);

    if (n.taskId) {
      const targetDate = n.dateStr || todayStr();
      const action = n.action?.type || "open_task";
      navigate(
        `/today?date=${encodeURIComponent(targetDate)}&taskId=${encodeURIComponent(n.taskId)}&action=${encodeURIComponent(action)}`
      );
      return;
    }

    if (n.action?.type === "open_today") {
      navigate("/today");
    }
  }

  return (
    <div className="page notif-page">
      {/* 1. PERMISSION / AVAILABILITY STATUS */}
      <div className="notif-status-card" role="region" aria-label="Notification permission status">
        <div className="notif-status-left">
          <div className="notif-status-icon" aria-hidden="true">
            {permission === "granted" ? "🔔" : permission === "denied" ? "🔕" : "📣"}
          </div>
          <div className="notif-status-info">
            <div className="notif-status-title-row">
              <span className="notif-status-title">Browser notifications</span>
              <span className={`notif-status-pill status-${permission}`}>
                {permission === "granted"
                  ? "Enabled"
                  : permission === "denied"
                  ? "Blocked"
                  : permission === "unsupported"
                  ? "Unsupported"
                  : "Permission required"}
              </span>
            </div>
            <p className="notif-status-desc">
              {permission === "granted"
                ? "Scheduled alerts and daily reminders are enabled on this device."
                : permission === "denied"
                ? "Notifications are blocked in your browser site settings. Enable them in browser settings."
                : permission === "unsupported"
                ? "Browser notifications are not supported in this browser."
                : "Enable notifications to receive task reminders and scheduled cues."}
            </p>
          </div>
        </div>

        <div className="notif-status-actions">
          {permission === "default" && (
            <button
              type="button"
              className="btn btn-primary notif-enable-btn"
              onClick={handleRequestPermission}
              aria-label="Enable browser notifications"
            >
              Enable
            </button>
          )}
          {permission === "granted" && (
            <button
              type="button"
              className="btn btn-secondary notif-test-btn"
              onClick={handleSendTest}
              aria-label="Send test notification"
            >
              Send test
            </button>
          )}
        </div>
      </div>

      {/* 2. NOTIFICATION CONTROLS (CATEGORY TOGGLES) */}
      <div className="notif-controls-section" role="region" aria-label="Notification types">
        <div className="notif-section-header">
          <h2 className="notif-section-title">Notification Types</h2>
          <button
            type="button"
            className="notif-collapse-toggle"
            onClick={() => setShowPreferences((prev) => !prev)}
            aria-expanded={showPreferences}
            aria-label={showPreferences ? "Hide notification types configuration" : "Configure notification types"}
          >
            {showPreferences ? "Hide" : "Configure"}
          </button>
        </div>

        {showPreferences && (
          <div className="notif-controls-group">
            {NOTIFICATION_TYPES.map((cat) => (
              <div key={cat.key} className="notif-control-row">
                <div className="notif-control-text">
                  <span className="notif-control-title">{cat.label}</span>
                  <span className="notif-control-desc">{cat.desc}</span>
                </div>
                <label className="dc-switch" aria-label={`Toggle ${cat.label}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[cat.key])}
                    onChange={(e) => updatePreferences({ [cat.key]: e.target.checked })}
                  />
                  <span className="dc-switch-slider" />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. NOTIFICATION HISTORY */}
      <div className="notif-history-section" role="region" aria-label="Recent notifications">
        <div className="notif-history-header">
          <div className="notif-history-title-row">
            <h2 className="notif-section-title">Recent Notifications</h2>
            {unreadCount > 0 && (
              <span className="notif-unread-count-pill" aria-label={`${unreadCount} unread`}>
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="notif-history-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="link-btn notif-action-btn"
                onClick={markAllAsRead}
                aria-label="Mark all notifications as read"
                style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="link-btn notif-action-btn notif-clear-btn"
                onClick={() => setConfirmClearOpen(true)}
                aria-label="Clear all notifications"
                style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="notif-empty-card" role="region" aria-label="No notifications yet">
            <div className="notif-empty-icon" aria-hidden="true">
              🔔
            </div>
            <div className="notif-empty-title">No notifications yet</div>
            <div className="notif-empty-desc">
              Notifications will appear here when Daily Check sends them.
            </div>
          </div>
        ) : (
          <div className="notif-list-container" role="list">
            {/* TODAY SECTION */}
            {todayNotifications.length > 0 && (
              <div className="notif-section-group">
                <div className="notif-date-subheading">Today</div>
                {todayNotifications.map((item) => (
                  <NotificationItem
                    key={item.id}
                    notification={item}
                    onClick={() => handleCardClick(item)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                  />
                ))}
              </div>
            )}

            {/* EARLIER SECTION */}
            {earlierNotifications.length > 0 && (
              <div className="notif-section-group">
                <div className="notif-date-subheading">Earlier</div>
                {earlierNotifications.map((item) => (
                  <NotificationItem
                    key={item.id}
                    notification={item}
                    onClick={() => handleCardClick(item)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clear All */}
      {confirmClearOpen && (
        <ConfirmModal
          title="Clear all notifications?"
          message="This will remove all notifications from your history. This cannot be undone."
          confirmLabel="Clear all"
          danger
          onConfirm={() => {
            clearAll();
            setConfirmClearOpen(false);
            showToast("Cleared notification history.");
          }}
          onCancel={() => setConfirmClearOpen(false)}
        />
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationRecord;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
  const icon = getNotificationIcon(notification.type);
  const timeText = formatNotificationTime(notification.createdAt);
  const isActionable = Boolean(notification.taskId || notification.action?.type === "open_today");

  return (
    <div
      role={isActionable ? "button" : "article"}
      tabIndex={isActionable ? 0 : undefined}
      className={`notif-item-row ${notification.read ? "is-read" : "is-unread"} ${
        isActionable ? "is-actionable" : ""
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isActionable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${notification.read ? "Read" : "Unread"}: ${notification.title}`}
    >
      <div className="notif-item-icon" aria-hidden="true">
        {icon}
      </div>

      <div className="notif-item-content">
        <div className="notif-item-top">
          <div className="notif-item-title">{notification.title}</div>
          <div className="notif-item-time">{timeText}</div>
        </div>
        <div className="notif-item-body">{notification.body}</div>
      </div>

      <div className="notif-item-end">
        {!notification.read && (
          <span className="notif-unread-dot" aria-label="Unread" title="Unread" />
        )}
        <button
          type="button"
          className="icon-btn notif-delete-btn"
          onClick={onDelete}
          aria-label={`Delete notification: ${notification.title}`}
          title="Delete notification"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
