import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BackIcon, BellIcon, HamburgerIcon, ShareIcon } from "../icons";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import { useTasks } from "../../hooks/useTasks";
import { formatDayMonth, todayStr } from "../../utils/dateUtils";
import { dayStats, formatPct } from "../../utils/progressUtils";

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  "/today": "Daily Check",
  "/tasks": "All Tasks",
  "/calendar": "Calendar",
  "/weekly": "Weekly Progress",
  "/routines": "Routines",
  "/insights": "Insights",
  "/important": "Important",
  "/high-priority": "High Priority",
  "/categories": "Categories",
  "/notifications": "Notifications",
  "/settings": "Settings"
};

export default function Header({ isDark, onToggleTheme, onOpenSidebar }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotificationCenter();
  const { getDay } = useTasks();
  const [toast, setToast] = useState<string | null>(null);

  const isHome = location.pathname === "/today" || location.pathname === "/";
  const pageTitle = ROUTE_TITLES[location.pathname] || "Daily Check";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function handleShare() {
    const today = todayStr();
    const day = getDay(today);
    const stats = dayStats(day);

    let text = `Daily Check — ${formatDayMonth(today)}: `;
    if (stats.total === 0) {
      text += "Ready to make progress today!";
    } else {
      text += `${stats.completed}/${stats.total} completed (${formatPct(stats.pct)}) · ${stats.remaining} remaining`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Daily Check",
          text
        });
      } catch (err: unknown) {
        // User cancelled or share failed, fallback to clipboard
        if ((err as Error)?.name !== "AbortError") {
          await copyToClipboard(text);
        }
      }
    } else {
      await copyToClipboard(text);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast("Daily summary copied to clipboard!");
      } else {
        showToast(text);
      }
    } catch {
      showToast("Could not copy summary");
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        {!isHome ? (
          <button
            className="icon-btn topbar-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back to previous screen"
            title="Back"
          >
            <BackIcon />
          </button>
        ) : null}
        <button
          className="icon-btn hamburger"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          title="Menu"
        >
          <HamburgerIcon />
        </button>
      </div>

      <div className="topbar-title">{pageTitle}</div>

      <div className="topbar-actions">
        {!isHome ? (
          <button
            type="button"
            className="icon-btn topbar-share-btn"
            onClick={handleShare}
            aria-label="Share today's progress"
            title="Share progress"
          >
            <ShareIcon />
          </button>
        ) : null}

        <NavLink
          to="/notifications"
          className={({ isActive }) => "icon-btn notif-bell-btn" + (isActive ? " active" : "")}
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          title="Notifications"
          style={{ position: "relative" }}
        >
          <BellIcon />
          {unreadCount > 0 ? (
            <span className="notif-badge" aria-hidden="true">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </NavLink>

        <button
          className="icon-btn topbar-theme-btn"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title="Toggle theme"
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {isDark ? "☀️" : "🌙"}
          </span>
        </button>
      </div>

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </header>
  );
}
