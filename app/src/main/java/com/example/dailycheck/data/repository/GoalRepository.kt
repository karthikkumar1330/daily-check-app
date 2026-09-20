package com.example.dailycheck.data.repository

import com.example.dailycheck.data.local.GoalDao
import com.example.dailycheck.data.model.GoalEntity
import kotlinx.coroutines.flow.Flow

class GoalRepository(private val goalDao: GoalDao) {
    fun getAllGoals(): Flow<List<GoalEntity>> = goalDao.getAllGoals()
    fun getPrimaryGoal(): Flow<GoalEntity?> = goalDao.getPrimaryGoal()

    suspend fun insertGoal(goal: GoalEntity) = goalDao.insertGoal(goal)
    suspend fun insertAll(goals: List<GoalEntity>) = goalDao.insertAll(goals)
    suspend fun updateGoal(goal: GoalEntity) = goalDao.updateGoal(goal)
    suspend fun deleteGoal(goal: GoalEntity) = goalDao.deleteGoal(goal)
    suspend fun deleteGoalById(id: String) = goalDao.deleteGoalById(id)

    suspend fun setPrimaryGoal(id: String) {
        goalDao.clearPrimaryGoals()
        goalDao.setPrimaryGoal(id)
    }

    suspend fun deleteAllGoals() = goalDao.deleteAllGoals()
}
