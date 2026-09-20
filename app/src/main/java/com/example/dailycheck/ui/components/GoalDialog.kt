package com.example.dailycheck.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.dailycheck.data.model.GoalEntity
import com.example.dailycheck.data.model.GoalIcons
import com.example.dailycheck.util.DateUtils

@Composable
fun GoalDialog(
    goalToEdit: GoalEntity? = null,
    onDismiss: () -> Unit,
    onSave: (title: String, startDate: String, targetDate: String, icon: String, description: String, isPrimary: Boolean) -> Unit
) {
    val today = DateUtils.todayStr()
    var title by remember { mutableStateOf(goalToEdit?.title ?: "") }
    var startDate by remember { mutableStateOf(goalToEdit?.startDate ?: today) }
    var targetDate by remember { mutableStateOf(goalToEdit?.targetDate ?: DateUtils.addDays(today, 30)) }
    var icon by remember { mutableStateOf(goalToEdit?.icon ?: "🎯") }
    var description by remember { mutableStateOf(goalToEdit?.description ?: "") }
    var isPrimary by remember { mutableStateOf(goalToEdit?.isPrimary ?: false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (goalToEdit == null) "New Countdown Goal" else "Edit Countdown Goal",
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
                // Icon Picker
                Column {
                    Text(
                        text = "Choose Icon",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        GoalIcons.ALL.take(5).forEach { ic ->
                            Surface(
                                shape = CircleShape,
                                color = if (icon == ic) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .clickable { icon = ic }
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(text = ic, fontSize = 20.sp)
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        GoalIcons.ALL.drop(5).forEach { ic ->
                            Surface(
                                shape = CircleShape,
                                color = if (icon == ic) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .clickable { icon = ic }
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(text = ic, fontSize = 20.sp)
                                }
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Goal Title *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = startDate,
                    onValueChange = { startDate = it },
                    label = { Text("Start Date (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = targetDate,
                    onValueChange = { targetDate = it },
                    label = { Text("Target Date (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (optional)") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Set as Primary Goal",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Switch(
                        checked = isPrimary,
                        onCheckedChange = { isPrimary = it }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onSave(title.trim(), startDate.trim(), targetDate.trim(), icon, description.trim(), isPrimary)
                    }
                },
                enabled = title.isNotBlank()
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
