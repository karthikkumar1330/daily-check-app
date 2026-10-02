import { useMemo, useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { addDays, formatDisplayDate, formatLong, todayStr } from "../../utils/dateUtils";
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

type StatusFilter = "all" | "active" | "completed" | "high" | "important";

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
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  }

  const isToday = viewDate === todayStr();
  const day = getDay(viewDate);
  const stats = dayStats(day);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return day.tasks.filter((t) => {
      if (status === "active" && t.completed) return false;
      if (status === "completed" && !t.completed) return false;
      if (status === "high" && t.priority !== 1) return false;
      if (status === "important" && !t.important) return false;
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
    <div className="page tasks-page">
      {/* 1. Date context navigator */}
      <div className="today-date-nav-wrap">
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
      </div>

      {/* 2. Quick capture & Full Add option */}
      <div className="quick-add-section">
        <QuickAddTask onAdd={(title) => addTask(viewDate, title)} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "4px 0 14px" }}>
        <button
          type="button"
          className="link-btn"
          onClick={() => setAdvancedOpen(true)}
          style={{ fontSize: "0.82rem" }}
        >
          + Add with priority &amp; schedule
        </button>
      </div>

      {/* 3. Search */}
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

      {/* 4. Compact filter chips & category */}
      <div className="filter-chips">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["completed", "Completed"],
            ["high", "High"],
            ["important", "⭐ Important"]
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

      {/* 5. Date heading and Clear completed */}
      <div className="section-row" style={{ marginTop: 12, marginBottom: 8 }}>
        <div className="section-title first" style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700 }}>
          {formatDisplayDate(viewDate)}
        </div>
        {stats.completed > 0 ? (
          <button className="link-btn" onClick={() => setConfirmClear(true)}>
            Clear completed
          </button>
        ) : null}
      </div>

      {/* 6. Task list & Compact Empty State */}
      {day.tasks.length === 0 ? (
        <EmptyState
          variant="custom"
          title="No tasks yet"
          subtitle="Create your first task to get started."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setAdvancedOpen(true)}
              style={{ minHeight: 38, padding: "0 16px", marginTop: 8 }}
            >
              + Add Task
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="custom"
          icon={"\uD83D\uDD0D"}
          title="No tasks match filter"
          subtitle="Try clearing or adjusting your search or filters."
          action={
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setCategory("all");
              }}
              style={{ minHeight: 34, padding: "0 14px", marginTop: 6 }}
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <TaskList
          tasks={filtered}
          editingId={editingId}
          dateStr={viewDate}
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
          onToast={showToast}
        />
      )}

      {filtersActive && filtered.length > 0 && filtered.length < day.tasks.length ? (
        <div className="filter-hint">
          Showing {filtered.length} of {day.tasks.length} tasks
        </div>
      ) : null}

      {confirmDeleteTask ? (
        <ConfirmModal
          title={`Delete \u201c${confirmDeleteTask.title}\u201d?`}
          message="This can’t be undone."
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
          title="Clear completed tasks?"
          message="Clear all completed tasks for this day? This can’t be undone."
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
          initialDate={viewDate}
          onAdd={(
            title,
            priority,
            cat,
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
              viewDate,
              title,
              priority,
              cat,
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
            setAdvancedOpen(false);
          }}
          onCancel={() => setAdvancedOpen(false)}
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
