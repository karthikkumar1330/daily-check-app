package com.example.dailycheck.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.components.ConfirmDeleteDialog
import com.example.dailycheck.ui.components.MonthCalendarView
import com.example.dailycheck.ui.components.TaskItemView
import com.example.dailycheck.util.DateUtils

@Composable
fun CalendarScreen(
    anchorMonth: String,
    selectedDate: String,
    allTasks: List<TaskEntity>,
    onMonthChange: (String) -> Unit,
    onDateSelect: (String) -> Unit,
    onToggleTask: (TaskEntity) -> Unit,
    onEditTask: (TaskEntity) -> Unit,
    onDeleteTask: (String) -> Unit,
    onOpenAddTask: () -> Unit,
    modifier: Modifier = Modifier
) {
    var taskToDelete by remember { mutableStateOf<String?>(null) }
    val selectedDayTasks = remember(allTasks, selectedDate) {
        allTasks.filter { it.date == selectedDate }.sortedBy { it.orderIndex }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenAddTask,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Task for Date")
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(top = 12.dp, bottom = 80.dp)
        ) {
            item {
                MonthCalendarView(
                    anchorMonthDate = anchorMonth,
                    selectedDate = selectedDate,
                    allTasks = allTasks,
                    onMonthChange = onMonthChange,
                    onDateSelect = onDateSelect
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${DateUtils.formatShort(selectedDate)} (${selectedDayTasks.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Text(
                        text = DateUtils.getRelativeLabel(selectedDate),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            if (selectedDayTasks.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No tasks on this date",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                items(selectedDayTasks, key = { it.id }) { task ->
                    TaskItemView(
                        task = task,
                        onToggle = { onToggleTask(task) },
                        onEdit = { onEditTask(task) },
                        onDelete = { taskToDelete = task.id }
                    )
                }
            }
        }
    }

    if (taskToDelete != null) {
        ConfirmDeleteDialog(
            title = "Delete Task",
            message = "Are you sure you want to delete this task?",
            onConfirm = {
                taskToDelete?.let { onDeleteTask(it) }
                taskToDelete = null
            },
            onDismiss = { taskToDelete = null }
        )
    }
}
