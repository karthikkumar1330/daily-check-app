package com.example.dailycheck.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.components.ConfirmDeleteDialog
import com.example.dailycheck.ui.components.TaskItemView
import com.example.dailycheck.util.DateUtils

@Composable
fun ImportantScreen(
    allTasks: List<TaskEntity>,
    onToggleTask: (TaskEntity) -> Unit,
    onEditTask: (TaskEntity) -> Unit,
    onDeleteTask: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val today = DateUtils.todayStr()
    var taskToDelete by remember { mutableStateOf<String?>(null) }

    val highPriority = remember(allTasks) { allTasks.filter { it.priority == 1 } }
    val todayTasks = remember(highPriority, today) {
        highPriority.filter { it.date == today && !it.completed }.sortedBy { it.orderIndex }
    }
    val upcomingTasks = remember(highPriority, today) {
        highPriority.filter { it.date > today && !it.completed }.sortedBy { it.date }
    }
    val completedTasks = remember(highPriority) {
        highPriority.filter { it.completed }.sortedByDescending { it.completedAt ?: 0L }
    }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 80.dp)
        ) {
            item {
                Text(
                    text = "Important Tasks",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "High-priority tasks organized by urgency",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Due Today Group
            item {
                Text(
                    text = "Due Today (${todayTasks.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            if (todayTasks.isEmpty()) {
                item {
                    Text(
                        text = "No urgent tasks for today",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(todayTasks, key = { it.id }) { task ->
                    TaskItemView(
                        task = task,
                        onToggle = { onToggleTask(task) },
                        onEdit = { onEditTask(task) },
                        onDelete = { taskToDelete = task.id }
                    )
                }
            }

            // Upcoming Group
            item {
                Text(
                    text = "Upcoming (${upcomingTasks.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            if (upcomingTasks.isEmpty()) {
                item {
                    Text(
                        text = "No upcoming high-priority tasks",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(upcomingTasks, key = { it.id }) { task ->
                    TaskItemView(
                        task = task,
                        onToggle = { onToggleTask(task) },
                        onEdit = { onEditTask(task) },
                        onDelete = { taskToDelete = task.id },
                        showDate = true
                    )
                }
            }

            // Completed Group
            if (completedTasks.isNotEmpty()) {
                item {
                    Text(
                        text = "Completed (${completedTasks.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
                items(completedTasks, key = { it.id }) { task ->
                    TaskItemView(
                        task = task,
                        onToggle = { onToggleTask(task) },
                        onEdit = { onEditTask(task) },
                        onDelete = { taskToDelete = task.id },
                        showDate = true
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
