import { useMemo, useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { formatShort } from "../../utils/dateUtils";
import { importantGroups, type DatedTask } from "../../utils/taskQueries";
import TaskItem from "../../components/TaskList/TaskItem";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";

export default function Important() {
  const { appData, toggleTask, saveEdit, deleteTask } = useTasks();
  const [editing, setEditing] = useState<{ date: string; id: string } | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ date: string; taskId: string; title: string } | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  }

  const groups = useMemo(() => importantGroups(appData.days, appData.recurringTasks), [appData.days, appData.recurringTasks]);
  const isEmpty = groups.today.length === 0 && groups.upcoming.length === 0 && groups.completed.length === 0;

  function renderGroup(label: string, items: DatedTask[]) {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div className="section-title">{label}</div>
        <div className="task-list">
          {items.map(({ task, date }) => (
            <TaskItem
              key={`${task.id}_${date}`}
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
      </div>
    );
  }

  return (
    <div className="page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <div className="page-title">Important</div>
      </div>
      <p className="page-subtitle">Tasks explicitly marked Important, organized by when they&rsquo;re due.</p>

      {isEmpty ? (
        <EmptyState
          variant="custom"
          icon={"\u2B50"}
          title="Nothing marked important right now."
          subtitle="Click the star on any task to mark it important."
        />
      ) : (
        <>
          {renderGroup("Today", groups.today)}
          {renderGroup("Upcoming", groups.upcoming)}
          {renderGroup("Completed", groups.completed)}
        </>
      )}

      {confirmDeleteTask ? (
        <ConfirmModal
          title={`Delete \u201c${confirmDeleteTask.title}\u201d?`}
          message="This can’t be undone."
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
