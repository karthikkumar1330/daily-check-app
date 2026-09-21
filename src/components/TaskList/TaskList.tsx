import type { Task } from "../../types";
import { sortTasksWithSchedule } from "../../utils/scheduleUtils";
import TaskItem from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  editingId: string | null;
  dateStr?: string;
  onToggle: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSave: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

export default function TaskList({
  tasks,
  editingId,
  dateStr,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMove
}: TaskListProps) {
  const sorted = dateStr
    ? sortTasksWithSchedule(tasks, dateStr)
    : [...tasks].sort((a, b) => a.order - b.order);

  return (
    <div className="task-list">
      {sorted.map((t, idx) => (
        <TaskItem
          key={t.id}
          task={t}
          isFirst={idx === 0}
          isLast={idx === sorted.length - 1}
          isEditing={editingId === t.id}
          dateStr={dateStr}
          onToggle={() => onToggle(t.id)}
          onStartEdit={() => onStartEdit(t.id)}
          onCancelEdit={onCancelEdit}
          onSave={(updates) => onSave(t.id, updates)}
          onDelete={() => onDelete(t.id)}
          onMoveUp={() => onMove(t.id, "up")}
          onMoveDown={() => onMove(t.id, "down")}
        />
      ))}
    </div>
  );
}
