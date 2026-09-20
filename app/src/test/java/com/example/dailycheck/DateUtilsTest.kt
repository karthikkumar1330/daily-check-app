package com.example.dailycheck

import com.example.dailycheck.util.DateUtils
import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate

class DateUtilsTest {

    @Test
    fun testAddDays() {
        val base = "2026-09-20"
        assertEquals("2026-09-21", DateUtils.addDays(base, 1))
        assertEquals("2026-09-19", DateUtils.addDays(base, -1))
        assertEquals("2026-09-27", DateUtils.addDays(base, 7))
    }

    @Test
    fun testGetWeekDates() {
        // Monday 2026-09-15 to Sunday 2026-09-21
        val weekDates = DateUtils.getWeekDates("2026-09-15")
        assertEquals(7, weekDates.size)
        assertEquals("2026-09-15", weekDates[0])
        assertEquals("2026-09-21", weekDates[6])
    }

    @Test
    fun testCalendarMonthGrid() {
        val grid = DateUtils.getCalendarMonthGrid("2026-09-01")
        assertEquals(42, grid.size)
    }

    @Test
    fun testRelativeLabel() {
        val today = DateUtils.todayStr()
        val yesterday = DateUtils.addDays(today, -1)
        val tomorrow = DateUtils.addDays(today, 1)

        assertEquals("Today", DateUtils.getRelativeLabel(today))
        assertEquals("Yesterday", DateUtils.getRelativeLabel(yesterday))
        assertEquals("Tomorrow", DateUtils.getRelativeLabel(tomorrow))
    }
}
