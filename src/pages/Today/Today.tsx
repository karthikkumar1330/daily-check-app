import { useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { addDays, formatLong, todayStr } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import DateNavigator from "../../components/DateNavigator/DateNavigator";
import ProgressCard from "../../components/ProgressCard/ProgressCard";
import QuickAddTask from "../../components/QuickAddTask/QuickAddTask";
import TaskList from "../../components/TaskList/TaskList";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import AddTaskModal from "../../components/Modals/AddTaskModal";
import CountdownCard from "../../components/CountdownGoal/CountdownCard";

export default function Today() {
  const { getDay, addTask, toggleTask, saveEdit, deleteTask, moveTask, clearCompleted } = useTasks();

  const [viewDate, setViewDate] = useState(todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ taskId: string; title: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isToday = viewDate === todayStr();
  const day = getDay(viewDate);
  const stats = dayStats(day);

  return (
    <div className="page">
      <div className="page-date-line">{formatLong(viewDate)}</div>
      <div className="page-greeting">
        {isToday ? "Let\u2019s make today count \uD83D\uDCAA" : "Looking back at this day"}
      </div>

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

      <CountdownCard />

      <ProgressCard stats={stats} isToday={isToday} />

      <QuickAddTask onAdd={(title) => addTask(viewDate, title)} />
      <button className="link-btn" onClick={() => setAdvancedOpen(true)} style={{ marginBottom: 18 }}>
        + Add with priority, category &amp; notes
      </button>

      <div className="section-row">
        <div className="section-title first" style={{ margin: 0 }}>
          Today&rsquo;s Checklist
        </div>
        {stats.completed > 0 ? (
          <button className="link-btn" onClick={() => setConfirmClear(true)}>
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
            onToggle={(id) => toggleTask(viewDate, id)}
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
          />
          {stats.remaining === 0 && stats.total > 0 ? <EmptyState variant="all-done" /> : null}
        </>
      )}

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
          onAdd={(title, priority, category, notes) => {
            addTask(viewDate, title, priority, category, notes);
            setAdvancedOpen(false);
          }}
          onCancel={() => setAdvancedOpen(false)}
        />
      ) : null}
    </div>
  );
}
