# Daily Check (Android Edition)

A clean, minimal daily checklist, todo list, and weekly progress tracker built natively for Android with **Kotlin** and **Jetpack Compose**. All data stays securely on your device using a local **Room Database** — zero cloud sync, zero telemetry, full offline functionality.

---

## Features

- **Daily Checklist (`Today`)**:
  - Date navigator to smoothly move back and forth between days, or jump back to today with one tap.
  - Interactive task checklist with smooth toggle animations and priority indicators (High 🔴, Medium 🟡, Low 🟢).
  - Category badges with icons (Study 📚, Workout 🏋️, Health 🥗, Work 💼, Personal 🧘, Other 📌).
  - Expandable task notes, task reordering (move up/down), inline editing, and deletion.
  - "Clear Completed" action to quickly clean up finished items.
  - Quick-add single line input bar + full task creation dialog.

- **Countdown Goals**:
  - Calendar-day-only countdowns for long-term target dates (e.g. "180 Day Challenge", "103 days left").
  - Inclusive challenge-day math preserving the original logic (`totalDays = (target - start) + 1`).
  - Three distinct phases: Upcoming ("Starts in X days"), Active ("Day X of Y • Z days left"), and Completed ("Goal completed! 🎉").
  - Primary goal displayed directly in a hero progress card on the Today screen.
  - Goals manager modal to create, edit, delete, and set primary goals.

- **All Tasks & Smart Search (`Tasks`)**:
  - Real-time case-insensitive search across task titles, notes, and category labels.
  - Filter chips for status (All, Active, Completed) and categories.

- **Month Calendar Grid (`Calendar`)**:
  - 42-day visual calendar grid with current month navigation and today highlight.
  - Color-coded progress dots for days with tasks:
    - 🟢 Green: 100% completed
    - 🟡 Amber: partial completion (≥50%)
    - 🔴 Red: <50% completion
  - Tap any day to inspect and manage its tasks directly beneath the calendar.

- **Weekly Progress & Streaks (`Weekly`)**:
  - Week navigation with Monday-to-Sunday date range display.
  - Custom Jetpack Compose bar chart comparing completion percentages across all 7 days of the week.
  - Weekly summary metrics: Average Completion %, Completed vs Created count, and Best Day of the week.
  - Current streak and Best streak calculation (with zero-task days excluded so rest days don't break streaks).

- **High Priority & Important Views**:
  - **Important**: High-priority tasks organized by urgency: Due Today, Upcoming, and Completed.
  - **High Priority**: Direct list of all priority 1 tasks across all dates.

- **Categories**:
  - Overview cards showing active and completed task tallies per category.
  - Filter to view tasks belonging to any specific category.

- **Data Privacy & Backup (`Settings`)**:
  - Full offline-first design: all data is stored locally in an SQLite database via Android Room.
  - Theme customization: System default, Light theme (warm neutral & forest green), and Dark theme.
  - Export all tasks and countdown goals to JSON for backup or clipboard transfer.
  - Import / restore backup data with integrity validation.

---

## Architecture & Tech Stack

- **UI Framework**: Jetpack Compose with Material 3 design system.
- **Language**: Kotlin 2.0.21.
- **Local Persistence**: Android Room Database 2.6.1 with KSP (Kotlin Symbol Processing).
- **Asynchronous Flow**: Kotlin Coroutines & `StateFlow` reactive streams.
- **State Management**: Android MVVM Architecture (`DailyCheckViewModel`).
- **Navigation**: Jetpack Compose Navigation with deep linking support.
- **Serialization**: Kotlinx Serialization JSON.
- **Minimum SDK**: API 26 (Android 8.0 Oreo).
- **Target SDK**: API 35 (Android 15).
