import type { CategoryId, Priority, ReminderMinutes, TaskRecurrence } from "../../types";
import TaskFormModal from "./TaskFormModal";
import type { TaskFormData } from "./TaskFormModal";

interface AddTaskModalProps {
  initialDate?: string;
  onAdd: (
    title: string,
    priority: Priority,
    category: CategoryId,
    notes: string,
    recurrence?: TaskRecurrence | null,
    dueTime?: string | null,
    reminderMinutes?: ReminderMinutes | null,
    dueDate?: string | null,
    durationTargetMinutes?: number | null,
    quantityTarget?: number | null,
    quantityUnit?: string,
    quantityStep?: number,
    important?: boolean
  ) => void;
  onCancel: () => void;
}

export default function AddTaskModal({ initialDate, onAdd, onCancel }: AddTaskModalProps) {
  function handleSubmit(data: TaskFormData) {
    onAdd(
      data.title,
      data.priority,
      data.category,
      data.notes,
      data.recurrence,
      data.dueTime,
      data.reminderMinutes,
      data.dueDate,
      data.durationTargetMinutes,
      data.quantityTarget,
      data.quantityUnit,
      data.quantityStep,
      data.important
    );
  }

  return (
    <TaskFormModal
      mode="add"
      initialDate={initialDate}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}
