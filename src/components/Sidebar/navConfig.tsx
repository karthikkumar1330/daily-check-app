import type { ComponentType } from "react";
import {
  BarChartIcon,
  CalendarIcon,
  FolderIcon,
  HomeIcon,
  InsightsIcon,
  PriorityIcon,
  SettingsIcon,
  StarIcon,
  TasksIcon
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
    heading: "MAIN",
    items: [
      { to: "/today", label: "Today", icon: HomeIcon },
      { to: "/tasks", label: "Tasks", icon: TasksIcon },
      { to: "/calendar", label: "Calendar", icon: CalendarIcon },
      { to: "/weekly", label: "Weekly Progress", icon: BarChartIcon }
    ]
  },
  {
    heading: "PRODUCTIVITY",
    items: [
      { to: "/insights", label: "Insights", icon: InsightsIcon },
      { to: "/important", label: "Important", icon: StarIcon },
      { to: "/high-priority", label: "High Priority", icon: PriorityIcon },
      { to: "/categories", label: "Categories", icon: FolderIcon }
    ]
  },
  {
    heading: "OTHER",
    items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }]
  }
];

