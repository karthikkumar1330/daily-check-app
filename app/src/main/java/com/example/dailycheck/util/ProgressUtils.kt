package com.example.dailycheck.util

import com.example.dailycheck.data.model.TaskEntity
import java.time.format.TextStyle
import java.util.Locale

data class DayStats(
    val total: Int,
    val completed: Int,
    val remaining: Int,
    val pct: Int? // null when total == 0
)

data class WeekSummary(
    val avgPct: Int?,
    val completed: Int,
    val created: Int,
    val bestDay: String?
)

data class Streaks(
    val current: Int,
    val best: Int
)

data class DayProgress(
    val dateStr: String,
    val dayName: String,
    val total: Int,
    val completed: Int,
    val pct: Int?
)

object ProgressUtils {
    fun computeDayStats(tasks: List<TaskEntity>): DayStats {
        val total = tasks.size
        val completed = tasks.count { it.completed }
        val pct = if (total == 0) null else ((completed.toFloat() / total.toFloat()) * 100).toInt()
        return DayStats(total = total, completed = completed, remaining = total - completed, pct = pct)
    }

    fun formatPct(pct: Int?): String = if (pct == null) "–" else "$pct%"

    fun motivationalMsg(stats: DayStats): String {
        if (stats.total == 0) return "Nothing planned yet."
        val pct = stats.pct ?: 0
        return when {
            pct >= 100 -> "Perfect day! 🎉"
            pct >= 80 -> "Excellent work! 💪"
            pct >= 60 -> "Good progress. Keep going."
            pct >= 40 -> "Keep moving forward."
            else -> "Every completed task counts."
        }
    }

    fun computeWeekSummary(allTasks: List<TaskEntity>, weekDates: List<String>): Pair<WeekSummary, List<DayProgress>> {
        val tasksByDate = allTasks.groupBy { it.date }
        var totalPctSum = 0
        var countedDays = 0
        var totalCompleted = 0
        var totalCreated = 0
        var bestDay: String? = null
        var bestPct = -1
        var bestCompleted = -1

        val dayProgressList = weekDates.map { dstr ->
            val date = DateUtils.parseDate(dstr)
            val dayName = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())
            val dayTasks = tasksByDate[dstr] ?: emptyList()
            val st = computeDayStats(dayTasks)

            totalCompleted += st.completed
            totalCreated += st.total

            if (st.total > 0 && st.pct != null) {
                totalPctSum += st.pct
                countedDays++
                val better = st.pct > bestPct || (st.pct == bestPct && st.completed > bestCompleted)
                if (better) {
                    bestPct = st.pct
                    bestCompleted = st.completed
                    bestDay = date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.getDefault())
                }
            }

            DayProgress(
                dateStr = dstr,
                dayName = dayName,
                total = st.total,
                completed = st.completed,
                pct = st.pct
            )
        }

        val summary = WeekSummary(
            avgPct = if (countedDays > 0) Math.round(totalPctSum.toFloat() / countedDays) else null,
            completed = totalCompleted,
            created = totalCreated,
            bestDay = bestDay
        )

        return Pair(summary, dayProgressList)
    }

    fun computeStreaks(allTasks: List<TaskEntity>, todayStr: String = DateUtils.todayStr()): Streaks {
        val tasksByDate = allTasks.groupBy { it.date }
        val activeDates = tasksByDate.keys.filter { (tasksByDate[it]?.size ?: 0) > 0 }.sorted()

        if (activeDates.isEmpty()) return Streaks(0, 0)

        val minDate = activeDates.first()
        val maxDate = todayStr
        val threshold = 80

        // Current streak: walk backward from today, skipping zero-task days
        var current = 0
        var cursor = todayStr
        var guard = 0
        while (cursor >= minDate && guard < 20000) {
            val tasks = tasksByDate[cursor] ?: emptyList()
            val st = computeDayStats(tasks)
            if (st.total > 0) {
                if (st.pct != null && st.pct >= threshold) {
                    current++
                    cursor = DateUtils.addDays(cursor, -1)
                } else {
                    break
                }
            } else {
                cursor = DateUtils.addDays(cursor, -1)
            }
            guard++
        }

        // Best streak: scan chronologically
        var best = 0
        var running = 0
        var cur = minDate
        guard = 0
        while (cur <= maxDate && guard < 20000) {
            val tasks = tasksByDate[cur] ?: emptyList()
            val st = computeDayStats(tasks)
            if (st.total > 0) {
                if (st.pct != null && st.pct >= threshold) {
                    running++
                    if (running > best) best = running
                } else {
                    running = 0
                }
            }
            cur = DateUtils.addDays(cur, 1)
            guard++
        }

        if (current > best) best = current
        return Streaks(current = current, best = best)
    }
}
