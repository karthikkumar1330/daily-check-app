package com.example.dailycheck.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.dailycheck.data.local.DailyCheckDatabase
import com.example.dailycheck.data.model.GoalEntity
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.data.repository.GoalRepository
import com.example.dailycheck.data.repository.TaskRepository
import com.example.dailycheck.ui.theme.ThemeMode
import com.example.dailycheck.util.DateUtils
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

enum class TaskStatusFilter {
    ALL, ACTIVE, COMPLETED
}

@Serializable
data class BackupPayload(
    val version: String = "4.1.0",
    val tasks: List<TaskEntity>,
    val goals: List<GoalEntity>
)

class DailyCheckViewModel(application: Application) : AndroidViewModel(application) {
    private val database = DailyCheckDatabase.getDatabase(application)
    private val taskRepo = TaskRepository(database.taskDao())
    private val goalRepo = GoalRepository(database.goalDao())

    private val _selectedDate = MutableStateFlow(DateUtils.todayStr())
    val selectedDate: StateFlow<String> = _selectedDate.asStateFlow()

    private val _calendarAnchorMonth = MutableStateFlow(DateUtils.monthAnchor(DateUtils.todayStr()))
    val calendarAnchorMonth: StateFlow<String> = _calendarAnchorMonth.asStateFlow()

    private val _weekAnchor = MutableStateFlow(DateUtils.getWeekStart(DateUtils.todayStr()))
    val weekAnchor: StateFlow<String> = _weekAnchor.asStateFlow()

    private val _themeMode = MutableStateFlow(ThemeMode.SYSTEM)
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategoryFilter = MutableStateFlow<String?>(null)
    val selectedCategoryFilter: StateFlow<String?> = _selectedCategoryFilter.asStateFlow()

    private val _selectedStatusFilter = MutableStateFlow(TaskStatusFilter.ALL)
    val selectedStatusFilter: StateFlow<TaskStatusFilter> = _selectedStatusFilter.asStateFlow()

    val allTasks: StateFlow<List<TaskEntity>> = taskRepo.getAllTasks()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    @OptIn(ExperimentalCoroutinesApi::class)
    val tasksForSelectedDate: StateFlow<List<TaskEntity>> = _selectedDate
        .flatMapLatest { date -> taskRepo.getTasksForDate(date) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val goals: StateFlow<List<GoalEntity>> = goalRepo.getAllGoals()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val primaryGoal: StateFlow<GoalEntity?> = goalRepo.getPrimaryGoal()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun setSelectedDate(date: String) {
        _selectedDate.value = date
        _weekAnchor.value = DateUtils.getWeekStart(date)
        _calendarAnchorMonth.value = DateUtils.monthAnchor(date)
    }

    fun setCalendarAnchorMonth(date: String) {
        _calendarAnchorMonth.value = DateUtils.monthAnchor(date)
    }

    fun setWeekAnchor(date: String) {
        _weekAnchor.value = DateUtils.getWeekStart(date)
    }

    fun setThemeMode(mode: ThemeMode) {
        _themeMode.value = mode
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setCategoryFilter(catId: String?) {
        _selectedCategoryFilter.value = catId
    }

    fun setStatusFilter(filter: TaskStatusFilter) {
        _selectedStatusFilter.value = filter
    }

    fun quickAddTask(date: String, title: String) {
        viewModelScope.launch {
            val task = TaskEntity(
                date = date,
                title = title,
                priority = 2,
                category = "",
                orderIndex = System.currentTimeMillis()
            )
            taskRepo.insertTask(task)
        }
    }

    fun addTask(date: String, title: String, priority: Int, category: String, notes: String) {
        viewModelScope.launch {
            val task = TaskEntity(
                date = date,
                title = title,
                priority = priority,
                category = category,
                notes = notes,
                orderIndex = System.currentTimeMillis()
            )
            taskRepo.insertTask(task)
        }
    }

    fun toggleTask(task: TaskEntity) {
        viewModelScope.launch {
            val newCompleted = !task.completed
            val updated = task.copy(
                completed = newCompleted,
                completedAt = if (newCompleted) System.currentTimeMillis() else null
            )
            taskRepo.updateTask(updated)
        }
    }

    fun editTask(task: TaskEntity, title: String, priority: Int, category: String, notes: String) {
        viewModelScope.launch {
            val updated = task.copy(
                title = title,
                priority = priority,
                category = category,
                notes = notes
            )
            taskRepo.updateTask(updated)
        }
    }

    fun deleteTask(taskId: String) {
        viewModelScope.launch {
            taskRepo.deleteTaskById(taskId)
        }
    }

    fun clearCompleted(date: String) {
        viewModelScope.launch {
            taskRepo.clearCompletedForDate(date)
        }
    }

    fun moveTask(task: TaskEntity, direction: Int) {
        viewModelScope.launch {
            val currentList = tasksForSelectedDate.value
            val idx = currentList.indexOfFirst { it.id == task.id }
            if (idx == -1) return@launch

            val targetIdx = idx + direction
            if (targetIdx in currentList.indices) {
                val targetTask = currentList[targetIdx]
                val taskOrder = task.orderIndex
                val targetOrder = targetTask.orderIndex

                // Swap orders
                taskRepo.updateTask(task.copy(orderIndex = targetOrder))
                taskRepo.updateTask(targetTask.copy(orderIndex = taskOrder))
            }
        }
    }

    // Goals operations
    fun addGoal(title: String, startDate: String, targetDate: String, icon: String, description: String, isPrimary: Boolean) {
        viewModelScope.launch {
            val goal = GoalEntity(
                title = title,
                startDate = startDate,
                targetDate = targetDate,
                icon = icon,
                description = description,
                isPrimary = isPrimary
            )
            if (isPrimary) {
                goalRepo.setPrimaryGoal(goal.id)
            }
            goalRepo.insertGoal(goal)
        }
    }

    fun updateGoal(id: String, title: String, startDate: String, targetDate: String, icon: String, description: String, isPrimary: Boolean) {
        viewModelScope.launch {
            val goal = GoalEntity(
                id = id,
                title = title,
                startDate = startDate,
                targetDate = targetDate,
                icon = icon,
                description = description,
                isPrimary = isPrimary
            )
            if (isPrimary) {
                goalRepo.setPrimaryGoal(id)
            }
            goalRepo.updateGoal(goal)
        }
    }

    fun deleteGoal(id: String) {
        viewModelScope.launch {
            goalRepo.deleteGoalById(id)
        }
    }

    fun setPrimaryGoal(id: String) {
        viewModelScope.launch {
            goalRepo.setPrimaryGoal(id)
        }
    }

    // Backup & Restore
    fun exportBackupJson(): String {
        val payload = BackupPayload(
            tasks = allTasks.value,
            goals = goals.value
        )
        return Json { prettyPrint = true }.encodeToString(payload)
    }

    fun importBackupJson(jsonString: String): Boolean {
        return try {
            val payload = Json.decodeFromString<BackupPayload>(jsonString)
            viewModelScope.launch {
                taskRepo.deleteAllTasks()
                taskRepo.insertAll(payload.tasks)
                goalRepo.deleteAllGoals()
                goalRepo.insertAll(payload.goals)
            }
            true
        } catch (e: Exception) {
            false
        }
    }
}
