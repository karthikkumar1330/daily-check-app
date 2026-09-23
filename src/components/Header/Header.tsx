import { NavLink } from "react-router-dom";
import { BellIcon, HamburgerIcon } from "../icons";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
}

export default function Header({ isDark, onToggleTheme, onOpenSidebar }: HeaderProps) {
  const { unreadCount } = useNotificationCenter();

  return (
    <header className="topbar">
      <button className="icon-btn hamburger" onClick={onOpenSidebar} aria-label="Open navigation">
        <HamburgerIcon />
      </button>
      <div className="topbar-title">Daily Check</div>
      <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
    </header>
  );
}


