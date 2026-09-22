import type { Task } from "../../types";
import TaskDetailsModal from "../TaskDetails/TaskDetailsModal";

interface QuantityGoalDetailsProps {
  task: Task;
  initialDate?: string;
  onClose: () => void;
  onToast?: (message: string) => void;
}

export default function QuantityGoalDetails({
  task,
  initialDate,
  onClose,
  onToast
}: QuantityGoalDetailsProps) {
  return (
    <TaskDetailsModal
      task={task}
      initialDate={initialDate}
      onClose={onClose}
      onToast={onToast}
    />
  );
}
