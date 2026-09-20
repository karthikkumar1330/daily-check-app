package com.example.dailycheck.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dailycheck.data.model.Categories
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.TaskStatusFilter
import com.example.dailycheck.ui.components.ConfirmDeleteDialog
import com.example.dailycheck.ui.components.TaskItemView
import com.example.dailycheck.util.DateUtils

@Composable
fun TasksScreen(
    allTasks: List<TaskEntity>,
    searchQuery: String,
    statusFilter: TaskStatusFilter,
    categoryFilter: String?,
    onSearchChange: (String) -> Unit,
    onStatusFilterChange: (TaskStatusFilter) -> Unit,
    onCategoryFilterChange: (String?) -> Unit,
    onToggleTask: (TaskEntity) -> Unit,
    onEditTask: (TaskEntity) -> Unit,
    onDeleteTask: (String) -> Unit,
    onOpenAddTask: () -> Unit,
    modifier: Modifier = Modifier
) {
    var taskToDelete by remember { mutableStateOf<String?>(null) }

    val filteredTasks = remember(allTasks, searchQuery, statusFilter, categoryFilter) {
        allTasks.filter { task ->
            val matchesQuery = if (searchQuery.isBlank()) true else {
                val q = searchQuery.trim().lowercase()
                val catLabel = Categories.get(task.category).label.lowercase()
                task.title.lowercase().contains(q) ||
                        task.notes.lowercase().contains(q) ||
                        catLabel.contains(q)
            }

            val matchesStatus = when (statusFilter) {
                TaskStatusFilter.ALL -> true
                TaskStatusFilter.ACTIVE -> !task.completed
                TaskStatusFilter.COMPLETED -> task.completed
            }

            val matchesCategory = if (categoryFilter == null) true else task.category == categoryFilter

            matchesQuery && matchesStatus && matchesCategory
        }.sortedWith(compareByDescending<TaskEntity> { it.date }.thenBy { it.orderIndex })
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenAddTask,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
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
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                placeholder = { Text("Search tasks...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { onSearchChange("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear search")
                        }
                    }
                },
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Status Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = statusFilter == TaskStatusFilter.ALL,
                    onClick = { onStatusFilterChange(TaskStatusFilter.ALL) },
                    label = { Text("All (${allTasks.size})") }
                )
                FilterChip(
                    selected = statusFilter == TaskStatusFilter.ACTIVE,
                    onClick = { onStatusFilterChange(TaskStatusFilter.ACTIVE) },
                    label = { Text("Active (${allTasks.count { !it.completed }})") }
                )
                FilterChip(
                    selected = statusFilter == TaskStatusFilter.COMPLETED,
                    onClick = { onStatusFilterChange(TaskStatusFilter.COMPLETED) },
                    label = { Text("Completed (${allTasks.count { it.completed }})") }
                )

                // Category Chips
                Categories.ALL.filter { it.id.isNotEmpty() }.forEach { cat ->
                    val isSelected = categoryFilter == cat.id
                    FilterChip(
                        selected = isSelected,
                        onClick = { onCategoryFilterChange(if (isSelected) null else cat.id) },
                        label = { Text("${cat.emoji} ${cat.label}") }
                    )
                }
            }

            // Results List
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 10.dp, bottom = 80.dp)
            ) {
                if (filteredTasks.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No tasks found matching your filters",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else {
                    items(filteredTasks, key = { it.id }) { task ->
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
