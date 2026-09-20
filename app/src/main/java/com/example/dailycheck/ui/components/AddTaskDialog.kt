package com.example.dailycheck.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dailycheck.data.model.Categories
import com.example.dailycheck.data.model.PriorityUtils
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.theme.PriorityHigh
import com.example.dailycheck.ui.theme.PriorityLow
import com.example.dailycheck.ui.theme.PriorityMedium
import com.example.dailycheck.util.DateUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTaskDialog(
    initialDate: String,
    taskToEdit: TaskEntity? = null,
    onDismiss: () -> Unit,
    onSave: (date: String, title: String, priority: Int, category: String, notes: String) -> Unit
) {
    var title by remember { mutableStateOf(taskToEdit?.title ?: "") }
    var date by remember { mutableStateOf(taskToEdit?.date ?: initialDate) }
    var priority by remember { mutableIntStateOf(taskToEdit?.priority ?: 2) }
    var category by remember { mutableStateOf(taskToEdit?.category ?: "") }
    var notes by remember { mutableStateOf(taskToEdit?.notes ?: "") }

    var categoryDropdownExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (taskToEdit == null) "New Task" else "Edit Task",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Task Title *") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("task_title_input")
                )

                // Quick Date Switcher
                Column {
                    Text(
                        text = "Date: ${DateUtils.formatMedium(date)} (${DateUtils.getRelativeLabel(date)})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = date == DateUtils.todayStr(),
                            onClick = { date = DateUtils.todayStr() },
                            label = { Text("Today") }
                        )
                        FilterChip(
                            selected = date == DateUtils.addDays(DateUtils.todayStr(), 1),
                            onClick = { date = DateUtils.addDays(DateUtils.todayStr(), 1) },
                            label = { Text("Tomorrow") }
                        )
                    }
                }

                // Priority Selection
                Column {
                    Text(
                        text = "Priority",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(1 to "High", 2 to "Med", 3 to "Low").forEach { (p, label) ->
                            val isSelected = priority == p
                            val color = when (p) {
                                1 -> PriorityHigh
                                2 -> PriorityMedium
                                else -> PriorityLow
                            }
                            FilterChip(
                                selected = isSelected,
                                onClick = { priority = p },
                                label = {
                                    Text(
                                        text = "${PriorityUtils.emoji(p)} $label",
                                        color = if (isSelected) color else MaterialTheme.colorScheme.onSurface
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Category Selection
                Column {
                    Text(
                        text = "Category",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))

                    val currentCategory = Categories.get(category)
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedCard(
                            onClick = { categoryDropdownExpanded = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (currentCategory.id.isEmpty()) "Select Category" else "${currentCategory.emoji} ${currentCategory.label}",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }

                        DropdownMenu(
                            expanded = categoryDropdownExpanded,
                            onDismissRequest = { categoryDropdownExpanded = false }
                        ) {
                            Categories.ALL.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text("${cat.emoji} ${cat.label}".trim()) },
                                    onClick = {
                                        category = cat.id
                                        categoryDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Notes Field
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes (optional)") },
                    minLines = 2,
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onSave(date, title.trim(), priority, category, notes.trim())
                    }
                },
                enabled = title.isNotBlank(),
                modifier = Modifier.testTag("save_task_button")
            ) {
                Text(if (taskToEdit == null) "Add" else "Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
