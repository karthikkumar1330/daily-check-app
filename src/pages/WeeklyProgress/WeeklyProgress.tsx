import { useMemo, useState } from "react";
import { useTasks } from "../../hooks/useTasks";
import { formatLong, addDays, getWeekDates, getWeekStart, todayStr, weekLabel } from "../../utils/dateUtils";
import { dayStats, formatPct, weekSummary } from "../../utils/progressUtils";
import { computeStreaks } from "../../utils/streakUtils";
import WeeklyChart from "../../components/WeeklyChart/WeeklyChart";
import WeeklySummary from "../../components/WeeklySummary/WeeklySummary";
import PrintWeek from "../../components/PrintWeek/PrintWeek";
import { PrintIcon } from "../../components/icons";

export default function WeeklyProgress() {
  const { appData } = useTasks();
  const [weekStart, setWeekStart] = useState(getWeekStart(todayStr()));
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const summary = useMemo(() => weekSummary(appData.days, weekDates), [appData.days, weekDates]);
  const streaks = useMemo(() => computeStreaks(appData.days), [appData.days]);

  return (
    <div className="page">
      <div className="section-row" style={{ margin: "0 0 16px" }}>
        <div className="page-title">Weekly Progress</div>
        <button
          className="link-btn"
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 5 }}
        >
          <PrintIcon /> Print Week
        </button>
      </div>

      <div className="week-nav">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
          {"\u2039"}
        </button>
        <div className="label">{weekLabel(weekStart)}</div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
          {"\u203A"}
        </button>
      </div>

      <WeeklyChart days={appData.days} weekStart={weekStart} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <div className="day-breakdown">
        {weekDates.map((dstr) => {
          const st = dayStats(appData.days[dstr]);
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

      <div className="footer-note">A day counts toward your streak at 80%+ completion. Zero-task days are skipped.</div>

      <PrintWeek days={appData.days} weekStart={weekStart} />
    </div>
  );
}
