import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TasksProvider, useTasks } from "./hooks/useTasks";
import { FocusTimerProvider } from "./hooks/useFocusTimer";
import { CountdownGoalsProvider } from "./hooks/useCountdownGoals";
import { RoutinesProvider } from "./hooks/useRoutines";
import { useTheme } from "./hooks/useTheme";
import { useTaskReminders } from "./hooks/useTaskReminders";
import AppShell from "./components/Layout/AppShell";

import Today from "./pages/Today/Today";
import Tasks from "./pages/Tasks/Tasks";
import CalendarPage from "./pages/Calendar/CalendarPage";
import WeeklyProgress from "./pages/WeeklyProgress/WeeklyProgress";
import RoutinesPage from "./pages/Routines/RoutinesPage";
import Insights from "./pages/Insights/Insights";
import Important from "./pages/Important/Important";
import HighPriority from "./pages/HighPriority/HighPriority";
import Categories from "./pages/Categories/Categories";
import Settings from "./pages/Settings/Settings";

function Shell() {
  const { appData, setTheme } = useTasks();
  const { isDark, toggle } = useTheme(appData.theme, setTheme);
  useTaskReminders(appData);

  return (
    <Routes>
      <Route element={<AppShell isDark={isDark} onToggleTheme={toggle} />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<Today />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="weekly" element={<WeeklyProgress />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="insights" element={<Insights />} />
        <Route path="important" element={<Important />} />
        <Route path="high-priority" element={<HighPriority />} />
        <Route path="categories" element={<Categories />} />
        <Route path="settings" element={<Settings />} />
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
              <Shell />
            </RoutinesProvider>
          </CountdownGoalsProvider>
        </FocusTimerProvider>
      </TasksProvider>
    </BrowserRouter>
  );
}

