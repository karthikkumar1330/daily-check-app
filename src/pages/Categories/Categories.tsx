import { useMemo, useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { formatShort } from "../../utils/dateUtils";
import { categoryStats, tasksInCategory } from "../../utils/taskQueries";
import type { CategoryId } from "../../types";
import TaskItem from "../../components/TaskList/TaskItem";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";

export default function Categories() {
  const { appData, toggleTask, saveEdit, deleteTask } = useTasks();
  const [selected, setSelected] = useState<CategoryId | null>(null);
  const [editing, setEditing] = useState<{ date: string; id: string } | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ date: string; taskId: string; title: string } | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  }

  const stats = useMemo(() => categoryStats(appData.days, appData.recurringTasks), [appData.days, appData.recurringTasks]);
  const selectedMeta = stats.find((s) => s.id === selected);
  const tasksForSelected = useMemo(
    () => (selected ? tasksInCategory(appData.days, selected, appData.recurringTasks) : []),
    [appData.days, selected, appData.recurringTasks]
  );

  if (selected && selectedMeta) {
    return (
      <div className="page">
        <button className="link-btn" onClick={() => setSelected(null)} style={{ marginBottom: 12 }}>
          {"\u2039"} All categories
        </button>
        <div className="page-title">
          {selectedMeta.emoji} {selectedMeta.label}
        </div>
        <p className="page-subtitle">
          {selectedMeta.active} active {"\u00B7"} {selectedMeta.completed} completed
        </p>

        {tasksForSelected.length === 0 ? (
          <EmptyState variant="custom" icon={"\uD83D\uDCC2"} title="No tasks in this category yet." />
        ) : (
          <div className="task-list">
            {tasksForSelected.map(({ task, date }) => (
              <TaskItem
                key={task.id}
                task={task}
                dateStr={date}
                dateLabel={formatShort(date)}
                hideReorder
                isEditing={editing?.id === task.id && editing.date === date}
                onToggle={() => toggleTask(date, task.id)}
                onStartEdit={() => setEditing({ date, id: task.id })}
                onCancelEdit={() => setEditing(null)}
                onSave={(updates) => {
                  saveEdit(date, task.id, updates);
                  setEditing(null);
                }}
                onDelete={() => setConfirmDeleteTask({ date, taskId: task.id, title: task.title })}
                onToast={showToast}
              />
            ))}
          </div>
        )}

        {confirmDeleteTask ? (
          <ConfirmModal
            message={`Delete \u201c${confirmDeleteTask.title}\u201d? This can\u2019t be undone.`}
            confirmLabel="Delete"
            danger
            onConfirm={() => {
              deleteTask(confirmDeleteTask.date, confirmDeleteTask.taskId);
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

  return (
    <div className="page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <div className="page-title">Categories</div>
      </div>

      <div className="category-grid">
        {stats.map((c) => (
          <button key={c.id} className="category-card" onClick={() => setSelected(c.id)}>
            <div className="category-emoji">{c.emoji}</div>
            <div className="category-label">{c.label}</div>
            <div className="category-counts">
              {c.active} active {"\u00B7"} {c.completed} done
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
