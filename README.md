# Daily Check (PWA Edition) — v14.0.0

A clean, minimal, mobile-first daily checklist, todo list, and weekly progress tracker built with **React**, **TypeScript**, and **Vite PWA**. All data stays securely on your device in **localStorage** — zero cloud database, zero tracking, full offline functionality.

---

## Features

- **Daily Checklist (`Today`)**:
  - Date navigator to smoothly move back and forth between days, or jump back to today with one tap.
  - Interactive task checklist with smooth toggle animations and priority indicators (High 🔴, Medium 🟡, Low 🟢).
  - Explicit **Important** status (⭐) completely decoupled from priority level.
  - Category badges with icons (Study 📚, Workout 🏋️, Health 🥗, Work 💼, Personal 🧘, Other 📌).
  - Duration tasks with interactive focus timer and time logging.
  - Quantity goals with daily targets, custom units, and quick-add taps.
  - Expandable task notes, task reordering (move up/down), inline editing, and deletion.
  - "Clear Completed" action to quickly clean up finished items.
  - Quick-add single line input bar + full task creation dialog.

- **Independent High Priority & Important Views**:
  - **Important (`/important`)**: Dedicated view showing strictly tasks explicitly marked as Important (⭐), organized by Due Today/Overdue, Upcoming, and Completed. High priority does NOT automatically mark a task Important.
  - **High Priority (`/high-priority`)**: Dedicated view showing strictly tasks with priority = High (🔴), separated into incomplete and completed sections. Important flag does NOT automatically make a task High Priority.

- **Countdown Goals**:
  - Calendar-day countdowns for long-term target dates (e.g. "180 Day Challenge", "103 days left").
  - Inclusive challenge-day math preserving the original logic (`totalDays = (target - start) + 1`).
  - Three distinct phases: Upcoming ("Starts in X days"), Active ("Day X of Y • Z days left"), and Completed ("Goal completed! 🎉").
  - Primary goal displayed directly in a hero progress card on the Today screen.
  - Goals manager modal to create, edit, delete, and set primary goals.

- **Daily Routines (`/routines`)**:
  - Reusable daily routines and template checklists (e.g. Morning Routine, Bank Exam Prep, Workout Routine).
  - One-tap routine application onto any day's checklist with duplicate prevention.
  - Preserves priorities, categories, durations, quantities, and important status.

- **All Tasks & Smart Search (`Tasks`)**:
  - Real-time case-insensitive search across task titles, notes, and category labels.
  - Filter chips for status (All, Active, Completed, High Priority) and categories.

- **Month Calendar Grid (`Calendar`)**:
  - 42-day visual calendar grid with current month navigation and today highlight.
  - Color-coded progress dots for days with tasks:
    - 🟢 Green: 100% completed
    - 🟡 Amber: partial completion (≥50%)
    - 🔴 Red: <50% completion
  - Tap any day to inspect and manage its tasks directly beneath the calendar.

- **Weekly Progress & Streaks (`Weekly`)**:
  - Week navigation with customizable Monday or Sunday week start.
  - Completion comparison chart across all 7 days of the week.
  - Weekly summary metrics: Average Completion %, Completed vs Created count, and Best Day of the week.
  - Current streak and Best streak calculation (with zero-task days excluded so rest days don't break streaks).

- **Data Privacy & Backup (`Settings`)**:
  - Full offline-first design: all data is stored locally in the browser's localStorage.
  - Theme customization: System default, Light theme, and Dark theme.
  - Export all tasks, countdown goals, and routines to JSON for backup.
  - Import / restore backup data with integrity validation.
  - Local notifications and in-app Notification Center with deep linking.

---

## Architecture & Tech Stack

- **UI Framework**: React 18 with TypeScript.
- **Build System**: Vite 5 + `vite-plugin-pwa`.
- **Local Persistence**: Client-side localStorage with debounced persistence and recovery listeners.
- **State Management**: React Context + Hooks (`useTasks`, `useFocusTimer`, `useCountdownGoals`, `useRoutines`, `useNotificationCenter`).
- **Routing**: React Router v6.
- **PWA**: Service Worker caching, offline support, installable standalone mode.
