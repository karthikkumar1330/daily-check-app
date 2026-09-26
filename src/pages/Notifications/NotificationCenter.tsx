import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import type { NotificationRecord, NotificationType } from "../../types/notification";
import { formatDayMonth, toDateStr, todayStr } from "../../utils/dateUtils";
import { CloseIcon } from "../../components/icons";
import ConfirmModal from "../../components/Modals/ConfirmModal";

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
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotificationCenter();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

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
      navigate(`/today?date=${encodeURIComponent(targetDate)}&taskId=${encodeURIComponent(n.taskId)}&action=${encodeURIComponent(action)}`);
      return;
    }

    if (n.action?.type === "open_today") {
      navigate("/today");
    }
  }

  return (
    <div className="page notification-center-page" style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div className="notif-center-header">
        <div className="notif-center-title-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }} aria-hidden="true">🔔</span>
            <h1 className="page-title" style={{ margin: 0 }}>Notifications</h1>
            {unreadCount > 0 ? (
              <span className="notif-badge-header" aria-label={`${unreadCount} unread`}>
                {unreadCount} unread
              </span>
            ) : null}
          </div>

          <div className="notif-center-actions">
            {unreadCount > 0 ? (
              <button
                type="button"
                className="link-btn notif-action-btn"
                onClick={markAllAsRead}
                aria-label="Mark all notifications as read"
              >
                Mark all as read
              </button>
            ) : null}
            {notifications.length > 0 ? (
              <button
                type="button"
                className="link-btn notif-action-btn notif-clear-btn"
                onClick={() => setConfirmClearOpen(true)}
                aria-label="Clear all notifications"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
        <div className="empty-state notif-empty-state">
          <div className="empty-icon" aria-hidden="true" style={{ fontSize: "2.8rem", marginBottom: 12 }}>
            🔔
          </div>
          <h2 className="empty-title" style={{ fontSize: "1.1rem", marginBottom: 6 }}>
            No notifications yet
          </h2>
          <p className="empty-sub" style={{ fontSize: "0.9rem", color: "var(--ink-muted)", margin: 0, maxWidth: 360 }}>
            Your task reminders, scheduled notifications, and achievements will appear here.
          </p>
        </div>
      ) : (
        <div className="notif-list-container">
          {/* TODAY SECTION */}
          {todayNotifications.length > 0 ? (
            <div className="notif-section">
              <div className="notif-section-heading">TODAY</div>
              <div className="notif-cards-stack">
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
            </div>
          ) : null}

          {/* EARLIER SECTION */}
          {earlierNotifications.length > 0 ? (
            <div className="notif-section" style={{ marginTop: todayNotifications.length > 0 ? 24 : 0 }}>
              <div className="notif-section-heading">EARLIER</div>
              <div className="notif-cards-stack">
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
            </div>
          ) : null}
        </div>
      )}

      {confirmClearOpen ? (
        <ConfirmModal
          title="Clear all notifications?"
          message="This will remove all notifications from your history. This cannot be undone."
          confirmLabel="Clear all"
          danger
          onConfirm={() => {
            clearAll();
            setConfirmClearOpen(false);
          }}
          onCancel={() => setConfirmClearOpen(false)}
        />
      ) : null}
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
      className={`notif-card ${notification.read ? "read" : "unread"} ${isActionable ? "actionable" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isActionable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${notification.read ? "Read" : "Unread"}: ${notification.title}`}
    >
      <div className="notif-card-icon" aria-hidden="true">
        {icon}
      </div>

      <div className="notif-card-content">
        <div className="notif-card-top">
          <div className="notif-card-title">{notification.title}</div>
          <div className="notif-card-time">{timeText}</div>
        </div>
        <div className="notif-card-body">{notification.body}</div>
      </div>

      <div className="notif-card-end">
        {!notification.read ? (
          <span className="notif-unread-dot" aria-label="Unread" title="Unread" />
        ) : null}
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
