package com.example.dailycheck.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(
    val route: String,
    val title: String,
    val icon: ImageVector,
    val isPrimaryBottomNav: Boolean = false
) {
    data object Today : Screen("today", "Today", Icons.Default.CheckCircle, isPrimaryBottomNav = true)
    data object Tasks : Screen("tasks", "All Tasks", Icons.AutoMirrored.Filled.List, isPrimaryBottomNav = true)
    data object Calendar : Screen("calendar", "Calendar", Icons.Default.CalendarMonth, isPrimaryBottomNav = true)
    data object Weekly : Screen("weekly", "Weekly", Icons.Default.BarChart, isPrimaryBottomNav = true)
    data object Important : Screen("important", "Important", Icons.Default.Star)
    data object HighPriority : Screen("high_priority", "High Priority", Icons.Default.Flag)
    data object Categories : Screen("categories", "Categories", Icons.Default.Category)
    data object Settings : Screen("settings", "Settings", Icons.Default.Settings)

    companion object {
        val bottomNavScreens = listOf(Today, Tasks, Calendar, Weekly)
        val allScreens = listOf(Today, Tasks, Calendar, Weekly, Important, HighPriority, Categories, Settings)
    }
}
