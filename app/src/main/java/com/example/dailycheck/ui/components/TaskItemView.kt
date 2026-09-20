package com.example.dailycheck.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.dailycheck.data.model.Categories
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.theme.PriorityHigh
import com.example.dailycheck.ui.theme.PriorityLow
import com.example.dailycheck.ui.theme.PriorityMedium

@Composable
fun TaskItemView(
    task: TaskEntity,
    onToggle: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onMoveUp: (() -> Unit)? = null,
    onMoveDown: (() -> Unit)? = null,
    showDate: Boolean = false,
    modifier: Modifier = Modifier
) {
    var expandedMenu by remember { mutableStateOf(false) }
    var notesVisible by remember { mutableStateOf(false) }

    val priorityColor = when (task.priority) {
        1 -> PriorityHigh
        2 -> PriorityMedium
        else -> PriorityLow
    }

    val category = Categories.get(task.category)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("task_item_${task.id}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (task.completed) {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (task.completed) 0.dp else 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Priority indicator bar / dot
                Surface(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape),
                    color = priorityColor
                ) {}

                Spacer(modifier = Modifier.width(8.dp))

                Checkbox(
                    checked = task.completed,
                    onCheckedChange = { onToggle() },
                    modifier = Modifier.testTag("checkbox_${task.id}")
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onToggle() }
                        .padding(vertical = 4.dp)
                ) {
                    Text(
                        text = task.title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (task.completed) FontWeight.Normal else FontWeight.Medium,
                        textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None,
                        color = if (task.completed) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        }
                    )

                    Row(
                        modifier = Modifier.padding(top = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        if (showDate) {
                            Text(
                                text = task.date,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        if (category.id.isNotEmpty()) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    text = "${category.emoji} ${category.label}",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        if (task.notes.isNotBlank()) {
                            Icon(
                                imageVector = Icons.Default.Notes,
                                contentDescription = "Has notes",
                                modifier = Modifier
                                    .size(14.dp)
                                    .clickable { notesVisible = !notesVisible },
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                Box {
                    IconButton(
                        onClick = { expandedMenu = true },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Task options",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    DropdownMenu(
                        expanded = expandedMenu,
                        onDismissRequest = { expandedMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Edit") },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                            onClick = {
                                expandedMenu = false
                                onEdit()
                            }
                        )

                        if (onMoveUp != null) {
                            DropdownMenuItem(
                                text = { Text("Move Up") },
                                leadingIcon = { Icon(Icons.Default.ArrowUpward, contentDescription = null) },
                                onClick = {
                                    expandedMenu = false
                                    onMoveUp()
                                }
                            )
                        }

                        if (onMoveDown != null) {
                            DropdownMenuItem(
                                text = { Text("Move Down") },
                                leadingIcon = { Icon(Icons.Default.ArrowDownward, contentDescription = null) },
                                onClick = {
                                    expandedMenu = false
                                    onMoveDown()
                                }
                            )
                        }

                        HorizontalDivider()

                        DropdownMenuItem(
                            text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Delete,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                            },
                            onClick = {
                                expandedMenu = false
                                onDelete()
                            }
                        )
                    }
                }
            }

            if (task.notes.isNotBlank() && notesVisible) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 36.dp, top = 4.dp, bottom = 4.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                ) {
                    Text(
                        text = task.notes,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }
        }
    }
}
