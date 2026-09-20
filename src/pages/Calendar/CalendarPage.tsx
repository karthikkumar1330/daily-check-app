import { useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { addMonths, formatLong, monthAnchor, todayStr } from "../../utils/dateUtils";
import { dayStats, formatPct } from "../../utils/progressUtils";
import Calendar from "../../components/Calendar/Calendar";
import TaskList from "../../components/TaskList/TaskList";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";

export default function CalendarPage() {
  const { appData, getDay, toggleTask, saveEdit, deleteTask, moveTask } = useTasks();
  const [anchor, setAnchor] = useState(monthAnchor(todayStr()));
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ taskId: string; title: string } | null>(null);

  const day = getDay(selectedDate);
  const stats = dayStats(day);

  return (
    <div className="page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <div className="page-title">Calendar</div>
      </div>

      <Calendar
        monthAnchor={anchor}
        selectedDate={selectedDate}
        days={appData.days}
        recurringTasks={appData.recurringTasks}
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

      <div className="section-title">{formatLong(selectedDate)}</div>
      <div className="calendar-day-summary">
        {stats.total === 0 ? "No tasks" : `${stats.completed} / ${stats.total} completed \u00B7 ${formatPct(stats.pct)}`}
      </div>

      {day.tasks.length === 0 ? (
        <EmptyState variant="no-tasks" />
      ) : (
        <TaskList
          tasks={day.tasks}
          editingId={editingId}
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
        />
      )}

      {confirmDeleteTask ? (
        <ConfirmModal
          message={`Delete \u201c${confirmDeleteTask.title}\u201d? This can\u2019t be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteTask(selectedDate, confirmDeleteTask.taskId);
            setConfirmDeleteTask(null);
          }}
          onCancel={() => setConfirmDeleteTask(null)}
        />
      ) : null}
    </div>
  );
}
