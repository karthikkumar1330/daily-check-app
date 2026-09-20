package com.example.dailycheck.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey
    val id: String = java.util.UUID.randomUUID().toString(),
    val date: String, // YYYY-MM-DD
    val title: String,
    val completed: Boolean = false,
    val priority: Int = 2, // 1 = High, 2 = Medium, 3 = Low
    val category: String = "", // study, workout, health, work, personal, other, or ""
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val completedAt: Long? = null,
    val orderIndex: Long = System.currentTimeMillis()
)

data class CategoryMeta(
    val id: String,
    val label: String,
    val emoji: String
)

object Categories {
    val ALL = listOf(
        CategoryMeta("", "No category", ""),
        CategoryMeta("study", "Study", "📚"),
        CategoryMeta("workout", "Workout", "💪"),
        CategoryMeta("health", "Health", "🧘"),
        CategoryMeta("work", "Work", "💼"),
        CategoryMeta("personal", "Personal", "🏠"),
        CategoryMeta("other", "Other", "•")
    )

    fun get(id: String): CategoryMeta = ALL.find { it.id == id } ?: ALL.first()
}

object PriorityUtils {
    fun label(p: Int): String = when (p) {
        1 -> "High"
        2 -> "Medium"
        else -> "Low"
    }

    fun emoji(p: Int): String = when (p) {
        1 -> "🔴"
        2 -> "🟡"
        else -> "🟢"
    }
}
