import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import { useCountdownGoals } from "../../hooks/useCountdownGoals";
import { formatLong, addDays, getWeekDates, getWeekStart, todayStr, weekLabel } from "../../utils/dateUtils";
import { dayStats, formatPct, weekSummary } from "../../utils/progressUtils";
import { resolveDayData } from "../../utils/recurrenceUtils";
import { computeStreaks } from "../../utils/streakUtils";
import { calculatePeriodMetrics, getDateRangePreset, type DateRangePreset } from "../../utils/insightsUtils";
import WeeklyChart from "../../components/WeeklyChart/WeeklyChart";
import WeeklySummary from "../../components/WeeklySummary/WeeklySummary";
import WeeklyReview from "../../components/WeeklyReview/WeeklyReview";
import TrendChart from "../../components/Insights/TrendChart";
import PrintWeek from "../../components/PrintWeek/PrintWeek";
import { InsightsIcon, PrintIcon } from "../../components/icons";

type WeeklyTab = "overview" | "review" | "trends";
type TrendPreset = "last_7_days" | "last_30_days" | "last_90_days";

export default function WeeklyProgress() {
  const navigate = useNavigate();
  const { appData } = useTasks();
  const { goals } = useCountdownGoals();
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
  const summary = useMemo(
    () => weekSummary(appData.days, weekDates, appData.recurringTasks),
    [appData.days, weekDates, appData.recurringTasks]
  );
  const streaks = useMemo(
    () => computeStreaks(appData.days, appData.recurringTasks),
    [appData.days, appData.recurringTasks]
  );

  // Trend metrics for Trends tab
  const trendRange = useMemo(() => getDateRangePreset(trendPreset as DateRangePreset), [trendPreset]);
  const trendMetrics = useMemo(
    () => calculatePeriodMetrics(appData, trendRange.startDate, trendRange.endDate),
    [appData, trendRange]
  );

  return (
    <div className="page" style={{ paddingBottom: 64 }}>
      <div className="section-row" style={{ margin: "0 0 12px", flexWrap: "wrap", gap: 10 }}>
        <div className="page-title">Weekly Progress</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="link-btn"
            onClick={() => navigate("/insights")}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
          >
            <InsightsIcon /> View Full Insights
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => window.print()}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
          >
            <PrintIcon /> Print Week
          </button>
        </div>
      </div>

      {/* Segmented View Switcher */}
      <div
        className="seg"
        role="tablist"
        aria-label="Weekly Progress View Mode"
        style={{ width: "100%", marginBottom: 16 }}
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
          <div className="week-nav">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
              {"\u2039"}
            </button>
            <div className="label">{weekLabel(weekStart)}</div>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
              {"\u203A"}
            </button>
          </div>

          <WeeklyChart
            days={appData.days}
            recurringTasks={appData.recurringTasks}
            weekStart={weekStart}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <div className="day-breakdown">
            {weekDates.map((dstr) => {
              const day = resolveDayData(dstr, appData.days[dstr], appData.recurringTasks);
              const st = dayStats(day);
              return (
                <button
                  key={dstr}
                  className={"day-breakdown-row" + (dstr === selectedDate ? " selected" : "")}
                  onClick={() => setSelectedDate(dstr)}
                >
                  <span className="day-breakdown-date">{formatLong(dstr)}</span>
                  <span className="day-breakdown-stat">
                    {st.total === 0 ? "No tasks" : `${st.completed}/${st.total} \u00B7 ${formatPct(st.pct)}`}
                  </span>
                </button>
              );
            })}
          </div>

          <WeeklySummary summary={summary} streaks={streaks} />

          <div className="footer-note">
            A day counts toward your streak at 80%+ completion. Zero-task days are skipped.
          </div>

          <PrintWeek days={appData.days} recurringTasks={appData.recurringTasks} weekStart={weekStart} />
        </>
      )}

      {activeTab === "review" && (
        <WeeklyReview
          appData={appData}
          goals={goals}
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

