package com.example.dailycheck.data.repository

import com.example.dailycheck.data.local.TaskDao
import com.example.dailycheck.data.model.TaskEntity
import kotlinx.coroutines.flow.Flow

class TaskRepository(private val taskDao: TaskDao) {
    fun getTasksForDate(date: String): Flow<List<TaskEntity>> = taskDao.getTasksForDate(date)
    fun getAllTasks(): Flow<List<TaskEntity>> = taskDao.getAllTasks()
    fun getHighPriorityTasks(): Flow<List<TaskEntity>> = taskDao.getHighPriorityTasks()
    fun getTasksByCategory(category: String): Flow<List<TaskEntity>> = taskDao.getTasksByCategory(category)

    suspend fun insertTask(task: TaskEntity) = taskDao.insertTask(task)
    suspend fun insertAll(tasks: List<TaskEntity>) = taskDao.insertAll(tasks)
    suspend fun updateTask(task: TaskEntity) = taskDao.updateTask(task)
    suspend fun deleteTask(task: TaskEntity) = taskDao.deleteTask(task)
    suspend fun deleteTaskById(id: String) = taskDao.deleteTaskById(id)
    suspend fun clearCompletedForDate(date: String) = taskDao.clearCompletedForDate(date)
    suspend fun deleteAllTasks() = taskDao.deleteAllTasks()
}
