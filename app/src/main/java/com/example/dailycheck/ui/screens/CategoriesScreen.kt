package com.example.dailycheck.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.dailycheck.data.model.Categories
import com.example.dailycheck.data.model.CategoryMeta
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.components.ConfirmDeleteDialog
import com.example.dailycheck.ui.components.TaskItemView

@Composable
fun CategoriesScreen(
    allTasks: List<TaskEntity>,
    onToggleTask: (TaskEntity) -> Unit,
    onEditTask: (TaskEntity) -> Unit,
    onDeleteTask: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedCategory by remember { mutableStateOf<CategoryMeta?>(null) }
    var taskToDelete by remember { mutableStateOf<String?>(null) }

    val categories = remember { Categories.ALL.filter { it.id.isNotEmpty() } }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        if (selectedCategory == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp)
            ) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Categories",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Organize and review tasks by life area",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))

                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(categories, key = { it.id }) { cat ->
                        val catTasks = allTasks.filter { it.category == cat.id }
                        val activeCount = catTasks.count { !it.completed }
                        val completedCount = catTasks.count { it.completed }

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedCategory = cat },
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Text(text = cat.emoji, fontSize = 28.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = cat.label,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "$activeCount active • $completedCount done",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        } else {
            val cat = selectedCategory!!
            val catTasks = remember(allTasks, cat.id) {
                allTasks.filter { it.category == cat.id }
                    .sortedWith(compareByDescending<TaskEntity> { it.date }.thenBy { it.orderIndex })
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { selectedCategory = null }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back to Categories"
                        )
                    }
                    Text(
                        text = "${cat.emoji} ${cat.label}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    if (catTasks.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No tasks in this category",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    } else {
                        items(catTasks, key = { it.id }) { task ->
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
