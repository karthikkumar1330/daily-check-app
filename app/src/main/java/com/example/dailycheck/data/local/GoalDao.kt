package com.example.dailycheck.data.local

import androidx.room.*
import com.example.dailycheck.data.model.GoalEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GoalDao {
    @Query("SELECT * FROM countdown_goals ORDER BY createdAt DESC")
    fun getAllGoals(): Flow<List<GoalEntity>>

    @Query("SELECT * FROM countdown_goals WHERE isPrimary = 1 LIMIT 1")
    fun getPrimaryGoal(): Flow<GoalEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGoal(goal: GoalEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(goals: List<GoalEntity>)

    @Update
    suspend fun updateGoal(goal: GoalEntity)

    @Delete
    suspend fun deleteGoal(goal: GoalEntity)

    @Query("DELETE FROM countdown_goals WHERE id = :id")
    suspend fun deleteGoalById(id: String)

    @Query("UPDATE countdown_goals SET isPrimary = 0")
    suspend fun clearPrimaryGoals()

    @Query("UPDATE countdown_goals SET isPrimary = 1 WHERE id = :id")
    suspend fun setPrimaryGoal(id: String)

    @Query("DELETE FROM countdown_goals")
    suspend fun deleteAllGoals()
}
