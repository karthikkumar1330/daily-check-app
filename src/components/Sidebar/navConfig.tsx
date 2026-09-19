import type { ComponentType } from "react";
import {
  BarChartIcon,
  CalendarIcon,
  FolderIcon,
  HomeIcon,
  SettingsIcon,
  StarIcon
} from "../icons";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Main",
    items: [
      { to: "/today", label: "Today", icon: HomeIcon },
      { to: "/tasks", label: "Tasks", icon: () => <span aria-hidden="true">{"\u2705"}</span> },
      { to: "/calendar", label: "Calendar", icon: CalendarIcon },
      { to: "/weekly", label: "Weekly Progress", icon: BarChartIcon }
    ]
  },
  {
    heading: "Productivity",
    items: [
      { to: "/important", label: "Important", icon: StarIcon },
      { to: "/high-priority", label: "High Priority", icon: () => <span aria-hidden="true">{"\uD83D\uDD34"}</span> },
      { to: "/categories", label: "Categories", icon: FolderIcon }
    ]
  },
  {
    heading: "Other",
    items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }]
  }
];
