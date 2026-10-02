import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import { useCountdowns } from "../../hooks/useCountdowns";
import { addDays, getWeekDates, getWeekStart, todayStr, weekLabel, weekdayFull } from "../../utils/dateUtils";
import { dayStats, weekSummary } from "../../utils/progressUtils";
import { resolveDayData } from "../../utils/recurrenceUtils";
import { computeStreaks } from "../../utils/streakUtils";
import { calculatePeriodMetrics, getDateRangePreset, type DateRangePreset } from "../../utils/insightsUtils";
import WeeklyChart from "../../components/WeeklyChart/WeeklyChart";
import WeeklySummary from "../../components/WeeklySummary/WeeklySummary";
import WeeklyReview from "../../components/WeeklyReview/WeeklyReview";
import TrendChart from "../../components/Insights/TrendChart";
import PrintWeek from "../../components/PrintWeek/PrintWeek";
import { InsightsIcon, PrintIcon } from "../../components/icons";
import { WeeklyInsights, WeeklyStats } from "./WeeklyStats";

type WeeklyTab = "overview" | "review" | "trends";
type TrendPreset = "last_7_days" | "last_30_days" | "last_90_days";

export default function WeeklyProgress() {
  const navigate = useNavigate();
  const { appData } = useTasks();
  const { countdowns } = useCountdowns();
  const weekStartsOn = appData.weekStartsOn ?? 1;

  const [activeTab, setActiveTab] = useState<WeeklyTab>("overview");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayStr(), weekStartsOn));
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [trendPreset, setTrendPreset] = useState<TrendPreset>("last_30_days");

  // Keep weekStart in sync if weekStartsOn setting changes
  useEffect(() => {
    setWeekStart(getWeekStart(selectedDate, weekStartsOn));
  }, [weekStartsOn]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const currentWeekStart = useMemo(() => getWeekStart(todayStr(), weekStartsOn), [weekStartsOn]);
  const isCurrentWeek = weekStart === currentWeekStart;

  const summary = useMemo(
    () => weekSummary(appData.days, weekDates, appData.recurringTasks),
    [appData.days, weekDates, appData.recurringTasks]
  );
  const streaks = useMemo(
    () => computeStreaks(appData.days, appData.recurringTasks),
    [appData.days, appData.recurringTasks]
  );

  const activeDaysCount = useMemo(() => {
    return weekDates.filter((dstr) => {
      const day = resolveDayData(dstr, appData.days[dstr], appData.recurringTasks);
      return (day?.tasks?.length ?? 0) > 0;
    }).length;
  }, [weekDates, appData.days, appData.recurringTasks]);

  const hasTasksThisWeek = summary.created > 0;

  // Factual observations for the week
  const { strongestDay, lowestDay } = useMemo(() => {
    const daysWithTasks = weekDates
      .map((dstr) => {
        const day = resolveDayData(dstr, appData.days[dstr], appData.recurringTasks);
        const st = dayStats(day);
        return {
          date: dstr,
          weekday: weekdayFull(dstr),
          pct: st.pct ?? 0,
          total: st.total,
          completed: st.completed
        };
      })
      .filter((d) => d.total > 0);

    if (daysWithTasks.length < 2) {
      return { strongestDay: null, lowestDay: null };
    }

    let best = daysWithTasks[0];
    let lowest = daysWithTasks[0];
    for (const d of daysWithTasks) {
      if (d.pct > best.pct || (d.pct === best.pct && d.completed > best.completed)) {
        best = d;
      }
      if (d.pct < lowest.pct || (d.pct === lowest.pct && d.completed < lowest.completed)) {
        lowest = d;
      }
    }

    return { strongestDay: best, lowestDay: lowest };
  }, [weekDates, appData.days, appData.recurringTasks]);

  // Trend metrics for Trends tab
  const trendRange = useMemo(() => getDateRangePreset(trendPreset as DateRangePreset), [trendPreset]);
  const trendMetrics = useMemo(
    () => calculatePeriodMetrics(appData, trendRange.startDate, trendRange.endDate),
    [appData, trendRange]
  );

  return (
    <div className="page weekly-page">
      {/* Segmented View Switcher */}
      <div
        className="seg-compact"
        role="tablist"
        aria-label="Weekly Progress View Mode"
        style={{ width: "100%", marginBottom: 12, marginTop: 4 }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={activeTab === "overview" ? "active" : ""}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "review"}
          className={activeTab === "review" ? "active" : ""}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => setActiveTab("review")}
        >
          Weekly Review
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "trends"}
          className={activeTab === "trends" ? "active" : ""}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => setActiveTab("trends")}
        >
          Trends
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Week Navigation */}
          <div className="weekly-nav-row" role="region" aria-label="Week navigation">
            <button
              type="button"
              className="weekly-nav-btn"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              aria-label="Previous week"
              title="Previous week"
            >
              ‹
            </button>
            <div className="weekly-nav-center">
              <span className="weekly-nav-range">{weekLabel(weekStart)}</span>
              {isCurrentWeek ? (
                <span className="weekly-nav-badge">This week</span>
              ) : (
                <button
                  type="button"
                  className="weekly-nav-today-btn"
                  onClick={() => setWeekStart(currentWeekStart)}
                  aria-label="Jump to current week"
                >
                  This week
                </button>
              )}
            </div>
            <button
              type="button"
              className="weekly-nav-btn"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              aria-label="Next week"
              title="Next week"
            >
              ›
            </button>
          </div>

          {!hasTasksThisWeek ? (
            /* Compact Empty State */
            <div className="weekly-empty-card" role="region" aria-label="No tasks this week">
              <div className="weekly-empty-icon" aria-hidden="true">📅</div>
              <div className="weekly-empty-title">No tasks this week</div>
              <div className="weekly-empty-desc">
                Add tasks to start tracking weekly progress.
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/today")}
                style={{ minHeight: 44, padding: "0 20px" }}
              >
                Go to Today
              </button>
            </div>
          ) : (
            <>
              {/* Weekly Summary */}
              <WeeklySummary
                summary={summary}
                streaks={streaks}
                activeDaysCount={activeDaysCount}
              />

              {/* 7-Day Progress Visualization */}
              <WeeklyChart
                days={appData.days}
                recurringTasks={appData.recurringTasks}
                weekStart={weekStart}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              {/* Weekly Statistics */}
              <WeeklyStats
                summary={summary}
                streaks={streaks}
                activeDaysCount={activeDaysCount}
              />

              {/* Optional Insights / Context */}
              <WeeklyInsights
                strongestDay={strongestDay}
                lowestDay={lowestDay}
              />
            </>
          )}

          {/* Secondary Actions */}
          <div className="weekly-actions-row">
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate("/insights")}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <InsightsIcon /> View Full Insights
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => window.print()}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <PrintIcon /> Print Week
            </button>
          </div>

          <PrintWeek days={appData.days} recurringTasks={appData.recurringTasks} weekStart={weekStart} />
        </>
      )}

      {activeTab === "review" && (
        <WeeklyReview
          appData={appData}
          countdowns={countdowns}
          weekStart={weekStart}
          onNavigateWeek={setWeekStart}
        />
      )}

      {activeTab === "trends" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Trend Range Selector */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {(
              [
                { key: "last_7_days", label: "7 Days" },
                { key: "last_30_days", label: "30 Days" },
                { key: "last_90_days", label: "90 Days" }
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                className={`btn ${trendPreset === p.key ? "btn-primary" : "btn-secondary"}`}
                style={{
                  minHeight: 38,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: "var(--radius-pill, 9999px)"
                }}
                onClick={() => setTrendPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <TrendChart dailyMetrics={trendMetrics.dailyMetrics} height={160} />

          {/* Key Metrics Grid for Selected Range */}
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
                {trendMetrics.activeDays}{" "}
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
                  / {trendRange.dates.length}d
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
                Successful Days
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent, #0d9488)", marginTop: 4 }}>
                {trendMetrics.highConsistencyDays}{" "}
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
                  ({trendMetrics.activeDays > 0 ? Math.round((trendMetrics.highConsistencyDays / trendMetrics.activeDays) * 100) : 0}%)
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
                {trendMetrics.averageCompletion !== null
                  ? `${Math.round(trendMetrics.averageCompletion)}%`
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
                Current / Best Streak
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                {trendMetrics.currentStreak}d{" "}
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
                  / {trendMetrics.bestStreak}d
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
