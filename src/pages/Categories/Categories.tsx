import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import { addDays, isValidDateStr, todayStr } from "../../utils/dateUtils";
import { categoryStats, tasksInCategory } from "../../utils/taskQueries";
import type { CategoryId } from "../../types";
import TaskItem from "../../components/TaskList/TaskItem";
import EmptyState from "../../components/EmptyState/EmptyState";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import DateNavigator from "../../components/DateNavigator/DateNavigator";

export default function Categories() {
  const { getDay, toggleTask, saveEdit, deleteTask } = useTasks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewDate, setViewDate] = useState(() => {
    const param = searchParams.get("date");
    return param && isValidDateStr(param) ? param : todayStr();
  });
  const selectedParam = searchParams.get("cat") as CategoryId | null;
  const selected = selectedParam || null;
  const [editing, setEditing] = useState<{ date: string; id: string } | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ date: string; taskId: string; title: string } | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  }

  // Close kebab menu on outside click or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [openMenuId]);

  function handleDateChange(nextDate: string) {
    setViewDate(nextDate);
    setEditing(null);
    const nextParams: Record<string, string> = { date: nextDate };
    if (selected) nextParams.cat = selected;
    setSearchParams(nextParams, { replace: true });
  }

  function handleSelectCategory(catId: CategoryId | null) {
    const nextParams: Record<string, string> = { date: viewDate };
    if (catId) nextParams.cat = catId;
    setSearchParams(nextParams);
    setOpenMenuId(null);
  }

  const isToday = viewDate === todayStr();
  const day = getDay(viewDate);

  const stats = useMemo(() => categoryStats(day.tasks), [day.tasks]);
  const selectedMeta = stats.find((s) => s.id === selected);
  const tasksForSelected = useMemo(
    () => (selected ? tasksInCategory(day.tasks, selected, [], viewDate) : []),
    [day.tasks, selected, viewDate]
  );

  const totalTasks = useMemo(() => stats.reduce((acc, c) => acc + c.active + c.completed, 0), [stats]);
  const totalActive = useMemo(() => stats.reduce((acc, c) => acc + c.active, 0), [stats]);

  // Detail View: Viewing a specific category's tasks on this date
  if (selected && selectedMeta) {
    return (
      <div className="page categories-page">
        <div className="category-detail-top-nav">
          <button
            type="button"
            className="category-back-btn"
            onClick={() => handleSelectCategory(null)}
            aria-label="Back to all categories"
          >
            ‹ All Categories
          </button>
        </div>

        <div className="category-detail-header" role="region" aria-label={`${selectedMeta.label} overview`}>
          <div className="category-icon-avatar" aria-hidden="true">
            {selectedMeta.emoji || "📁"}
          </div>
          <div className="category-detail-info">
            <h2 className="category-detail-title">{selectedMeta.label}</h2>
            <div className="category-detail-sub">
              {tasksForSelected.length === 0
                ? "No tasks for this date"
                : `${selectedMeta.active} active · ${selectedMeta.completed} completed`}
            </div>
          </div>
        </div>

        <div className="categories-context-bar" role="region" aria-label="Date navigation">
          <DateNavigator
            viewDate={viewDate}
            isToday={isToday}
            onPrev={() => handleDateChange(addDays(viewDate, -1))}
            onNext={() => handleDateChange(addDays(viewDate, 1))}
            onToday={() => handleDateChange(todayStr())}
          />
        </div>

        {tasksForSelected.length === 0 ? (
          <EmptyState
            variant="custom"
            icon={selectedMeta.emoji || "📂"}
            title={`No ${selectedMeta.label.toLowerCase()} tasks`}
            subtitle="Tasks assigned to this category on this date will appear here."
          />
        ) : (
          <div className="task-list" role="list">
            {tasksForSelected.map(({ task, date }) => (
              <TaskItem
                key={`${task.id}_${date}`}
                task={task}
                dateStr={date}
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

        {confirmDeleteTask && (
          <ConfirmModal
            title={`Delete "${confirmDeleteTask.title}"?`}
            message="This can’t be undone."
            confirmLabel="Delete"
            danger
            onConfirm={() => {
              deleteTask(confirmDeleteTask.date, confirmDeleteTask.taskId);
              setConfirmDeleteTask(null);
              showToast("Task deleted.");
            }}
            onCancel={() => setConfirmDeleteTask(null)}
          />
        )}

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </div>
    );
  }

  // Main View: Compact category list
  return (
    <div className="page categories-page" ref={menuContainerRef}>
      {/* 1. Compact Context Row with DateNavigator and Summary */}
      <div className="categories-context-bar" role="region" aria-label="Categories overview">
        <DateNavigator
          viewDate={viewDate}
          isToday={isToday}
          onPrev={() => handleDateChange(addDays(viewDate, -1))}
          onNext={() => handleDateChange(addDays(viewDate, 1))}
          onToday={() => handleDateChange(todayStr())}
        />

        <div className="categories-summary-line">
          <span className="categories-summary-title">
            {isToday ? "Today" : viewDate}
          </span>
          <span className="categories-summary-badge">
            {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
            {totalTasks > 0 ? ` · ${totalActive} active` : ""}
          </span>
        </div>
      </div>

      {/* 2. Empty State */}
      {stats.length === 0 ? (
        <div className="categories-empty-card" role="region" aria-label="No categories yet">
          <div className="categories-empty-icon" aria-hidden="true">📂</div>
          <div className="categories-empty-title">No categories yet</div>
          <div className="categories-empty-desc">
            Categories help you organize tasks into areas like Study, Workout, and Work.
          </div>
        </div>
      ) : (
        /* 3. Compact Category Rows */
        <div className="categories-list" role="list" aria-label="Categories list">
          {stats.map((c) => {
            const count = c.active + c.completed;
            const isMenuOpen = openMenuId === c.id;

            return (
              <div
                key={c.id}
                className="category-item-row"
                role="listitem"
                tabIndex={0}
                onClick={() => handleSelectCategory(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectCategory(c.id);
                  }
                }}
                aria-label={`${c.label}: ${count} tasks`}
              >
                <div className="category-item-left">
                  <div className="category-icon-avatar" aria-hidden="true">
                    {c.emoji || "•"}
                  </div>
                  <div className="category-item-info">
                    <div className="category-item-name">{c.label}</div>
                    <div className="category-item-meta">
                      {count === 0 ? (
                        <span className="category-meta-empty">No tasks</span>
                      ) : (
                        <span>
                          {count} {count === 1 ? "task" : "tasks"}
                          {" · "}
                          <span className="category-meta-breakdown">
                            {c.active} active, {c.completed} done
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="category-item-right" onClick={(e) => e.stopPropagation()}>
                  <div className="category-kebab-container">
                    <button
                      type="button"
                      className="icon-btn category-kebab-btn"
                      onClick={() => setOpenMenuId((curr) => (curr === c.id ? null : c.id))}
                      aria-label={`Options for ${c.label}`}
                      aria-expanded={isMenuOpen}
                    >
                      ⋯
                    </button>
                    {isMenuOpen && (
                      <div className="category-dropdown-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className="category-dropdown-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleSelectCategory(c.id);
                          }}
                        >
                          <span>View tasks</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-btn category-chevron-btn"
                    onClick={() => handleSelectCategory(c.id)}
                    aria-label={`Open ${c.label}`}
                    tabIndex={-1}
                  >
                    ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
