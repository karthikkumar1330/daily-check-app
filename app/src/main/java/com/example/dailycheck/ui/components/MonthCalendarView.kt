package com.example.dailycheck.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.util.CalendarDay
import com.example.dailycheck.util.DateUtils
import com.example.dailycheck.util.ProgressUtils

@Composable
fun MonthCalendarView(
    anchorMonthDate: String,
    selectedDate: String,
    allTasks: List<TaskEntity>,
    onMonthChange: (String) -> Unit,
    onDateSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val monthLabel = DateUtils.monthLabel(anchorMonthDate)
    val calendarDays = DateUtils.getCalendarMonthGrid(anchorMonthDate)
    val tasksByDate = allTasks.groupBy { it.date }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Month Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(
                    onClick = { onMonthChange(DateUtils.addMonths(anchorMonthDate, -1)) },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Previous Month"
                    )
                }

                Text(
                    text = monthLabel,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                IconButton(
                    onClick = { onMonthChange(DateUtils.addMonths(anchorMonthDate, 1)) },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "Next Month"
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Weekday Headers
            val weekdays = listOf("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa")
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                weekdays.forEach { day ->
                    Text(
                        text = day,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 6-week Grid (42 cells)
            val rows = calendarDays.chunked(7)
            rows.forEach { week ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 3.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    week.forEach { day ->
                        val isSelected = day.dateStr == selectedDate
                        val dayTasks = tasksByDate[day.dateStr] ?: emptyList()
                        val stats = ProgressUtils.computeDayStats(dayTasks)

                        CalendarDayCell(
                            day = day,
                            isSelected = isSelected,
                            taskCount = stats.total,
                            completedCount = stats.completed,
                            pct = stats.pct,
                            onClick = { onDateSelect(day.dateStr) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarDayCell(
    day: CalendarDay,
    isSelected: Boolean,
    taskCount: Int,
    completedCount: Int,
    pct: Int?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cellShape = RoundedCornerShape(8.dp)

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .padding(2.dp)
            .clip(cellShape)
            .background(
                when {
                    isSelected -> MaterialTheme.colorScheme.primaryContainer
                    day.isToday -> MaterialTheme.colorScheme.surfaceVariant
                    else -> Color.Transparent
                }
            )
            .then(
                if (day.isToday && !isSelected) {
                    Modifier.border(1.dp, MaterialTheme.colorScheme.primary, cellShape)
                } else Modifier
            )
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = day.dayNumber.toString(),
                style = MaterialTheme.typography.bodySmall,
                fontSize = 12.sp,
                fontWeight = if (day.isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
                color = when {
                    isSelected -> MaterialTheme.colorScheme.onPrimaryContainer
                    !day.isCurrentMonth -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f)
                    day.isToday -> MaterialTheme.colorScheme.primary
                    else -> MaterialTheme.colorScheme.onSurface
                }
            )

            // Completion dot
            if (taskCount > 0) {
                Spacer(modifier = Modifier.height(2.dp))
                val dotColor = when {
                    pct != null && pct >= 100 -> Color(0xFF2E9662)
                    pct != null && pct >= 50 -> Color(0xFFB4791B)
                    else -> Color(0xFFD2454B)
                }
                Box(
                    modifier = Modifier
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(dotColor)
                )
            }
        }
    }
}
