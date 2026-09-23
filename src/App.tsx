import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TasksProvider, useTasks } from "./hooks/useTasks";
import { FocusTimerProvider } from "./hooks/useFocusTimer";
import { CountdownGoalsProvider } from "./hooks/useCountdownGoals";
import { RoutinesProvider } from "./hooks/useRoutines";
import { NotificationCenterProvider } from "./hooks/useNotificationCenter";
import { useTheme } from "./hooks/useTheme";
import { useTaskReminders } from "./hooks/useTaskReminders";
import AppShell from "./components/Layout/AppShell";

// Today is eagerly imported for instantaneous first render on launch
import Today from "./pages/Today/Today";

// Non-initial routes are code-split to drastically reduce initial bundle size and startup time
const Tasks = lazy(() => import("./pages/Tasks/Tasks"));
const CalendarPage = lazy(() => import("./pages/Calendar/CalendarPage"));
const WeeklyProgress = lazy(() => import("./pages/WeeklyProgress/WeeklyProgress"));
const RoutinesPage = lazy(() => import("./pages/Routines/RoutinesPage"));
const Insights = lazy(() => import("./pages/Insights/Insights"));
const Important = lazy(() => import("./pages/Important/Important"));
const HighPriority = lazy(() => import("./pages/HighPriority/HighPriority"));
const Categories = lazy(() => import("./pages/Categories/Categories"));
const NotificationCenter = lazy(() => import("./pages/Notifications/NotificationCenter"));
const Settings = lazy(() => import("./pages/Settings/Settings"));

function Shell() {
  const { appData, setTheme } = useTasks();
  const { isDark, toggle } = useTheme(appData.theme, setTheme);
  useTaskReminders(appData);

  const fallback = <div className="page-loading-skeleton" aria-hidden="true" />;

  return (
    <Routes>
      <Route element={<AppShell isDark={isDark} onToggleTheme={toggle} />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<Today />} />
        <Route path="tasks" element={<Suspense fallback={fallback}><Tasks /></Suspense>} />
        <Route path="calendar" element={<Suspense fallback={fallback}><CalendarPage /></Suspense>} />
        <Route path="weekly" element={<Suspense fallback={fallback}><WeeklyProgress /></Suspense>} />
        <Route path="routines" element={<Suspense fallback={fallback}><RoutinesPage /></Suspense>} />
        <Route path="insights" element={<Suspense fallback={fallback}><Insights /></Suspense>} />
        <Route path="important" element={<Suspense fallback={fallback}><Important /></Suspense>} />
        <Route path="high-priority" element={<Suspense fallback={fallback}><HighPriority /></Suspense>} />
        <Route path="categories" element={<Suspense fallback={fallback}><Categories /></Suspense>} />
        <Route path="notifications" element={<Suspense fallback={fallback}><NotificationCenter /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={fallback}><Settings /></Suspense>} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TasksProvider>
        <FocusTimerProvider>
          <CountdownGoalsProvider>
            <RoutinesProvider>
              <NotificationCenterProvider>
                <Shell />
              </NotificationCenterProvider>
            </RoutinesProvider>
          </CountdownGoalsProvider>
        </FocusTimerProvider>
      </TasksProvider>
    </BrowserRouter>
  );
}


