package com.example.dailycheck.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ClearAll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dailycheck.data.model.GoalEntity
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.components.*
import com.example.dailycheck.util.ProgressUtils

@Composable
fun TodayScreen(
    currentDate: String,
    tasks: List<TaskEntity>,
    primaryGoal: GoalEntity?,
    onDateChange: (String) -> Unit,
    onQuickAdd: (String) -> Unit,
    onOpenAddTask: () -> Unit,
    onOpenGoalsManager: () -> Unit,
    onToggleTask: (TaskEntity) -> Unit,
    onEditTask: (TaskEntity) -> Unit,
    onDeleteTask: (String) -> Unit,
    onMoveTask: (TaskEntity, Int) -> Unit,
    onClearCompleted: () -> Unit,
    modifier: Modifier = Modifier
) {
    var taskToDelete by remember { mutableStateOf<String?>(null) }
    val dayStats = remember(tasks) { ProgressUtils.computeDayStats(tasks) }
    val hasCompleted = remember(tasks) { tasks.any { it.completed } }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenAddTask,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.testTag("fab_add_task")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Task")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            DateNavigator(
                currentDate = currentDate,
                onDateChange = onDateChange
            )

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(top = 12.dp, bottom = 80.dp)
            ) {
                // Primary Countdown Goal
                if (primaryGoal != null) {
                    item {
                        CountdownCard(
                            goal = primaryGoal,
                            onManageClick = onOpenGoalsManager
                        )
                    }
                }

                // Progress Overview
                item {
                    ProgressCard(stats = dayStats)
                }

                // Inline Quick Add Bar
                item {
                    QuickAddTaskBar(
                        onQuickAdd = onQuickAdd,
                        onOpenFullDialog = onOpenAddTask
                    )
                }

                // Tasks Header
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Checklist (${tasks.size})",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        if (hasCompleted) {
                            TextButton(
                                onClick = onClearCompleted,
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ClearAll,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Clear Completed",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                // Empty State
                if (tasks.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 36.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "✨",
                                    style = MaterialTheme.typography.headlineLarge
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "No tasks planned for this day",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Use the input above or tap + to create your first task",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                } else {
                    itemsIndexed(tasks, key = { _, task -> task.id }) { index, task ->
                        TaskItemView(
                            task = task,
                            onToggle = { onToggleTask(task) },
                            onEdit = { onEditTask(task) },
                            onDelete = { taskToDelete = task.id },
                            onMoveUp = if (index > 0) { { onMoveTask(task, -1) } } else null,
                            onMoveDown = if (index < tasks.lastIndex) { { onMoveTask(task, 1) } } else null
                        )
                    }
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
