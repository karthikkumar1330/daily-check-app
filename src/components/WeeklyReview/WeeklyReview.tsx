import { useMemo } from "react";
import type { AppData, CountdownGoal } from "../../types";
import {
  addDays,
  formatLong,
  formatShort,
  getWeekDates,
  getWeekStart,
  todayStr,
  weekdayFull
} from "../../utils/dateUtils";
import { calculatePeriodMetrics, getDateRange } from "../../utils/insightsUtils";
import { isTaskScheduledOnDate, resolveDayData } from "../../utils/recurrenceUtils";

interface WeeklyReviewProps {
  appData: AppData;
  goals?: CountdownGoal[];
  weekStart?: string;
  onNavigateWeek?: (newWeekStart: string) => void;
}

export default function WeeklyReview({
  appData,
  goals = [],
  weekStart: propWeekStart,
  onNavigateWeek
}: WeeklyReviewProps) {
  const currentWeekStart = useMemo(
    () => propWeekStart || getWeekStart(todayStr()),
    [propWeekStart]
  );
  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
  const weekEnd = weekDates[6];

  // Calculate metrics using existing insights engine
  const metrics = useMemo(
    () => calculatePeriodMetrics(appData, currentWeekStart, weekEnd),
    [appData, currentWeekStart, weekEnd]
  );

  // Next week date range
  const nextWeekStart = useMemo(() => addDays(currentWeekStart, 7), [currentWeekStart]);
  const nextWeekDates = useMemo(() => getWeekDates(nextWeekStart), [nextWeekStart]);

  // Compute Next Week factual observations
  const nextWeekObservations = useMemo(() => {
    const observations: string[] = [];
    const recurring = appData.recurringTasks ?? [];

    let totalRecurringScheduled = 0;
    for (const d of nextWeekDates) {
      for (const t of recurring) {
        if (isTaskScheduledOnDate(t.recurrence, d)) {
          totalRecurringScheduled++;
        }
      }
    }

    if (totalRecurringScheduled > 0) {
      observations.push(
        `${totalRecurringScheduled} recurring task occurrence${
          totalRecurringScheduled === 1 ? "" : "s"
        } scheduled across next week.`
      );
    } else {
      observations.push("No recurring tasks scheduled for next week.");
    }

    // Check one-off tasks with dueDate in next week
    let upcomingDueCount = 0;
    for (const d of nextWeekDates) {
      const dayTasks = appData.days[d]?.tasks ?? [];
      for (const t of dayTasks) {
        if (!t.recurrence) upcomingDueCount++;
      }
    }
    if (upcomingDueCount > 0) {
      observations.push(
        `${upcomingDueCount} planned task${upcomingDueCount === 1 ? "" : "s"} already scheduled for next week.`
      );
    }

    // Check upcoming goal deadlines or starts
    const activeGoals = goals.filter((g) => {
      return (
        (g.targetDate >= nextWeekStart && g.targetDate <= nextWeekDates[6]) ||
        (g.startDate >= nextWeekStart && g.startDate <= nextWeekDates[6])
      );
    });

    for (const g of activeGoals) {
      if (g.targetDate >= nextWeekStart && g.targetDate <= nextWeekDates[6]) {
        observations.push(
          `Goal target date: "${g.title}" concludes on ${formatShort(g.targetDate)}.`
        );
      } else if (g.startDate >= nextWeekStart && g.startDate <= nextWeekDates[6]) {
        observations.push(
          `Goal start: "${g.title}" begins on ${formatShort(g.startDate)}.`
        );
      }
    }

    return observations;
  }, [appData, nextWeekDates, nextWeekStart, goals]);

  // Successful days list (80%+ completion)
  const successfulDays = useMemo(
    () => metrics.dailyMetrics.filter((d) => d.pct !== null && d.pct >= 80),
    [metrics.dailyMetrics]
  );

  // Lowest active day (only meaningful if active and below 80%)
  const meaningfulLowestDay = useMemo(() => {
    if (!metrics.lowestActiveDay) return null;
    if (metrics.lowestActiveDay.pct >= 80) return null; // If all active days are >=80%, lowest is not an issue
    return metrics.lowestActiveDay;
  }, [metrics.lowestActiveDay]);

  return (
    <div className="weekly-review-section" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Week Header / Navigation */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm, 12px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--ink-muted)"
            }}
          >
            Factual Weekly Review
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
            {formatShort(currentWeekStart)} &ndash; {formatShort(weekEnd)}
          </div>
        </div>

        {onNavigateWeek ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 36, padding: "0 10px", fontSize: 12 }}
              onClick={() => onNavigateWeek(addDays(currentWeekStart, -7))}
              aria-label="Previous week review"
            >
              &lsaquo; Prev Week
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 36, padding: "0 10px", fontSize: 12 }}
              onClick={() => onNavigateWeek(addDays(currentWeekStart, 7))}
              aria-label="Next week review"
            >
              Next Week &rsaquo;
            </button>
          </div>
        ) : null}
      </div>

      {/* SECTION 1: THIS WEEK METRICS */}
      <section aria-label="This Week Metrics">
        <h3
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--ink-muted)",
            marginBottom: 10
          }}
        >
          This Week Summary
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10
          }}
        >
          <div
            className="card"
            style={{
              padding: "12px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 12px)"
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 600 }}>
              Active Days
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
              {metrics.activeDays} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>/ 7</span>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "12px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 12px)"
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 600 }}>
              Successful Days
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent, #0d9488)", marginTop: 4 }}>
              {metrics.highConsistencyDays}{" "}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
                ({metrics.activeDays > 0 ? Math.round((metrics.highConsistencyDays / metrics.activeDays) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "12px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 12px)"
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 600 }}>
              Avg Completion
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
              {metrics.averageCompletion !== null
                ? `${Math.round(metrics.averageCompletion)}%`
                : "—"}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "12px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 12px)"
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 600 }}>
              Tasks Completed
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
              {metrics.completedTasks}{" "}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
                / {metrics.totalTasks}
              </span>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "12px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 12px)"
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 600 }}>
              Streak (Current / Best)
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
              {metrics.currentStreak}d{" "}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
                / {metrics.bestStreak}d best
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: WHAT WENT WELL & WHAT NEEDS ATTENTION */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14
        }}
      >
        {/* What Went Well */}
        <section aria-label="What Went Well">
          <div
            className="card"
            style={{
              padding: "16px 18px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 12px)",
              height: "100%"
            }}
          >
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--accent, #0d9488)",
                margin: "0 0 10px 0",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>✓</span> What Went Well
            </h4>

            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 13,
                color: "var(--ink)"
              }}
            >
              {metrics.activeDays === 0 ? (
                <li style={{ color: "var(--ink-muted)" }}>No tasks were tracked this week.</li>
              ) : (
                <>
                  <li>
                    <strong>{metrics.highConsistencyDays} of {metrics.activeDays} active days</strong> reached the 80%+ completion target
                    {successfulDays.length > 0 && (
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                        {successfulDays.map((d) => `${weekdayFull(d.date)} (${Math.round(d.pct ?? 0)}%)`).join(", ")}
                      </div>
                    )}
                  </li>
                  {metrics.bestDay && metrics.bestDay.pct > 0 && (
                    <li>
                      <strong>Strongest day:</strong> {metrics.bestDay.dayName} with{" "}
                      {Math.round(metrics.bestDay.pct)}% completion ({metrics.bestDay.completed}/{metrics.bestDay.total} tasks).
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </section>

        {/* What Needs Attention */}
        <section aria-label="What Needs Attention">
          <div
            className="card"
            style={{
              padding: "16px 18px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 12px)",
              height: "100%"
            }}
          >
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--ink-muted)",
                margin: "0 0 10px 0",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>ℹ</span> What Needs Attention
            </h4>

            <div style={{ fontSize: 13, color: "var(--ink)" }}>
              {meaningfulLowestDay ? (
                <div>
                  <strong>Lowest active completion:</strong> {meaningfulLowestDay.dayName} with{" "}
                  {Math.round(meaningfulLowestDay.pct)}% completion ({meaningfulLowestDay.completed}/{meaningfulLowestDay.total} tasks completed).
                </div>
              ) : metrics.activeDays > 0 ? (
                <div style={{ color: "var(--ink-muted)" }}>
                  All active days this week reached the 80%+ completion benchmark.
                </div>
              ) : (
                <div style={{ color: "var(--ink-muted)" }}>
                  No active tasks recorded this week.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 3: NEXT WEEK */}
      <section aria-label="Next Week Outlook">
        <div
          className="card"
          style={{
            padding: "16px 18px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm, 12px)"
          }}
        >
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--ink)",
              margin: "0 0 10px 0"
            }}
          >
            Next Week Outlook ({formatShort(nextWeekStart)} &ndash; {formatShort(nextWeekDates[6])})
          </h4>

          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              color: "var(--ink)"
            }}
          >
            {nextWeekObservations.map((obs, idx) => (
              <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "var(--accent, #0d9488)", marginTop: 1 }}>•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
