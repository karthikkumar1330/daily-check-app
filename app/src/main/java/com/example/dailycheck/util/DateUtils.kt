package com.example.dailycheck.util

import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

object DateUtils {
    private val ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    fun todayStr(): String = LocalDate.now().format(ISO_FORMATTER)

    fun parseDate(dateStr: String): LocalDate {
        return try {
            LocalDate.parse(dateStr, ISO_FORMATTER)
        } catch (e: Exception) {
            LocalDate.now()
        }
    }

    fun formatDate(date: LocalDate): String = date.format(ISO_FORMATTER)

    fun formatLong(dateStr: String): String {
        val date = parseDate(dateStr)
        val dayOfWeek = date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.getDefault())
        val month = date.month.getDisplayName(TextStyle.FULL, Locale.getDefault())
        return "$dayOfWeek, $month ${date.dayOfMonth}, ${date.year}"
    }

    fun formatMedium(dateStr: String): String {
        val date = parseDate(dateStr)
        val month = date.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
        return "$month ${date.dayOfMonth}, ${date.year}"
    }

    fun formatShort(dateStr: String): String {
        val date = parseDate(dateStr)
        val dayOfWeek = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())
        val month = date.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
        return "$dayOfWeek, $month ${date.dayOfMonth}"
    }

    fun getRelativeLabel(dateStr: String): String {
        val today = LocalDate.now()
        val target = parseDate(dateStr)
        val diff = ChronoUnit.DAYS.between(today, target)
        return when (diff) {
            0L -> "Today"
            -1L -> "Yesterday"
            1L -> "Tomorrow"
            else -> formatShort(dateStr)
        }
    }

    fun addDays(dateStr: String, days: Long): String {
        val date = parseDate(dateStr)
        return date.plusDays(days).format(ISO_FORMATTER)
    }

    fun getWeekStart(dateStr: String): String {
        val date = parseDate(dateStr)
        // Monday as first day of week
        val dayOfWeek = date.dayOfWeek.value // 1 = Monday, 7 = Sunday
        val monday = date.minusDays((dayOfWeek - 1).toLong())
        return monday.format(ISO_FORMATTER)
    }

    fun getWeekDates(weekStartStr: String): List<String> {
        val monday = parseDate(weekStartStr)
        return (0..6).map { monday.plusDays(it.toLong()).format(ISO_FORMATTER) }
    }

    fun weekLabel(weekStartStr: String): String {
        val start = parseDate(weekStartStr)
        val end = start.plusDays(6)
        val startMonth = start.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
        val endMonth = end.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
        return if (start.month == end.month) {
            "$startMonth ${start.dayOfMonth} – ${end.dayOfMonth}, ${start.year}"
        } else {
            "$startMonth ${start.dayOfMonth} – $endMonth ${end.dayOfMonth}, ${end.year}"
        }
    }

    fun monthAnchor(dateStr: String): String {
        val d = parseDate(dateStr)
        return LocalDate.of(d.year, d.month, 1).format(ISO_FORMATTER)
    }

    fun addMonths(dateStr: String, delta: Long): String {
        val d = parseDate(dateStr)
        return d.plusMonths(delta).format(ISO_FORMATTER)
    }

    fun monthLabel(dateStr: String): String {
        val d = parseDate(dateStr)
        val month = d.month.getDisplayName(TextStyle.FULL, Locale.getDefault())
        return "$month ${d.year}"
    }

    // 42-day calendar grid (6 weeks starting from Sunday or Monday)
    // Original React app uses Sunday as calendar grid start
    fun getCalendarMonthGrid(anchorDateStr: String): List<CalendarDay> {
        val anchor = parseDate(anchorDateStr)
        val firstOfMonth = LocalDate.of(anchor.year, anchor.month, 1)
        val daysInMonth = YearMonth.of(anchor.year, anchor.month).lengthOfMonth()
        val todayStr = todayStr()

        // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        val startDayOfWeek = firstOfMonth.dayOfWeek.value % 7 // Java Sunday is 7 -> 0

        val days = mutableListOf<CalendarDay>()

        // Previous month padding
        val prevMonth = firstOfMonth.minusMonths(1)
        val prevDaysInMonth = YearMonth.of(prevMonth.year, prevMonth.month).lengthOfMonth()
        for (i in startDayOfWeek - 1 downTo 0) {
            val dayNum = prevDaysInMonth - i
            val date = LocalDate.of(prevMonth.year, prevMonth.month, dayNum)
            val str = date.format(ISO_FORMATTER)
            days.add(CalendarDay(str, dayNum, isCurrentMonth = false, isToday = str == todayStr))
        }

        // Current month
        for (dayNum in 1..daysInMonth) {
            val date = LocalDate.of(anchor.year, anchor.month, dayNum)
            val str = date.format(ISO_FORMATTER)
            days.add(CalendarDay(str, dayNum, isCurrentMonth = true, isToday = str == todayStr))
        }

        // Next month padding to reach 42 cells (or multiple of 7)
        var nextDay = 1
        val nextMonth = firstOfMonth.plusMonths(1)
        while (days.size < 42) {
            val date = LocalDate.of(nextMonth.year, nextMonth.month, nextDay)
            val str = date.format(ISO_FORMATTER)
            days.add(CalendarDay(str, nextDay, isCurrentMonth = false, isToday = str == todayStr))
            nextDay++
        }

        return days
    }
}

data class CalendarDay(
    val dateStr: String,
    val dayNumber: Int,
    val isCurrentMonth: Boolean,
    val isToday: Boolean
)
