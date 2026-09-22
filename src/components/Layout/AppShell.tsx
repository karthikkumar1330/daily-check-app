import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import ActiveFocusBar from "../Focus/ActiveFocusBar";
import { useSidebar } from "../../hooks/useSidebar";

interface AppShellProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function AppShell({ isDark, onToggleTheme }: AppShellProps) {
  const sidebar = useSidebar();
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    sidebar.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={sidebar.open} onCloseMobile={sidebar.close} />
      <div className="main-col">
        <Header isDark={isDark} onToggleTheme={onToggleTheme} onOpenSidebar={sidebar.toggle} />
        <main className="page-content" key={location.pathname}>
          <Outlet />
        </main>
        <ActiveFocusBar />
      </div>
    </div>
  );
}
