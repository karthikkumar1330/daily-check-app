import { useMemo, useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { formatShort } from "../../utils/dateUtils";
import { highPriorityTasks } from "../../utils/taskQueries";
import TaskItem from "../../components/TaskList/TaskItem";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";

export default function HighPriority() {
  const { appData, toggleTask, saveEdit, deleteTask } = useTasks();
  const [editing, setEditing] = useState<{ date: string; id: string } | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ date: string; taskId: string; title: string } | null>(
    null
  );
  const [showCompleted, setShowCompleted] = useState(false);

  const view = useMemo(() => highPriorityTasks(appData.days), [appData.days]);

  return (
    <div className="page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <div className="page-title">{"\uD83D\uDD34"} High Priority</div>
      </div>

      {view.incomplete.length === 0 && view.completed.length === 0 ? (
        <EmptyState
          variant="custom"
          icon={"\uD83D\uDD34"}
          title="No high-priority tasks."
          subtitle="Mark a task High priority to see it here."
        />
      ) : (
        <>
          {view.incomplete.length === 0 ? (
            <EmptyState variant="custom" title="No open high-priority tasks." />
          ) : (
            <div className="task-list">
              {view.incomplete.map(({ task, date }) => (
                <TaskItem
                  key={task.id}
                  task={task}
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
                />
              ))}
            </div>
          )}

          {view.completed.length > 0 ? (
            <div style={{ marginTop: 22 }}>
              <button className="link-btn" onClick={() => setShowCompleted((v) => !v)}>
                {showCompleted ? "Hide" : "Show"} completed ({view.completed.length})
              </button>
              {showCompleted ? (
                <div className="task-list" style={{ marginTop: 10 }}>
                  {view.completed.map(({ task, date }) => (
                    <TaskItem
                      key={task.id}
                      task={task}
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
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
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
    </div>
  );
}
