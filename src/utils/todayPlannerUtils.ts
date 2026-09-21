import type { Priority, Task } from "../types";
import { toDateStr } from "./dateUtils";
import { getTaskScheduleStatus, isValidDateString, isValidTimeString } from "./scheduleUtils";

export type PlannerTier = 1 | 2 | 3 | 4 | 5;

export interface PlannedTask {
  task: Task;
  tier: PlannerTier;
  tierLabel: string;
  isOverdue: boolean;
  isFocus: boolean;
  hasDueTime: boolean;
}

/**
 * Checks if a task is overdue for a given date view and current device time.
 */
export function isTaskOverdue(
  task: Task,
  dateStr: string,
  currentDateObj: Date = new Date()
): boolean {
  if (task.completed) return false;

  const today = toDateStr(currentDateObj);

  // If task has explicit due date in the past
  if (task.dueDate && isValidDateString(task.dueDate) && task.dueDate < today) {
    return true;
  }

  // If the view date is in the past
  if (dateStr < today) {
    return true;
  }

  // If today and scheduled time has passed
  if (task.dueTime && isValidTimeString(task.dueTime)) {
    return getTaskScheduleStatus(task, dateStr, currentDateObj) === "overdue";
  }

  return false;
}

/**
 * Evaluates the deterministic urgency tier and badges for a task.
 */
export function getTaskTier(
  task: Task,
  dateStr: string,
  currentDateObj: Date = new Date()
): {
  tier: PlannerTier;
  tierLabel: string;
  isOverdue: boolean;
  isFocus: boolean;
  hasDueTime: boolean;
} {
  const overdue = isTaskOverdue(task, dateStr, currentDateObj);
  const focus = Boolean(task.focusDate === dateStr || task.focusDates?.[dateStr]);
  const hasTime = Boolean(task.dueTime && isValidTimeString(task.dueTime));
  const isHighPrio = task.priority === 1;

  if (overdue) {
    return {
      tier: 1,
      tierLabel: "Overdue",
      isOverdue: true,
      isFocus: focus,
      hasDueTime: hasTime
    };
  }

  if (focus) {
    return {
      tier: 2,
      tierLabel: "Focus",
      isOverdue: false,
      isFocus: true,
      hasDueTime: hasTime
    };
  }

  if (hasTime) {
    return {
      tier: 3,
      tierLabel: "Scheduled",
      isOverdue: false,
      isFocus: false,
      hasDueTime: true
    };
  }

  if (isHighPrio) {
    return {
      tier: 4,
      tierLabel: "High Priority",
      isOverdue: false,
      isFocus: false,
      hasDueTime: false
    };
  }

  return {
    tier: 5,
    tierLabel: "Remaining",
    isOverdue: false,
    isFocus: false,
    hasDueTime: false
  };
}

/**
 * Compares two planned tasks using deterministic V11 planner ordering rules:
 * 1. Urgency tier (1. Overdue, 2. Focus, 3. Due time, 4. High Priority, 5. Remaining)
 * 2. Earlier due time first
 * 3. Higher priority first (1 > 2 > 3)
 * 4. Preserves natural task order as tie-breaker
 */
export function comparePlannedTasks(a: PlannedTask, b: PlannedTask): number {
  if (a.tier !== b.tier) {
    return a.tier - b.tier;
  }

  // Within same tier: Earlier due time first
  const aTime = a.task.dueTime && isValidTimeString(a.task.dueTime) ? a.task.dueTime.trim() : null;
  const bTime = b.task.dueTime && isValidTimeString(b.task.dueTime) ? b.task.dueTime.trim() : null;

  if (aTime && bTime) {
    const timeDiff = aTime.localeCompare(bTime);
    if (timeDiff !== 0) return timeDiff;
  } else if (aTime && !bTime) {
    return -1;
  } else if (!aTime && bTime) {
    return 1;
  }

  // Higher priority first (1 < 2 < 3)
  if (a.task.priority !== b.task.priority) {
    return a.task.priority - b.task.priority;
  }

  // Final tie-breaker: order
  return a.task.order - b.task.order;
}

/**
 * Builds the deterministic, deduplicated Today's Plan from active tasks for the given date.
 * Completed tasks are excluded from the active execution plan.
 */
export function getTodayPlan(
  tasks: Task[],
  dateStr: string,
  currentDateObj: Date = new Date()
): PlannedTask[] {
  if (!tasks || tasks.length === 0) return [];

  // Filter only incomplete tasks
  const activeTasks = tasks.filter((t) => !t.completed);
  if (activeTasks.length === 0) return [];

  const planned: PlannedTask[] = activeTasks.map((task) => {
    const meta = getTaskTier(task, dateStr, currentDateObj);
    return {
      task,
      ...meta
    };
  });

  return planned.sort(comparePlannedTasks);
}
