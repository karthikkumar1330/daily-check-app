import { useMemo, useState } from "react";
import MetricCard from "../../components/Insights/MetricCard";
import BreakdownBar from "../../components/Insights/BreakdownBar";
import { useTasks } from "../../hooks/useTasks";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
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
  { key: "last_7_days", label: "Last 7 Days" },
  { key: "last_30_days", label: "Last 30 Days" },
  { key: "current_month", label: "This Month" }
];

export default function Insights() {
  const { appData } = useTasks();
  const { goals } = useCountdownGoals();
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("current_week");

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

  const goalMetrics = useMemo(() => calculateGoalMetrics(goals), [goals]);

  // Deterministic insights
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
    if (!weekComparison.hasPreviousActivity) return "versus previous week";
    return `vs ${Math.round(weekComparison.previousPct ?? 0)}% prev week`;
  }, [weekComparison]);

  return (
    <div className="page" style={{ paddingBottom: 64 }}>
      <div className="section-row" style={{ margin: "0 0 4px" }}>
        <div className="page-title">Insights</div>
      </div>
      <p className="page-subtitle" style={{ marginTop: 0, marginBottom: 18 }}>
        Productivity trends and schedule analytics
      </p>

      {/* Date Range Selector */}
      <section aria-label="Date Range Selection" style={{ marginBottom: 20 }}>
        <div
          role="tablist"
          aria-label="Select insight time window"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "4px 2px 8px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch"
          }}
        >
          {PRESETS.map((preset) => {
            const isActive = selectedPreset === preset.key;
            return (
              <button
                key={preset.key}
                role="tab"
                aria-selected={isActive}
                type="button"
                className={`btn ${isActive ? "btn-primary" : "btn-secondary"}`}
                style={{
                  minHeight: 44,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  borderRadius: "var(--radius-pill, 9999px)",
                  flexShrink: 0
                }}
                onClick={() => setSelectedPreset(preset.key)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--ink-muted)",
            paddingLeft: 4,
            fontWeight: 500
          }}
        >
          Showing {currentRange.label} ({currentRange.startDate} to {currentRange.endDate})
        </div>
      </section>

      {/* Key Metrics Grid */}
      <section aria-label="Key Productivity Metrics" style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--ink-muted)",
            marginBottom: 10
          }}
        >
          Key Metrics
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10
          }}
        >
          <MetricCard
            label="Completion"
            value={
              periodMetrics.completionPct !== null
                ? `${Math.round(periodMetrics.completionPct)}%`
                : null
            }
            subtext={
              periodMetrics.totalTasks > 0
                ? `${periodMetrics.completedTasks} / ${periodMetrics.totalTasks} tasks`
                : "No tasks"
            }
            icon="✓"
          />
          <MetricCard
            label="Active Days"
            value={periodMetrics.activeDays}
            subtext={`of ${currentRange.dates.length} days`}
            icon="📅"
          />
          <MetricCard
            label="80%+ Days"
            value={periodMetrics.highConsistencyDays}
            subtext={
              periodMetrics.activeDays > 0
                ? `${Math.round((periodMetrics.highConsistencyDays / periodMetrics.activeDays) * 100)}% active`
                : "0% active"
            }
            icon="🎯"
          />
          <MetricCard
            label="Current Streak"
            value={`${periodMetrics.currentStreak}d`}
            subtext="active streak"
            icon="🔥"
          />
          <MetricCard
            label="Best Streak"
            value={`${periodMetrics.bestStreak}d`}
            subtext="personal best"
            icon="⭐"
          />
        </div>
      </section>

      {/* Performance & Comparison Section */}
      <section aria-label="Performance Overview" style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--ink-muted)",
            marginBottom: 10
          }}
        >
          Performance &amp; Comparison
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10
          }}
        >
          <MetricCard
            label="Best Day"
            value={periodMetrics.bestDay ? periodMetrics.bestDay.dayName : null}
            subtext={
              periodMetrics.bestDay
                ? `${Math.round(periodMetrics.bestDay.pct)}% (${periodMetrics.bestDay.completed}/${periodMetrics.bestDay.total})`
                : "No active day"
            }
            icon="🏆"
          />
          <MetricCard
            label="Lowest Active"
            value={periodMetrics.lowestActiveDay ? periodMetrics.lowestActiveDay.dayName : null}
            subtext={
              periodMetrics.lowestActiveDay
                ? `${Math.round(periodMetrics.lowestActiveDay.pct)}% (${periodMetrics.lowestActiveDay.completed}/${periodMetrics.lowestActiveDay.total})`
                : "No active day"
            }
            icon="📉"
          />
          <MetricCard
            label="Average Completion"
            value={
              periodMetrics.averageCompletion !== null
                ? `${Math.round(periodMetrics.averageCompletion)}%`
                : null
            }
            subtext={
              periodMetrics.activeDays > 0
                ? `across ${periodMetrics.activeDays} active days`
                : "No active days"
            }
            icon="📊"
          />
          <MetricCard
            label="Week-over-Week"
            value={wowText}
            subtext={wowSubtext}
            icon="🔄"
          />
        </div>
      </section>

      {/* Key Insights Section */}
      <section aria-label="Key Observations" style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--ink-muted)",
            marginBottom: 10
          }}
        >
          Key Insights
        </h2>
        <div
          className="card"
          style={{
            padding: "16px 18px",
            borderRadius: "var(--radius-sm, 12px)",
            background: "var(--surface)",
            border: "1px solid var(--border)"
          }}
        >
          {insights.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-muted)", padding: "4px 0" }}>
              No insights available for this period yet.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}
            >
              {insights.map((insight) => (
                <li
                  key={insight.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--ink)"
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 14,
                      marginTop: 1,
                      color: "var(--accent)"
                    }}
                  >
                    •
                  </span>
                  <span>{insight.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 2-Column Responsive Layout for Breakdowns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Priority Breakdown */}
        <section aria-label="Priority Breakdown">
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderRadius: "var(--radius-sm, 12px)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Priority Breakdown
              </h3>
              {priorityMetrics.highPriorityCompletionPct !== null && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-pill, 9999px)",
                    background: "var(--red-soft, rgba(239, 68, 68, 0.12))",
                    color: "var(--red, #ef4444)"
                  }}
                >
                  High: {Math.round(priorityMetrics.highPriorityCompletionPct)}%
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
          </div>
        </section>

        {/* Category Breakdown */}
        <section aria-label="Category Breakdown">
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderRadius: "var(--radius-sm, 12px)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", color: "var(--ink)" }}>
              Category Breakdown
            </h3>

            {categoryMetrics.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
                No tasks in this period.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {categoryMetrics.map((cat) => (
                  <BreakdownBar
                    key={cat.category || "uncat"}
                    label={cat.label}
                    completed={cat.completed}
                    total={cat.total}
                    pct={cat.completionPct}
                    color="var(--accent, #0d9488)"
                    sublabel={`${Math.round((cat.total / (periodMetrics.totalTasks || 1)) * 100)}% volume`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 2-Column Responsive Layout for Recurring & Schedule */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Recurring Task Consistency */}
        <section aria-label="Recurring Task Consistency">
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderRadius: "var(--radius-sm, 12px)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", color: "var(--ink)" }}>
              Recurring Task Consistency
            </h3>

            {recurringMetrics.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
                No recurring tasks in this period.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recurringMetrics.map((rec) => (
                  <BreakdownBar
                    key={rec.id}
                    label={rec.title}
                    completed={rec.completedCount}
                    total={rec.scheduledCount}
                    pct={rec.completionPct}
                    color="var(--accent, #0d9488)"
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Schedule Analytics */}
        <section aria-label="Schedule Analytics">
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderRadius: "var(--radius-sm, 12px)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", color: "var(--ink)" }}>
              Schedule Analytics
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <span style={{ color: "var(--ink-muted)" }}>Scheduled Tasks</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {scheduleMetrics.scheduledTasks}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <span style={{ color: "var(--ink-muted)" }}>Completed Scheduled</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {scheduleMetrics.completedScheduledTasks}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <span style={{ color: "var(--ink-muted)" }}>On-time Completions</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {scheduleMetrics.onTimeCompletions}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <span style={{ color: "var(--ink-muted)" }}>Overdue Tasks</span>
                <span style={{ fontWeight: 600, color: "var(--red, #ef4444)" }}>
                  {scheduleMetrics.overdueTasks}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "6px 0"
                }}
              >
                <span style={{ color: "var(--ink-muted)" }}>Reminder Enabled</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {scheduleMetrics.reminderEnabledTasks}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Countdown Goals Overview */}
      <section aria-label="Countdown Goals Overview">
        <div
          className="card"
          style={{
            padding: "16px 18px",
            borderRadius: "var(--radius-sm, 12px)",
            background: "var(--surface)",
            border: "1px solid var(--border)"
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", color: "var(--ink)" }}>
            Countdown Goals
          </h3>

          {goalMetrics.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-muted)", padding: "8px 0" }}>
              No countdown goals.
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
                      <span>{g.icon}</span>
                      <span>{g.title}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill, 9999px)",
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
      </section>
    </div>
  );
}
