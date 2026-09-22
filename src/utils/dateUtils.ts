function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function toDateStr(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function parseDateStr(s: string): Date {
  const parts = s.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function formatLong(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export function formatShort(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function weekdayLetter(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

export function weekdayFull(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

/** "20 September" or "20 September 2026" if not current year */
export function formatDayMonth(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const now = new Date();
  if (d.getFullYear() !== now.getFullYear()) {
    return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

/** Compact nav date like "Sun 20 Sep" */
export function formatNavDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `${weekday} ${d.getDate()} ${month}`;
}

/** "20 Sep 2026" — used for countdown goal dates (no weekday, needs the year). */
export function formatDateMedium(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Whole calendar days between two YYYY-MM-DD dates (b - a), independent of
 * time-of-day/DST: both are parsed to local midnight, and rounding (rather
 * than flooring) absorbs the one-off DST hour shift so a "23-hour" or
 * "25-hour" day still counts as exactly 1 day. Never use `Date.now()` or
 * millisecond timestamps for calendar-day math — this is date-only.
 */
export function daysBetweenCalendar(aDateStr: string, bDateStr: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = parseDateStr(aDateStr).getTime();
  const b = parseDateStr(bDateStr).getTime();
  return Math.round((b - a) / msPerDay);
}

/** Monday-start week containing the given date. */
export function getWeekStart(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
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

/** Monday-start 6-week grid (42 cells) covering the month containing dateStr. */
export function getMonthGrid(dateStr: string): MonthCell[] {
  const anchor = monthAnchor(dateStr);
  const month = parseDateStr(anchor).getMonth();
  const gridStart = getWeekStart(anchor);
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
