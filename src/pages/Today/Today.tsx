import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import type { Task } from "../../types";
import { addDays, formatDayMonth, isValidDateStr, todayStr, weekdayFull } from "../../utils/dateUtils";
import { consumePendingDeepLink } from "../../utils/notificationStorage";
import { dayStats } from "../../utils/progressUtils";
import DateNavigator from "../../components/DateNavigator/DateNavigator";
import ProgressCard from "../../components/ProgressCard/ProgressCard";
import CountdownCard from "../../components/CountdownGoal/CountdownCard";
import TodayRoutinesBar from "../../components/Routines/TodayRoutinesBar";
import TodayPlanSection from "../../components/Planner/TodayPlanSection";
import TodayFocusSection from "../../components/Focus/TodayFocusSection";
import FocusSelectorModal from "../../components/Focus/FocusSelectorModal";
import QuickAddTask from "../../components/QuickAddTask/QuickAddTask";
import TaskList from "../../components/TaskList/TaskList";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import AddTaskModal from "../../components/Modals/AddTaskModal";
import TaskDetailsModal from "../../components/TaskDetails/TaskDetailsModal";

export default function Today() {
  const {
    getDay,
    addTask,
    toggleTask,
    toggleFocus,
    setFocusTasks,
    saveEdit,
    deleteTask,
    moveTask,
    clearCompleted
  } = useTasks();

  const [searchParams, setSearchParams] = useSearchParams();
  const [viewDate, setViewDate] = useState(todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ taskId: string; title: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [focusSelectorOpen, setFocusSelectorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deepLinkModalTask, setDeepLinkModalTask] = useState<Task | null>(null);

  // Consume deep links from URL query parameters or pending service-worker click storage
  useEffect(() => {
    const paramDate = searchParams.get("date");
    const paramTaskId = searchParams.get("taskId");
    const paramAction = searchParams.get("action");

    const pending = consumePendingDeepLink();

    const targetDate = paramDate || pending?.dateStr;
    const targetTaskId = paramTaskId || pending?.taskId;
    const targetAction = paramAction || pending?.action?.type || "open_task";

    if (!targetTaskId && !targetDate) return;

    const resolvedDate = targetDate && isValidDateStr(targetDate) ? targetDate : viewDate;
    if (resolvedDate !== viewDate) {
      setViewDate(resolvedDate);
    }

    if (targetTaskId) {
      const dayData = getDay(resolvedDate);
      const foundTask = dayData.tasks.find((t) => t.id === targetTaskId);

      if (foundTask) {
        if (targetAction === "open_task_details") {
          setDeepLinkModalTask(foundTask);
        } else if (targetAction === "open_focus") {
          const focusSec = document.getElementById("today-focus-section");
          if (focusSec) {
            focusSec.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else {
          // "open_task" -> scroll into view and pulse highlight
          setTimeout(() => {
            const el = document.getElementById(`task-${foundTask.id}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("task-deep-link-highlight");
              setTimeout(() => el.classList.remove("task-deep-link-highlight"), 2500);
            }
          }, 200);
        }
      } else {
        showToast("Task not found for this date.");
      }
    }

    // Clean up query parameters so back/refresh doesn't re-trigger
    if (paramDate || paramTaskId || paramAction) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  // Listen for real-time notification click messages from active Service Worker
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    function handleSwMessage(event: MessageEvent) {
      if (event.data && event.data.type === "DAILY_CHECK_NOTIFICATION_CLICK") {
        const notifData = event.data.data;
        if (notifData) {
          const tDate = notifData.dateStr;
          const tId = notifData.taskId;
          const tAction = notifData.action?.type || "open_task";
          const resDate = tDate && isValidDateStr(tDate) ? tDate : viewDate;
          if (resDate !== viewDate) setViewDate(resDate);

          if (tId) {
            const dayData = getDay(resDate);
            const found = dayData.tasks.find((t: Task) => t.id === tId);
            if (found) {
              if (tAction === "open_task_details") {
                setDeepLinkModalTask(found);
              } else {
                setTimeout(() => {
                  const el = document.getElementById(`task-${found.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("task-deep-link-highlight");
                    setTimeout(() => el.classList.remove("task-deep-link-highlight"), 2500);
                  }
                }, 200);
              }
            }
          }
        }
      }
    }

    navigator.serviceWorker.addEventListener("message", handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleSwMessage);
  }, [viewDate, getDay]);

  const isToday = viewDate === todayStr();
  const day = getDay(viewDate);
  const stats = dayStats(day);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function handleToggleFocus(taskId: string) {
    const res = toggleFocus(viewDate, taskId);
    if (!res.ok && res.reason) {
      showToast(res.reason);
    }
  }

  return (
    <div className="page today-page">
      <div className="today-header-block">
        <div className="today-weekday-label">{weekdayFull(viewDate)}</div>
        <h1 className="today-date-heading">{formatDayMonth(viewDate)}</h1>
        <p className="page-greeting">
          {isToday ? "Let’s make today count 💪" : "Looking back at this day"}
        </p>
      </div>


      {/* 2. Day navigation */}
      <DateNavigator
        viewDate={viewDate}
        isToday={isToday}
        onPrev={() => {
          setViewDate(addDays(viewDate, -1));
          setEditingId(null);
        }}
        onNext={() => {
          setViewDate(addDays(viewDate, 1));
          setEditingId(null);
        }}
        onToday={() => {
          setViewDate(todayStr());
          setEditingId(null);
        }}
      />

      {/* 3. Today's Progress */}
      <ProgressCard stats={stats} isToday={isToday} />

      {/* 4 & 5. Primary Countdown Goal + Secondary Countdown Goals */}
      <CountdownCard />

      {/* V11 Smart Today Planner */}
      <TodayPlanSection
        dateStr={viewDate}
        tasks={day.tasks}
        onToggleTask={(id) => toggleTask(viewDate, id)}
        onToast={showToast}
      />

      {/* Today's Focus Section */}
      <TodayFocusSection
        dateStr={viewDate}
        tasks={day.tasks}
        onToggleTask={(id) => toggleTask(viewDate, id)}
        onToggleFocus={handleToggleFocus}
        onOpenSelector={() => setFocusSelectorOpen(true)}
      />

      {/* 6. Quick Add */}
      <div className="quick-add-section">
        <QuickAddTask onAdd={(title) => addTask(viewDate, title)} />
        <button
          className="link-btn add-advanced-link"
          onClick={() => setAdvancedOpen(true)}
          aria-label="Add task with priority, category and notes"
        >
          + Add with priority, category &amp; notes
        </button>
      </div>

      {/* Routines Quick Bar */}
      <TodayRoutinesBar viewDate={viewDate} onToast={showToast} />

      {/* 7. Today's Checklist */}
      <div className="checklist-section">
        <div className="section-row checklist-header">
          <div className="checklist-title-wrap">
            <h2 className="section-title checklist-heading">
              Today&rsquo;s Checklist
            </h2>
            {stats.total > 0 ? (
              <span className="checklist-count-pill" aria-label={`${stats.completed} of ${stats.total} tasks completed`}>
                {stats.completed}/{stats.total} done
              </span>
            ) : null}
          </div>
          {stats.completed > 0 ? (
            <button className="link-btn clear-completed-btn" onClick={() => setConfirmClear(true)}>
              Clear completed
            </button>
          ) : null}
        </div>

        {day.tasks.length === 0 ? (
          <EmptyState variant="no-tasks" />
        ) : (
          <>
            <TaskList
              tasks={day.tasks}
              editingId={editingId}
              dateStr={viewDate}
              onToggle={(id) => toggleTask(viewDate, id)}
              onToggleFocus={handleToggleFocus}
              onStartEdit={(id) => setEditingId(id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(id, updates) => {
                saveEdit(viewDate, id, updates);
                setEditingId(null);
              }}
              onDelete={(id) => {
                const t = day.tasks.find((x) => x.id === id);
                if (t) setConfirmDeleteTask({ taskId: id, title: t.title });
              }}
              onMove={(id, dir) => moveTask(viewDate, id, dir)}
              onToast={showToast}
            />
            {stats.remaining === 0 && stats.total > 0 ? <EmptyState variant="all-done" /> : null}
          </>
        )}
      </div>

      {focusSelectorOpen ? (
        <FocusSelectorModal
          dateStr={viewDate}
          tasks={day.tasks}
          initialFocusIds={day.tasks.filter((t) => t.focusDate === viewDate).map((t) => t.id)}
          onSave={(selectedIds) => {
            const res = setFocusTasks(viewDate, selectedIds);
            if (!res.ok && res.reason) {
              showToast(res.reason);
            } else {
              showToast(
                selectedIds.length === 0
                  ? "Focus tasks cleared."
                  : `Focus updated (${selectedIds.length}/3).`
              );
            }
          }}
          onClose={() => setFocusSelectorOpen(false)}
        />
      ) : null}

      {confirmDeleteTask ? (
        <ConfirmModal
          title={`Delete \u201c${confirmDeleteTask.title}\u201d?`}
          message="This can’t be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteTask(viewDate, confirmDeleteTask.taskId);
            setConfirmDeleteTask(null);
          }}
          onCancel={() => setConfirmDeleteTask(null)}
        />
      ) : null}

      {confirmClear ? (
        <ConfirmModal
          title="Clear completed tasks?"
          message="Clear all completed tasks for this day? This can’t be undone."
          confirmLabel="Clear completed"
          danger
          onConfirm={() => {
            clearCompleted(viewDate);
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      ) : null}

      {advancedOpen ? (
        <AddTaskModal
          initialDate={viewDate}
          onAdd={(
            title,
            priority,
            category,
            notes,
            recurrence,
            dueTime,
            reminderMinutes,
            dueDate,
            durationTargetMinutes,
            quantityTarget,
            quantityUnit,
            quantityStep
          ) => {
            addTask(
              viewDate,
              title,
              priority,
              category,
              notes,
              recurrence,
              dueTime,
              reminderMinutes,
              dueDate,
              durationTargetMinutes,
              quantityTarget,
              quantityUnit,
              quantityStep
            );
            setAdvancedOpen(false);
          }}
          onCancel={() => setAdvancedOpen(false)}
        />
      ) : null}

      {deepLinkModalTask ? (
        <TaskDetailsModal
          task={deepLinkModalTask}
          initialDate={viewDate}
          onClose={() => setDeepLinkModalTask(null)}
          onToast={showToast}
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

