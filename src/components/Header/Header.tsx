import { HamburgerIcon } from "../icons";

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
}

export default function Header({ isDark, onToggleTheme, onOpenSidebar }: HeaderProps) {
  return (
    <header className="topbar">
      <button className="icon-btn hamburger" onClick={onOpenSidebar} aria-label="Open navigation">
        <HamburgerIcon />
      </button>
      <div className="topbar-title">Daily Check</div>
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
    </header>
  );
}

