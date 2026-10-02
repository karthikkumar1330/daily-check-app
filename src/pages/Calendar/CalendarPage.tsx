import { useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { useCountdowns } from "../../hooks/useCountdowns";
import { addMonths, formatLong, monthAnchor, todayStr } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import Calendar from "../../components/Calendar/Calendar";
import TaskList from "../../components/TaskList/TaskList";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import AddTaskModal from "../../components/Modals/AddTaskModal";

export default function CalendarPage() {
  const { appData, getDay, addTask, toggleTask, saveEdit, deleteTask, moveTask } = useTasks();
  const { countdowns } = useCountdowns();
  const [anchor, setAnchor] = useState(monthAnchor(todayStr()));
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ taskId: string; title: string } | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  }

  const day = getDay(selectedDate);
  const stats = dayStats(day);

  return (
    <div className="page calendar-page">
      {/* 1. CALENDAR VIEW (MONTH NAV + GRID) */}
      <Calendar
        monthAnchor={anchor}
        selectedDate={selectedDate}
        days={appData.days}
        recurringTasks={appData.recurringTasks}
        countdowns={countdowns}
        weekStartsOn={appData.weekStartsOn ?? 1}
        onSelectDate={(d) => {
          setSelectedDate(d);
          setEditingId(null);
        }}
        onPrevMonth={() => setAnchor(addMonths(anchor, -1))}
        onNextMonth={() => setAnchor(addMonths(anchor, 1))}
        onToday={() => {
          const t = todayStr();
          setAnchor(monthAnchor(t));
          setSelectedDate(t);
        }}
      />

      {/* 2. SELECTED DATE CONTEXT */}
      <div className="calendar-selected-context">
        <div className="calendar-selected-header-row">
          <div className="calendar-selected-title-group">
            <h3 className="calendar-selected-date-text">
              {formatLong(selectedDate)}
            </h3>
            {selectedDate === todayStr() ? (
              <span className="calendar-today-badge">Today</span>
            ) : null}
            <span className="calendar-selected-count-pill" aria-live="polite">
              {stats.total === 0
                ? "No tasks"
                : stats.completed > 0
                ? `${stats.completed}/${stats.total} done`
                : `${stats.total} ${stats.total === 1 ? "task" : "tasks"}`}
            </span>
          </div>

          <button
            type="button"
            className="calendar-add-btn-compact"
            onClick={() => setAddTaskOpen(true)}
            aria-label={`Add task for ${formatLong(selectedDate)}`}
          >
            + Add Task
          </button>
        </div>

        {/* 3. SELECTED-DAY TASK LIST */}
        {day.tasks.length === 0 ? (
          <div className="calendar-empty-card">
            <div className="calendar-empty-text">No tasks scheduled</div>
            <button
              type="button"
              className="btn-primary calendar-empty-add-btn"
              onClick={() => setAddTaskOpen(true)}
            >
              + Add Task
            </button>
          </div>
        ) : (
          <div className="calendar-tasks-wrapper">
            <TaskList
              tasks={day.tasks}
              editingId={editingId}
              dateStr={selectedDate}
              onToggle={(id) => toggleTask(selectedDate, id)}
              onStartEdit={(id) => setEditingId(id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(id, updates) => {
                saveEdit(selectedDate, id, updates);
                setEditingId(null);
              }}
              onDelete={(id) => {
                const t = day.tasks.find((x) => x.id === id);
                if (t) setConfirmDeleteTask({ taskId: id, title: t.title });
              }}
              onMove={(id, dir) => moveTask(selectedDate, id, dir)}
              onToast={showToast}
            />
          </div>
        )}
      </div>

      {/* MODALS */}
      {addTaskOpen ? (
        <AddTaskModal
          initialDate={selectedDate}
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
            quantityStep,
            important
          ) => {
            addTask(
              selectedDate,
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
              quantityStep,
              important
            );
            setAddTaskOpen(false);
          }}
          onCancel={() => setAddTaskOpen(false)}
        />
      ) : null}

      {confirmDeleteTask ? (
        <ConfirmModal
          title={`Delete \u201c${confirmDeleteTask.title}\u201d?`}
          message="This can’t be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteTask(selectedDate, confirmDeleteTask.taskId);
            setConfirmDeleteTask(null);
          }}
          onCancel={() => setConfirmDeleteTask(null)}
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
