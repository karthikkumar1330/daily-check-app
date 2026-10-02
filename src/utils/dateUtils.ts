function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function toDateStr(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/**
 * Pure local calendar date parsing.
 * Never interprets YYYY-MM-DD as UTC.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function parseDateStr(s: string): Date {
  return parseLocalDate(s);
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return toDateStr(date);
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export const CALENDAR_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

export const CALENDAR_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;

export const CALENDAR_WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
] as const;

export const CALENDAR_WEEKDAYS_SHORT = [
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
] as const;

export function getCalendarComponents(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return {
    year,
    month,
    day,
    monthName: CALENDAR_MONTHS[month - 1] || "",
    monthShort: CALENDAR_MONTHS_SHORT[month - 1] || "",
    weekday: CALENDAR_WEEKDAYS[d.getDay()] || "",
    weekdayShort: CALENDAR_WEEKDAYS_SHORT[d.getDay()] || ""
  };
}

export function formatLong(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return `${comp.weekday}, ${comp.day} ${comp.monthName}`;
}

export function formatShort(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return `${comp.weekdayShort}, ${comp.monthShort} ${comp.day}`;
}

export function weekdayLetter(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return comp.weekdayShort;
}

export function weekdayFull(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return comp.weekday;
}

/** "20 September" or "20 September 2026" if not current year */
export function formatDayMonth(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  const currentYear = new Date().getFullYear();
  if (comp.year !== currentYear) {
    return `${comp.day} ${comp.monthName} ${comp.year}`;
  }
  return `${comp.day} ${comp.monthName}`;
}

/** Compact nav date like "Sun 20 Sep" */
export function formatNavDate(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return `${comp.weekdayShort} ${comp.day} ${comp.monthShort}`;
}

/** "20 Sep 2026" — used for countdown goal dates (no weekday, needs the year). */
export function formatDateMedium(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return `${comp.day} ${comp.monthShort} ${comp.year}`;
}

/**
 * Safe local calendar display date avoiding ambiguous numerical formats.
 * e.g. "Thu, 1 Oct 2026"
 */
export function formatDisplayDate(dateStr: string, includeWeekday = true): string {
  if (!dateStr || !isValidDateStr(dateStr)) return dateStr || "";
  const comp = getCalendarComponents(dateStr);
  if (includeWeekday) {
    return `${comp.weekdayShort}, ${comp.day} ${comp.monthShort} ${comp.year}`;
  }
  return `${comp.day} ${comp.monthName} ${comp.year}`;
}

/**
 * Calculates exact calendar day difference (b - a).
 * Compares pure calendar components via Date.UTC to eliminate any timezone or DST shifts.
 */
export function daysBetweenCalendarDates(
  startDateStr: string,
  endDateStr: string
): number {
  const [y1, m1, d1] = startDateStr.split("-").map(Number);
  const [y2, m2, d2] = endDateStr.split("-").map(Number);

  const startDay = Date.UTC(y1, m1 - 1, d1);
  const endDay = Date.UTC(y2, m2 - 1, d2);

  return Math.round((endDay - startDay) / 86_400_000);
}

export function daysBetweenCalendar(aDateStr: string, bDateStr: string): number {
  return daysBetweenCalendarDates(aDateStr, bDateStr);
}

/** Week start date containing the given date (weekStartsOn: 1 = Monday, 0 = Sunday). */
export function getWeekStart(dateStr: string, weekStartsOn: 0 | 1 = 1): string {
  const d = parseDateStr(dateStr);
  const day = d.getDay(); // 0 = Sunday, 1 = Mon ...
  const diff = weekStartsOn === 0 ? -day : day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

export function getWeekDates(weekStartStr: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) out.push(addDays(weekStartStr, i));
  return out;
}

export function weekLabel(weekStartStr: string): string {
  const dates = getWeekDates(weekStartStr);
  const start = parseDateStr(dates[0]);
  const end = parseDateStr(dates[6]);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return (
    start.toLocaleDateString(undefined, opts) +
    " \u2013 " +
    end.toLocaleDateString(undefined, opts)
  );
}

/* ---------------- month helpers (Calendar page) ---------------- */

export function monthAnchor(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonths(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr);
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function monthLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export interface MonthCell {
  date: string;
  inMonth: boolean;
}

/** 6-week grid (42 cells) covering the month containing dateStr. */
export function getMonthGrid(dateStr: string, weekStartsOn: 0 | 1 = 1): MonthCell[] {
  const anchor = monthAnchor(dateStr);
  const month = parseDateStr(anchor).getMonth();
  const gridStart = getWeekStart(anchor, weekStartsOn);
  const cells: MonthCell[] = [];
  let cursor = gridStart;
  for (let i = 0; i < 42; i++) {
    cells.push({ date: cursor, inMonth: parseDateStr(cursor).getMonth() === month });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

/** Format date as "Tue, 22 Sep" deterministically */
export function formatBestDayDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}
