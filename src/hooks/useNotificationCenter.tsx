import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import type {
  NotificationPreferences,
  NotificationRecord
} from "../types/notification";
import {
  addNotificationRecord,
  clearAllNotificationRecords,
  deleteNotificationRecord,
  loadNotificationPreferences,
  loadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  saveNotificationPreferences
} from "../utils/notificationStorage";

interface NotificationCenterContextValue {
  notifications: NotificationRecord[];
  unreadCount: number;
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (record: NotificationRecord) => boolean;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>(() => loadNotifications());
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => loadNotificationPreferences());

  useEffect(() => {
    function handleSync() {
      setNotifications(loadNotifications());
      setPreferences(loadNotificationPreferences());
    }

    // Sync across window tabs and within app when notifications change
    window.addEventListener("dailycheck:notifications_updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("dailycheck:notifications_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function updatePreferences(updates: Partial<NotificationPreferences>) {
    const next = { ...preferences, ...updates };
    setPreferences(next);
    saveNotificationPreferences(next);
  }

  function handleMarkAsRead(id: string) {
    markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function handleMarkAllAsRead() {
    markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleDeleteNotification(id: string) {
    deleteNotificationRecord(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function handleClearAll() {
    clearAllNotificationRecords();
    setNotifications([]);
  }

  function handleAddNotification(record: NotificationRecord): boolean {
    const added = addNotificationRecord(record);
    if (added) {
      setNotifications(loadNotifications());
    }
    return added;
  }

  const value: NotificationCenterContextValue = {
    notifications,
    unreadCount,
    preferences,
    updatePreferences,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    clearAll: handleClearAll,
    addNotification: handleAddNotification
  };

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter(): NotificationCenterContextValue {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) {
    throw new Error("useNotificationCenter must be used within a NotificationCenterProvider");
  }
  return ctx;
}
