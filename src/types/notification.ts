export type NotificationType =
  | "task_due"
  | "task_overdue"
  | "recurring_task"
  | "duration_reminder"
  | "quantity_reminder"
  | "focus_reminder"
  | "general"
  | "achievement";

export type NotificationActionType =
  | "open_task"
  | "open_task_details"
  | "open_today"
  | "open_focus"
  | "open_notifications";

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO string e.g. 2026-09-23T08:30:00.000Z
  read: boolean;
  taskId?: string;
  dateStr?: string;
  action?: {
    type: NotificationActionType;
  };
  metadata?: {
    taskType?: "checklist" | "duration" | "quantity";
    dueTime?: string | null;
    category?: string;
    priority?: number;
  };
}

export interface NotificationPreferences {
  centerEnabled: boolean;
  taskDue: boolean;
  taskOverdue: boolean;
  recurringTask: boolean;
  durationReminder: boolean;
  quantityReminder: boolean;
  focusReminder: boolean;
}
