import { useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { addDays, formatDayMonth, todayStr, weekdayFull } from "../../utils/dateUtils";
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

  const [viewDate, setViewDate] = useState(todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ taskId: string; title: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [focusSelectorOpen, setFocusSelectorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
          <h2 className="section-title first" style={{ margin: 0 }}>
            Today&rsquo;s Checklist
          </h2>
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
          message={`Delete \u201c${confirmDeleteTask.title}\u201d? This can\u2019t be undone.`}
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
          message={"Clear all completed tasks for this day? This can\u2019t be undone."}
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
          onAdd={(title, priority, category, notes, recurrence, dueTime, reminderMinutes, dueDate, durationTargetMinutes) => {
            addTask(viewDate, title, priority, category, notes, recurrence, dueTime, reminderMinutes, dueDate, durationTargetMinutes);
            setAdvancedOpen(false);
          }}
          onCancel={() => setAdvancedOpen(false)}
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
