import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { NAV_SECTIONS } from "./navConfig";
import { CloseIcon } from "../icons";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  useBodyScrollLock(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseMobile();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {mobileOpen ? (
        <div className="drawer-overlay" onClick={onCloseMobile} aria-hidden="true" />
      ) : null}

      <aside
        className={"sidebar" + (mobileOpen ? " open" : "")}
        aria-label="Main navigation"
        aria-hidden={!mobileOpen && typeof window !== "undefined" && window.innerWidth < 900}
      >
        <div className="sidebar-head">
          <div className="brand">
            <span className="dot" aria-hidden="true" />
            Daily Check
          </div>
          <button
            className="icon-btn sidebar-close"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} className="sidebar-section">
              <div className="sidebar-heading">{section.heading}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                  onClick={onCloseMobile}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <item.icon />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
