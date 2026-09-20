package com.example.dailycheck.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.components.WeeklyChart
import com.example.dailycheck.ui.components.WeeklySummaryCard
import com.example.dailycheck.util.DateUtils
import com.example.dailycheck.util.ProgressUtils

@Composable
fun WeeklyProgressScreen(
    weekAnchor: String,
    allTasks: List<TaskEntity>,
    onWeekChange: (String) -> Unit,
    onDaySelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val weekDates = remember(weekAnchor) { DateUtils.getWeekDates(weekAnchor) }
    val (summary, daysProgress) = remember(allTasks, weekDates) {
        ProgressUtils.computeWeekSummary(allTasks, weekDates)
    }
    val streaks = remember(allTasks) { ProgressUtils.computeStreaks(allTasks) }

    val todayWeekStart = DateUtils.getWeekStart(DateUtils.todayStr())
    val isCurrentWeek = weekAnchor == todayWeekStart

    Column(
        modifier = modifier
            .fillMaxSize()
    ) {
        // Week Header
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 1.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(
                    onClick = { onWeekChange(DateUtils.addDays(weekAnchor, -7)) },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Previous Week"
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = if (isCurrentWeek) "This Week" else "Weekly Progress",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = DateUtils.weekLabel(weekAnchor),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (!isCurrentWeek) {
                        TextButton(
                            onClick = { onWeekChange(todayWeekStart) },
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("Current", style = MaterialTheme.typography.labelSmall)
                        }
                    }

                    IconButton(
                        onClick = { onWeekChange(DateUtils.addDays(weekAnchor, 7)) },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = "Next Week"
                        )
                    }
                }
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(top = 14.dp, bottom = 80.dp)
        ) {
            item {
                WeeklyChart(
                    days = daysProgress,
                    onDayClick = onDaySelect
                )
            }

            item {
                WeeklySummaryCard(
                    summary = summary,
                    streaks = streaks
                )
            }

            item {
                Text(
                    text = "Daily Breakdown",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            items(daysProgress, key = { it.dateStr }) { day ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onDaySelect(day.dateStr) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "${day.dayName}, ${DateUtils.formatShort(day.dateStr)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "${day.completed} of ${day.total} tasks completed",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Text(
                            text = ProgressUtils.formatPct(day.pct),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (day.pct != null && day.pct >= 80) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
    }
}
