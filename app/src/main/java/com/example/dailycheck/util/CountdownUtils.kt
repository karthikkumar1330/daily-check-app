package com.example.dailycheck.util

import com.example.dailycheck.data.model.GoalEntity
import java.time.LocalDate
import java.time.temporal.ChronoUnit

enum class GoalPhase {
    UPCOMING, ACTIVE, COMPLETED
}

data class GoalStatus(
    val phase: GoalPhase,
    val daysUntilStart: Long,
    val daysLeft: Long,
    val elapsedDays: Long,
    val totalDays: Long,
    val dayNumber: Long,
    val progressPct: Int
)

object CountdownUtils {
    fun compute(goal: GoalEntity, todayStr: String = DateUtils.todayStr()): GoalStatus {
        val today = DateUtils.parseDate(todayStr)
        val start = DateUtils.parseDate(goal.startDate)
        val target = DateUtils.parseDate(goal.targetDate)

        // total days inclusive of start & target: between + 1
        val totalDays = maxOf(1L, ChronoUnit.DAYS.between(start, target) + 1)

        return when {
            today.isBefore(start) -> {
                val until = ChronoUnit.DAYS.between(today, start)
                GoalStatus(
                    phase = GoalPhase.UPCOMING,
                    daysUntilStart = until,
                    daysLeft = ChronoUnit.DAYS.between(today, target),
                    elapsedDays = 0,
                    totalDays = totalDays,
                    dayNumber = 0,
                    progressPct = 0
                )
            }
            today.isAfter(target) -> {
                GoalStatus(
                    phase = GoalPhase.COMPLETED,
                    daysUntilStart = 0,
                    daysLeft = 0,
                    elapsedDays = totalDays,
                    totalDays = totalDays,
                    dayNumber = totalDays,
                    progressPct = 100
                )
            }
            else -> {
                // Active
                val elapsed = ChronoUnit.DAYS.between(start, today) // 0-based
                val dayNumber = elapsed + 1
                val daysLeft = maxOf(0L, ChronoUnit.DAYS.between(today, target))
                val pct = ((dayNumber.toFloat() / totalDays.toFloat()) * 100).toInt().coerceIn(0, 100)
                GoalStatus(
                    phase = GoalPhase.ACTIVE,
                    daysUntilStart = 0,
                    daysLeft = daysLeft,
                    elapsedDays = elapsed,
                    totalDays = totalDays,
                    dayNumber = dayNumber,
                    progressPct = pct
                )
            }
        }
    }
}
