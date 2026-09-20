import { useMemo, useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { addDays, formatLong, todayStr } from "../../utils/dateUtils";
import { dayStats } from "../../utils/progressUtils";
import { CATEGORIES, categoryMeta } from "../../utils/taskUtils";
import type { CategoryId } from "../../types";
import DateNavigator from "../../components/DateNavigator/DateNavigator";
import QuickAddTask from "../../components/QuickAddTask/QuickAddTask";
import TaskList from "../../components/TaskList/TaskList";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import AddTaskModal from "../../components/Modals/AddTaskModal";
import { SearchIcon } from "../../components/icons";

type StatusFilter = "all" | "active" | "completed" | "high";

export default function Tasks() {
  const { getDay, addTask, toggleTask, saveEdit, deleteTask, moveTask, clearCompleted } = useTasks();

  const [viewDate, setViewDate] = useState(todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ taskId: string; title: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");

  const isToday = viewDate === todayStr();
  const day = getDay(viewDate);
  const stats = dayStats(day);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return day.tasks.filter((t) => {
      if (status === "active" && t.completed) return false;
      if (status === "completed" && !t.completed) return false;
      if (status === "high" && t.priority !== 1) return false;
      if (category !== "all" && t.category !== category) return false;
      if (q) {
        const catLabel = categoryMeta(t.category).label.toLowerCase();
        const hit = t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || catLabel.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [day.tasks, status, category, query]);

  const filtersActive = status !== "all" || category !== "all" || query.trim() !== "";

  return (
    <div className="page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <div className="page-title">Tasks</div>
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

      <QuickAddTask onAdd={(title) => addTask(viewDate, title)} />
      <button className="link-btn" onClick={() => setAdvancedOpen(true)} style={{ marginBottom: 16 }}>
        + Add with priority, category &amp; notes
      </button>

      <div className="search-row">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search title, notes, category"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tasks"
        />
        {query ? (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setQuery("")}
            aria-label="Clear search query"
          >
            &times;
          </button>
        ) : null}
      </div>

      <div className="filter-chips">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["completed", "Completed"],
            ["high", "High Priority"]
          ] as [StatusFilter, string][]
        ).map(([val, label]) => (
          <button
            key={val}
            className={"chip" + (status === val ? " active" : "")}
            onClick={() => setStatus(val)}
          >
            {label}
          </button>
        ))}
        <select
          className="chip-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryId | "all")}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.filter((c) => c.id).map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="section-row">
        <div className="section-title first" style={{ margin: 0 }}>
          {formatLong(viewDate)}
        </div>
        {stats.completed > 0 ? (
          <button className="link-btn" onClick={() => setConfirmClear(true)}>
            Clear completed
          </button>
        ) : null}
      </div>

      {day.tasks.length === 0 ? (
        <EmptyState variant="no-tasks" />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="custom"
          icon={"\uD83D\uDD0D"}
          title="No tasks found."
          subtitle="Try a different search or filter."
        />
      ) : (
        <TaskList
          tasks={filtered}
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
      )}

      {filtersActive && filtered.length > 0 && filtered.length < day.tasks.length ? (
        <div className="filter-hint">
          Showing {filtered.length} of {day.tasks.length} tasks
        </div>
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
          onAdd={(title, priority, cat, notes) => {
            addTask(viewDate, title, priority, cat, notes);
            setAdvancedOpen(false);
          }}
          onCancel={() => setAdvancedOpen(false)}
        />
      ) : null}
    </div>
  );
}
