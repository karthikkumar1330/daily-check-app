package com.example.dailycheck.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "countdown_goals")
data class GoalEntity(
    @PrimaryKey
    val id: String = java.util.UUID.randomUUID().toString(),
    val title: String,
    val startDate: String, // YYYY-MM-DD
    val targetDate: String, // YYYY-MM-DD
    val icon: String = "🎯",
    val description: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val isPrimary: Boolean = false
)

object GoalIcons {
    val ALL = listOf("🎯", "📚", "🏃", "💼", "🧘", "🚀", "💡", "🎨", "🏆", "✈️")
}
