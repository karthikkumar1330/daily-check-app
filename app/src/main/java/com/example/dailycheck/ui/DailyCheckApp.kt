package com.example.dailycheck.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.dailycheck.data.model.GoalEntity
import com.example.dailycheck.data.model.TaskEntity
import com.example.dailycheck.ui.components.AddTaskDialog
import com.example.dailycheck.ui.components.GoalDialog
import com.example.dailycheck.ui.components.GoalsManagerDialog
import com.example.dailycheck.ui.navigation.Screen
import com.example.dailycheck.ui.screens.*
import com.example.dailycheck.ui.theme.DailyCheckTheme
import com.example.dailycheck.util.ProgressUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyCheckApp(viewModel: DailyCheckViewModel) {
    val themeMode by viewModel.themeMode.collectAsStateWithLifecycle()
    val selectedDate by viewModel.selectedDate.collectAsStateWithLifecycle()
    val calendarAnchorMonth by viewModel.calendarAnchorMonth.collectAsStateWithLifecycle()
    val weekAnchor by viewModel.weekAnchor.collectAsStateWithLifecycle()
    val allTasks by viewModel.allTasks.collectAsStateWithLifecycle()
    val tasksForDate by viewModel.tasksForSelectedDate.collectAsStateWithLifecycle()
    val goals by viewModel.goals.collectAsStateWithLifecycle()
    val primaryGoal by viewModel.primaryGoal.collectAsStateWithLifecycle()

    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val categoryFilter by viewModel.selectedCategoryFilter.collectAsStateWithLifecycle()
    val statusFilter by viewModel.selectedStatusFilter.collectAsStateWithLifecycle()

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Dialog States
    var showAddTaskDialog by remember { mutableStateOf(false) }
    var taskToEdit by remember { mutableStateOf<TaskEntity?>(null) }
    var showGoalDialog by remember { mutableStateOf(false) }
    var goalToEdit by remember { mutableStateOf<GoalEntity?>(null) }
    var showGoalsManagerDialog by remember { mutableStateOf(false) }
    var showMoreSheet by remember { mutableStateOf(false) }

    val streaks = remember(allTasks) { ProgressUtils.computeStreaks(allTasks) }

    DailyCheckTheme(themeMode = themeMode) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Daily Check",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (streaks.current > 0) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer
                                ) {
                                    Text(
                                        text = "🔥 ${streaks.current}",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    },
                    actions = {
                        IconButton(onClick = { showGoalsManagerDialog = true }) {
                            Icon(Icons.Default.Timer, contentDescription = "Countdown Goals")
                        }
                        IconButton(onClick = { navController.navigate(Screen.Settings.route) }) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )
            },
            bottomBar = {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 3.dp
                ) {
                    val primaryScreens = listOf(
                        Screen.Today,
                        Screen.Tasks,
                        Screen.Calendar,
                        Screen.Weekly
                    )

                    primaryScreens.forEach { screen ->
                        val selected = currentDestination?.route == screen.route
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                            selected = selected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }

                    // More Menu
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Menu, contentDescription = "More") },
                        label = { Text("More") },
                        selected = currentDestination?.route in listOf(
                            Screen.Important.route,
                            Screen.HighPriority.route,
                            Screen.Categories.route,
                            Screen.Settings.route
                        ),
                        onClick = { showMoreSheet = true }
                    )
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Today.route,
                modifier = Modifier.padding(innerPadding)
            ) {
                composable(Screen.Today.route) {
                    TodayScreen(
                        currentDate = selectedDate,
                        tasks = tasksForDate,
                        primaryGoal = primaryGoal,
                        onDateChange = { viewModel.setSelectedDate(it) },
                        onQuickAdd = { title -> viewModel.quickAddTask(selectedDate, title) },
                        onOpenAddTask = {
                            taskToEdit = null
                            showAddTaskDialog = true
                        },
                        onOpenGoalsManager = { showGoalsManagerDialog = true },
                        onToggleTask = { viewModel.toggleTask(it) },
                        onEditTask = {
                            taskToEdit = it
                            showAddTaskDialog = true
                        },
                        onDeleteTask = { viewModel.deleteTask(it) },
                        onMoveTask = { task, dir -> viewModel.moveTask(task, dir) },
                        onClearCompleted = { viewModel.clearCompleted(selectedDate) }
                    )
                }

                composable(Screen.Tasks.route) {
                    TasksScreen(
                        allTasks = allTasks,
                        searchQuery = searchQuery,
                        statusFilter = statusFilter,
                        categoryFilter = categoryFilter,
                        onSearchChange = { viewModel.setSearchQuery(it) },
                        onStatusFilterChange = { viewModel.setStatusFilter(it) },
                        onCategoryFilterChange = { viewModel.setCategoryFilter(it) },
                        onToggleTask = { viewModel.toggleTask(it) },
                        onEditTask = {
                            taskToEdit = it
                            showAddTaskDialog = true
                        },
                        onDeleteTask = { viewModel.deleteTask(it) },
                        onOpenAddTask = {
                            taskToEdit = null
                            showAddTaskDialog = true
                        }
                    )
                }

                composable(Screen.Calendar.route) {
                    CalendarScreen(
                        anchorMonth = calendarAnchorMonth,
                        selectedDate = selectedDate,
                        allTasks = allTasks,
                        onMonthChange = { viewModel.setCalendarAnchorMonth(it) },
                        onDateSelect = { viewModel.setSelectedDate(it) },
                        onToggleTask = { viewModel.toggleTask(it) },
                        onEditTask = {
                            taskToEdit = it
                            showAddTaskDialog = true
                        },
                        onDeleteTask = { viewModel.deleteTask(it) },
                        onOpenAddTask = {
                            taskToEdit = null
                            showAddTaskDialog = true
                        }
                    )
                }

                composable(Screen.Weekly.route) {
                    WeeklyProgressScreen(
                        weekAnchor = weekAnchor,
                        allTasks = allTasks,
                        onWeekChange = { viewModel.setWeekAnchor(it) },
                        onDaySelect = { date ->
                            viewModel.setSelectedDate(date)
                            navController.navigate(Screen.Today.route)
                        }
                    )
                }

                composable(Screen.Important.route) {
                    ImportantScreen(
                        allTasks = allTasks,
                        onToggleTask = { viewModel.toggleTask(it) },
                        onEditTask = {
                            taskToEdit = it
                            showAddTaskDialog = true
                        },
                        onDeleteTask = { viewModel.deleteTask(it) }
                    )
                }

                composable(Screen.HighPriority.route) {
                    HighPriorityScreen(
                        allTasks = allTasks,
                        onToggleTask = { viewModel.toggleTask(it) },
                        onEditTask = {
                            taskToEdit = it
                            showAddTaskDialog = true
                        },
                        onDeleteTask = { viewModel.deleteTask(it) }
                    )
                }

                composable(Screen.Categories.route) {
                    CategoriesScreen(
                        allTasks = allTasks,
                        onToggleTask = { viewModel.toggleTask(it) },
                        onEditTask = {
                            taskToEdit = it
                            showAddTaskDialog = true
                        },
                        onDeleteTask = { viewModel.deleteTask(it) }
                    )
                }

                composable(Screen.Settings.route) {
                    SettingsScreen(
                        themeMode = themeMode,
                        goals = goals,
                        onThemeChange = { viewModel.setThemeMode(it) },
                        onOpenGoalsManager = { showGoalsManagerDialog = true },
                        onExportBackup = { viewModel.exportBackupJson() },
                        onImportBackup = { viewModel.importBackupJson(it) }
                    )
                }
            }
        }

        // More Options Bottom Sheet
        if (showMoreSheet) {
            ModalBottomSheet(
                onDismissRequest = { showMoreSheet = false },
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .padding(bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "More Views",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )

                    val moreScreens = listOf(
                        Screen.Important,
                        Screen.HighPriority,
                        Screen.Categories,
                        Screen.Settings
                    )

                    moreScreens.forEach { screen ->
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    showMoreSheet = false
                                    navController.navigate(screen.route)
                                },
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surface
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = screen.icon,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.width(16.dp))
                                Text(
                                    text = screen.title,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        }

        // Add/Edit Task Dialog
        if (showAddTaskDialog) {
            AddTaskDialog(
                initialDate = selectedDate,
                taskToEdit = taskToEdit,
                onDismiss = {
                    showAddTaskDialog = false
                    taskToEdit = null
                },
                onSave = { date, title, priority, category, notes ->
                    if (taskToEdit == null) {
                        viewModel.addTask(date, title, priority, category, notes)
                    } else {
                        viewModel.editTask(taskToEdit!!, title, priority, category, notes)
                    }
                    showAddTaskDialog = false
                    taskToEdit = null
                }
            )
        }

        // Add/Edit Goal Dialog
        if (showGoalDialog) {
            GoalDialog(
                goalToEdit = goalToEdit,
                onDismiss = {
                    showGoalDialog = false
                    goalToEdit = null
                },
                onSave = { title, startDate, targetDate, icon, desc, isPrimary ->
                    if (goalToEdit == null) {
                        viewModel.addGoal(title, startDate, targetDate, icon, desc, isPrimary)
                    } else {
                        viewModel.updateGoal(goalToEdit!!.id, title, startDate, targetDate, icon, desc, isPrimary)
                    }
                    showGoalDialog = false
                    goalToEdit = null
                }
            )
        }

        // Goals Manager Dialog
        if (showGoalsManagerDialog) {
            GoalsManagerDialog(
                goals = goals,
                onDismiss = { showGoalsManagerDialog = false },
                onAddNew = {
                    goalToEdit = null
                    showGoalDialog = true
                },
                onEdit = {
                    goalToEdit = it
                    showGoalDialog = true
                },
                onDelete = { viewModel.deleteGoal(it.id) },
                onSetPrimary = { viewModel.setPrimaryGoal(it) }
            )
        }
    }
}
