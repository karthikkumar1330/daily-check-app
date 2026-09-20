package com.example.dailycheck

import com.example.dailycheck.data.model.GoalEntity
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.util.CountdownUtils
import com.example.dailycheck.util.DateUtils
import com.example.dailycheck.util.GoalPhase
import com.example.dailycheck.util.ProgressUtils
import org.junit.Assert.*
import org.junit.Test

class ProgressUtilsTest {

    @Test
    fun testDayStats_EmptyTasks() {
        val stats = ProgressUtils.computeDayStats(emptyList())
        assertEquals(0, stats.total)
        assertEquals(0, stats.completed)
        assertNull(stats.pct)
        assertEquals("–", ProgressUtils.formatPct(stats.pct))
    }

    @Test
    fun testDayStats_WithTasks() {
        val tasks = listOf(
            TaskEntity(date = "2026-09-20", title = "Task 1", completed = true),
            TaskEntity(date = "2026-09-20", title = "Task 2", completed = false),
            TaskEntity(date = "2026-09-20", title = "Task 3", completed = true),
            TaskEntity(date = "2026-09-20", title = "Task 4", completed = true)
        )
        val stats = ProgressUtils.computeDayStats(tasks)
        assertEquals(4, stats.total)
        assertEquals(3, stats.completed)
        assertEquals(1, stats.remaining)
        assertEquals(75, stats.pct)
        assertEquals("75%", ProgressUtils.formatPct(stats.pct))
    }

    @Test
    fun testCountdownUtils() {
        val today = DateUtils.todayStr()
        val startDate = DateUtils.addDays(today, -10)
        val targetDate = DateUtils.addDays(today, 10)

        val goal = GoalEntity(
            title = "Test Goal",
            startDate = startDate,
            targetDate = targetDate,
            icon = "🎯"
        )

        val status = CountdownUtils.compute(goal, today = today)
        assertEquals(GoalPhase.ACTIVE, status.phase)
        assertEquals(20, status.totalDays)
        assertEquals(10, status.daysLeft)
        assertEquals(50, status.progressPct)
    }

    @Test
    fun testComputeStreaks() {
        val today = DateUtils.todayStr()
        val d1 = DateUtils.addDays(today, -2)
        val d2 = DateUtils.addDays(today, -1)

        val tasks = listOf(
            TaskEntity(date = d1, title = "T1", completed = true),
            TaskEntity(date = d2, title = "T2", completed = true),
            TaskEntity(date = today, title = "T3", completed = true)
        )

        val streaks = ProgressUtils.computeStreaks(tasks, todayStr = today)
        assertEquals(3, streaks.current)
        assertEquals(3, streaks.best)
    }
}
