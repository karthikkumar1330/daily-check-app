import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BreakdownBar from "../../components/Insights/BreakdownBar";
import TrendChart from "../../components/Insights/TrendChart";
import { useTasks } from "../../hooks/useTasks";
import { useCountdowns } from "../../hooks/useCountdowns";
import {
  calculateCategoryMetrics,
  calculateGoalMetrics,
  calculatePeriodMetrics,
  calculatePriorityMetrics,
  calculateRecurringTaskMetrics,
  calculateScheduleMetrics,
  calculateWeekOverWeek,
  generateInsights,
  getDateRangePreset,
  type DateRangePreset
} from "../../utils/insightsUtils";

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "current_week", label: "This Week" },
  { key: "previous_week", label: "Last Week" },
  { key: "last_7_days", label: "7 Days" },
  { key: "last_30_days", label: "30 Days" },
  { key: "last_90_days", label: "90 Days" },
  { key: "current_month", label: "This Month" }
];

export default function Insights() {
  const { appData } = useTasks();
  const { countdowns } = useCountdowns();
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("current_week");

  // Progressive disclosure accordion state (collapsed by default for compact initial view)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Date ranges
  const currentRange = useMemo(() => getDateRangePreset(selectedPreset), [selectedPreset]);
  const previousWeekRange = useMemo(() => getDateRangePreset("previous_week"), []);

  // Compute primary period metrics
  const periodMetrics = useMemo(
    () => calculatePeriodMetrics(appData, currentRange.startDate, currentRange.endDate),
    [appData, currentRange]
  );

  // Compute previous week metrics for comparison
  const previousWeekMetrics = useMemo(
    () => calculatePeriodMetrics(appData, previousWeekRange.startDate, previousWeekRange.endDate),
    [appData, previousWeekRange]
  );

  // Week-over-week comparison
  const weekComparison = useMemo(
    () => calculateWeekOverWeek(periodMetrics, previousWeekMetrics),
    [periodMetrics, previousWeekMetrics]
  );

  // Sub-breakdowns
  const scheduleMetrics = useMemo(
    () => calculateScheduleMetrics(periodMetrics.dailyMetrics),
    [periodMetrics.dailyMetrics]
  );

  const recurringMetrics = useMemo(
    () => calculateRecurringTaskMetrics(appData.recurringTasks ?? [], currentRange.dates),
    [appData.recurringTasks, currentRange.dates]
  );

  const categoryMetrics = useMemo(
    () => calculateCategoryMetrics(periodMetrics.dailyMetrics),
    [periodMetrics.dailyMetrics]
  );

  const priorityMetrics = useMemo(
    () => calculatePriorityMetrics(periodMetrics.dailyMetrics),
    [periodMetrics.dailyMetrics]
  );

  const goalMetrics = useMemo(() => calculateGoalMetrics(countdowns), [countdowns]);

  // Deterministic observations
  const insights = useMemo(
    () =>
      generateInsights(periodMetrics, {
        schedule: scheduleMetrics,
        recurring: recurringMetrics,
        priority: priorityMetrics,
        weekComparison
      }),
    [periodMetrics, scheduleMetrics, recurringMetrics, priorityMetrics, weekComparison]
  );

  // Week-over-week formatted string (strictly neutral)
  const wowText = useMemo(() => {
    if (!weekComparison.hasPreviousActivity || weekComparison.difference === null) {
      return "No previous activity";
    }
    const diff = Math.round(weekComparison.difference);
    if (diff > 0) return `+${diff} pp`;
    if (diff < 0) return `${diff} pp`;
    return "0 pp";
  }, [weekComparison]);

  const wowSubtext = useMemo(() => {
    if (!weekComparison.hasPreviousActivity) return "versus previous period";
    return `vs ${Math.round(weekComparison.previousPct ?? 0)}% prev period`;
  }, [weekComparison]);

  const hasActivity = periodMetrics.totalTasks > 0;

  return (
    <div className="page insights-page">
      {/* 1. Time Range Presets */}
      <section className="insights-presets-section" aria-label="Date Range Selection">
        <div
          className="insights-presets-scroll"
          role="tablist"
          aria-label="Select insight time window"
        >
          {PRESETS.map((preset) => {
            const isActive = selectedPreset === preset.key;
            return (
              <button
                key={preset.key}
                role="tab"
                aria-selected={isActive}
                type="button"
                className={`insights-preset-btn${isActive ? " is-active" : ""}`}
                onClick={() => setSelectedPreset(preset.key)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="insights-presets-caption">
          Showing {currentRange.label} ({currentRange.startDate} to {currentRange.endDate})
        </div>
      </section>

      {/* 2. Zero-Activity Empty State */}
      {!hasActivity ? (
        <div className="insights-empty-card" role="region" aria-label="No activity in this period">
          <div className="insights-empty-icon" aria-hidden="true">📊</div>
          <div className="insights-empty-title">No task activity in this period</div>
          <div className="insights-empty-desc">
            Complete daily checklists or schedule recurring tasks to view completion trends and analytics here.
          </div>
          <Link
            to="/today"
            className="btn btn-primary"
            style={{ minHeight: 44, padding: "0 20px", display: "inline-flex", alignItems: "center" }}
          >
            Go to Today
          </Link>
        </div>
      ) : (
        <>
          {/* 3. Primary Overview Hero */}
          <div className="insights-hero-card" role="region" aria-label="Primary completion overview">
            <span className="insights-hero-badge">{currentRange.label}</span>
            <div className="insights-hero-value">
              {periodMetrics.completionPct !== null ? `${Math.round(periodMetrics.completionPct)}%` : "—"}
            </div>
            <div className="insights-hero-label">Task Completion</div>
            <div className="insights-hero-secondary">
              <span className="insights-hero-meta-item">
                <strong>{periodMetrics.completedTasks}</strong> / {periodMetrics.totalTasks} completed
              </span>
              <span className="insights-hero-dot" aria-hidden="true">·</span>
              <span className="insights-hero-meta-item">
                <strong>{periodMetrics.remainingTasks}</strong> remaining
              </span>
              <span className="insights-hero-dot" aria-hidden="true">·</span>
              <span className="insights-hero-meta-item">
                <strong>{periodMetrics.activeDays}</strong> / {currentRange.dates.length} active days
              </span>
            </div>
          </div>

          {/* 4. Key Metrics Group */}
          <section className="insights-section" aria-label="Key Metrics">
            <div className="insights-section-label">Key Metrics</div>
            <div className="insights-group-card">
              <div className="insights-stat-row">
                <span className="insights-stat-label">Tasks completed</span>
                <span className="insights-stat-val">
                  {periodMetrics.completedTasks} of {periodMetrics.totalTasks}
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">Active days</span>
                <span className="insights-stat-val">
                  {periodMetrics.activeDays} of {currentRange.dates.length} days
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">80%+ consistency days</span>
                <span className="insights-stat-val">
                  {periodMetrics.highConsistencyDays} days
                  {periodMetrics.activeDays > 0
                    ? ` (${Math.round((periodMetrics.highConsistencyDays / periodMetrics.activeDays) * 100)}%)`
                    : ""}
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">Average daily completion</span>
                <span className="insights-stat-val">
                  {periodMetrics.averageCompletion !== null
                    ? `${Math.round(periodMetrics.averageCompletion)}%`
                    : "—"}
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">Best day</span>
                <span className="insights-stat-val">
                  {periodMetrics.bestDay
                    ? `${periodMetrics.bestDay.dayName} · ${Math.round(periodMetrics.bestDay.pct)}%`
                    : "—"}
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">Lowest active day</span>
                <span className="insights-stat-val">
                  {periodMetrics.lowestActiveDay
                    ? `${periodMetrics.lowestActiveDay.dayName} · ${Math.round(periodMetrics.lowestActiveDay.pct)}%`
                    : "—"}
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">Current streak</span>
                <span className="insights-stat-val">
                  {periodMetrics.currentStreak} {periodMetrics.currentStreak === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">Best streak</span>
                <span className="insights-stat-val">
                  {periodMetrics.bestStreak} {periodMetrics.bestStreak === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="insights-stat-row">
                <span className="insights-stat-label">Period comparison</span>
                <span className="insights-stat-val">
                  {wowText}
                  {weekComparison.hasPreviousActivity ? ` (${wowSubtext})` : ""}
                </span>
              </div>
            </div>
          </section>

          {/* 5. Completion Trend Chart */}
          <section className="insights-section" aria-label="Completion Trend">
            <div className="insights-section-label">Completion Trend</div>
            <TrendChart dailyMetrics={periodMetrics.dailyMetrics} height={120} />
          </section>

          {/* 6. Key Observations */}
          {insights.length > 0 && (
            <section className="insights-section" aria-label="Key Observations">
              <div className="insights-section-label">Key Observations</div>
              <div className="insights-group-card">
                <ul className="insights-observations-list">
                  {insights.map((insight) => (
                    <li key={insight.id} className="insights-observation-item">
                      <span className="insights-observation-dot" aria-hidden="true">•</span>
                      <span>{insight.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* 7. Progressive Disclosure: Detailed Breakdowns */}
          <section className="insights-section" aria-label="Detailed Breakdowns">
            <div className="insights-section-label">Detailed Breakdowns</div>
            <div className="insights-group-card">
              {/* Priority Breakdown Accordion */}
              <div className="insights-accordion-item">
                <button
                  type="button"
                  className="insights-accordion-header"
                  onClick={() => toggleSection("priority")}
                  aria-expanded={Boolean(openSections.priority)}
                  aria-controls="breakdown-priority"
                >
                  <div className="insights-accordion-title-wrap">
                    <span className="insights-accordion-title">Priority Breakdown</span>
                  </div>
                  <div className="insights-accordion-right">
                    <span className="insights-accordion-preview">
                      {priorityMetrics.highPriorityCompletionPct !== null
                        ? `High: ${Math.round(priorityMetrics.highPriorityCompletionPct)}%`
                        : `${priorityMetrics.high.total + priorityMetrics.medium.total + priorityMetrics.low.total} tasks`}
                    </span>
                    <span
                      className={`insights-accordion-chevron${openSections.priority ? " is-open" : ""}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </div>
                </button>
                {openSections.priority && (
                  <div id="breakdown-priority" className="insights-accordion-body">
                    <BreakdownBar
                      label="High Priority"
                      completed={priorityMetrics.high.completed}
                      total={priorityMetrics.high.total}
                      pct={priorityMetrics.high.completionPct}
                      color="var(--red, #ef4444)"
                      badge={<span style={{ color: "var(--red, #ef4444)" }}>●</span>}
                    />
                    <BreakdownBar
                      label="Medium Priority"
                      completed={priorityMetrics.medium.completed}
                      total={priorityMetrics.medium.total}
                      pct={priorityMetrics.medium.completionPct}
                      color="var(--amber, #f59e0b)"
                      badge={<span style={{ color: "var(--amber, #f59e0b)" }}>●</span>}
                    />
                    <BreakdownBar
                      label="Low Priority"
                      completed={priorityMetrics.low.completed}
                      total={priorityMetrics.low.total}
                      pct={priorityMetrics.low.completionPct}
                      color="var(--ink-muted, #94a3b8)"
                      badge={<span style={{ color: "var(--ink-muted, #94a3b8)" }}>●</span>}
                    />
                  </div>
                )}
              </div>

              {/* Category Breakdown Accordion */}
              <div className="insights-accordion-item">
                <button
                  type="button"
                  className="insights-accordion-header"
                  onClick={() => toggleSection("category")}
                  aria-expanded={Boolean(openSections.category)}
                  aria-controls="breakdown-category"
                >
                  <div className="insights-accordion-title-wrap">
                    <span className="insights-accordion-title">Category Breakdown</span>
                  </div>
                  <div className="insights-accordion-right">
                    <span className="insights-accordion-preview">
                      {categoryMetrics.length} {categoryMetrics.length === 1 ? "category" : "categories"}
                    </span>
                    <span
                      className={`insights-accordion-chevron${openSections.category ? " is-open" : ""}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </div>
                </button>
                {openSections.category && (
                  <div id="breakdown-category" className="insights-accordion-body">
                    {categoryMetrics.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--ink-muted)", padding: "8px 0" }}>
                        No categorized tasks in this period.
                      </div>
                    ) : (
                      categoryMetrics.map((cat) => (
                        <BreakdownBar
                          key={cat.category || "uncat"}
                          label={cat.label}
                          completed={cat.completed}
                          total={cat.total}
                          pct={cat.completionPct}
                          color="var(--accent, #0d9488)"
                          sublabel={`${Math.round((cat.total / (periodMetrics.totalTasks || 1)) * 100)}% volume`}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Recurring Tasks Accordion */}
              <div className="insights-accordion-item">
                <button
                  type="button"
                  className="insights-accordion-header"
                  onClick={() => toggleSection("recurring")}
                  aria-expanded={Boolean(openSections.recurring)}
                  aria-controls="breakdown-recurring"
                >
                  <div className="insights-accordion-title-wrap">
                    <span className="insights-accordion-title">Recurring Task Consistency</span>
                  </div>
                  <div className="insights-accordion-right">
                    <span className="insights-accordion-preview">
                      {recurringMetrics.length} {recurringMetrics.length === 1 ? "routine" : "routines"}
                    </span>
                    <span
                      className={`insights-accordion-chevron${openSections.recurring ? " is-open" : ""}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </div>
                </button>
                {openSections.recurring && (
                  <div id="breakdown-recurring" className="insights-accordion-body">
                    {recurringMetrics.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--ink-muted)", padding: "8px 0" }}>
                        No recurring tasks scheduled in this period.
                      </div>
                    ) : (
                      recurringMetrics.map((rec) => (
                        <BreakdownBar
                          key={rec.id}
                          label={rec.title}
                          completed={rec.completedCount}
                          total={rec.scheduledCount}
                          pct={rec.completionPct}
                          color="var(--accent, #0d9488)"
                        />
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Schedule Analytics Accordion */}
              <div className="insights-accordion-item">
                <button
                  type="button"
                  className="insights-accordion-header"
                  onClick={() => toggleSection("schedule")}
                  aria-expanded={Boolean(openSections.schedule)}
                  aria-controls="breakdown-schedule"
                >
                  <div className="insights-accordion-title-wrap">
                    <span className="insights-accordion-title">Schedule &amp; Reminders</span>
                  </div>
                  <div className="insights-accordion-right">
                    <span className="insights-accordion-preview">
                      {scheduleMetrics.scheduledTasks} scheduled
                    </span>
                    <span
                      className={`insights-accordion-chevron${openSections.schedule ? " is-open" : ""}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </div>
                </button>
                {openSections.schedule && (
                  <div id="breakdown-schedule" className="insights-accordion-body">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div className="insights-stat-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <span className="insights-stat-label">Scheduled tasks</span>
                        <span className="insights-stat-val">{scheduleMetrics.scheduledTasks}</span>
                      </div>
                      <div className="insights-stat-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <span className="insights-stat-label">Completed scheduled tasks</span>
                        <span className="insights-stat-val">{scheduleMetrics.completedScheduledTasks}</span>
                      </div>
                      <div className="insights-stat-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <span className="insights-stat-label">On-time completions</span>
                        <span className="insights-stat-val">{scheduleMetrics.onTimeCompletions}</span>
                      </div>
                      <div className="insights-stat-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <span className="insights-stat-label">Overdue tasks</span>
                        <span className="insights-stat-val" style={{ color: scheduleMetrics.overdueTasks > 0 ? "var(--red, #ef4444)" : "var(--ink)" }}>
                          {scheduleMetrics.overdueTasks}
                        </span>
                      </div>
                      <div className="insights-stat-row" style={{ paddingLeft: 0, paddingRight: 0, borderBottom: "none" }}>
                        <span className="insights-stat-label">Reminder-enabled tasks</span>
                        <span className="insights-stat-val">{scheduleMetrics.reminderEnabledTasks}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Countdowns Accordion */}
              <div className="insights-accordion-item">
                <button
                  type="button"
                  className="insights-accordion-header"
                  onClick={() => toggleSection("countdowns")}
                  aria-expanded={Boolean(openSections.countdowns)}
                  aria-controls="breakdown-countdowns"
                >
                  <div className="insights-accordion-title-wrap">
                    <span className="insights-accordion-title">Countdowns Overview</span>
                  </div>
                  <div className="insights-accordion-right">
                    <span className="insights-accordion-preview">
                      {goalMetrics.length} {goalMetrics.length === 1 ? "countdown" : "countdowns"}
                    </span>
                    <span
                      className={`insights-accordion-chevron${openSections.countdowns ? " is-open" : ""}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </div>
                </button>
                {openSections.countdowns && (
                  <div id="breakdown-countdowns" className="insights-accordion-body">
                    {goalMetrics.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--ink-muted)", padding: "8px 0" }}>
                        No countdowns created yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {goalMetrics.map((g) => (
                          <div
                            key={g.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              padding: "8px 0",
                              borderBottom: "1px solid var(--border)"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--ink)"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span aria-hidden="true">{g.icon}</span>
                                <span>{g.title}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: "2px 8px",
                                    borderRadius: "var(--dc-radius-pill, 9999px)",
                                    background:
                                      g.status === "completed"
                                        ? "var(--accent-soft, rgba(13, 148, 136, 0.12))"
                                        : g.status === "active"
                                        ? "rgba(59, 130, 246, 0.12)"
                                        : "rgba(148, 163, 184, 0.12)",
                                    color:
                                      g.status === "completed"
                                        ? "var(--accent)"
                                        : g.status === "active"
                                        ? "#2563eb"
                                        : "var(--ink-muted)"
                                  }}
                                >
                                  {g.status === "completed"
                                    ? "Completed"
                                    : g.status === "active"
                                    ? `${g.daysRemaining}d left`
                                    : "Upcoming"}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "right" }}>
                                  {g.progressPct}%
                                </span>
                              </div>
                            </div>

                            <div
                              role="progressbar"
                              aria-label={`${g.title} progress`}
                              aria-valuenow={g.progressPct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              style={{
                                width: "100%",
                                height: 6,
                                borderRadius: 3,
                                background: "var(--surface-2, rgba(0,0,0,0.06))",
                                overflow: "hidden"
                              }}
                            >
                              <div
                                style={{
                                  width: `${g.progressPct}%`,
                                  height: "100%",
                                  borderRadius: 3,
                                  background: "var(--accent, #0d9488)",
                                  transition: "width 0.3s ease"
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
