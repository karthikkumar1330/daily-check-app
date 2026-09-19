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
      <button className="icon-round" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle theme">
        {isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
      </button>
    </header>
  );
}
