# Daily Check

A clean, minimal daily checklist, todo list, and weekly progress tracker. React + TypeScript + Vite, installable as a PWA. All data lives in your browser's `localStorage` — no login, no backend, no tracking.

**V4.1** removes the time-based Focus Countdown and replaces it with calendar-day-only Countdown Goals (e.g. "103 DAYS LEFT" — no hours/minutes/seconds, no `setInterval`). See "What changed in v4.1" below.

## Run it locally

```bash
npm install
npm run dev
```

The dev server also serves the service worker (`devOptions.enabled` in `vite.config.ts`), so install/offline behavior can be tested without a production build.

## Build for production

```bash
npm run build
npm run preview   # serve the build locally to double-check it
```

Output goes to `dist/`.

## Deploying to Vercel

You already have this deployed on Vercel — the only new requirement is the SPA rewrite in `vercel.json` (included in this project), needed because the app now uses client-side routing (`react-router-dom`) for `/today`, `/tasks`, `/calendar`, etc. Without it, refreshing on any route other than `/` would 404.

- **If Vercel auto-detects Vite** (it does by default): just push/redeploy. `vercel.json`'s rewrite rule is picked up automatically.
- **CLI**: `vercel --prod` from the project root.
- **Git-connected project**: push to the branch Vercel watches; it rebuilds with `npm run build` and serves `dist/` automatically, respecting `vercel.json`.

No environment variables or backend config are needed — everything is static + client-side `localStorage`.

## What changed in v4.1

**V4.1 removes the time-based Focus Countdown entirely** (component, hook, CSS, its Today-page slot) and replaces it with **Countdown Goals** — a calendar-day-only countdown, e.g. "103 DAYS LEFT" for a 180 Day Challenge. No hours, no minutes, no seconds, no `setInterval`.

### Countdown Goals
A goal has a title, an optional emoji icon, an optional description, a `startDate`, and a `targetDate` (both YYYY-MM-DD, inclusive). Create/edit/delete and "set as primary" live in a `GoalsManagerModal`, reachable from Settings → Goals or directly from the Today-page card's "Manage" link (same modal, two entry points — not duplicated). The first goal you create becomes primary automatically; with zero goals, Today just shows a single subtle "+ Add a countdown goal" link instead of an empty card, per your instruction not to waste vertical space.

### Calendar-day math, not timestamps
`utils/countdownUtils.ts` computes status from two YYYY-MM-DD strings via `daysBetweenCalendar()` (in `dateUtils.ts`, reused rather than duplicated) — never `targetDate - Date.now()`. Three phases:
- **upcoming** (today < start): shows "Starts in X days", 0% progress
- **active** (start ≤ today ≤ target): shows days left, elapsed/total, and a progress bar
- **complete** (today > target): shows "Deadline passed" instead of a negative number — the UI never displays `-1 days` etc.

**A math discrepancy in the original spec — since resolved by an explicit follow-up instruction.** The first v4.1 pass noticed the worked example "20 Sep 2026 → 31 Dec 2026 = 103 days left" didn't match plain calendar subtraction (102 days) and flagged it rather than guessing. The follow-up clarified the intent: **inclusive challenge-day counting**, where the start date is "Day 1" and the displayed number always includes today. `totalDays = (target − start) + 1`; `daysLeft = totalDays − dayNumber + 1`, where `dayNumber` is today's 1-indexed position in the challenge. This reproduces the full worked example exactly: 103 on 20 Sep, 102 on 21 Sep, ..., 1 on 31 Dec (the target date is a counted day — never 0). One day past the target date, the card shows **"Completed"** instead of a number. Independently verified against the exact example with Python's `date` arithmetic before shipping. See `utils/countdownUtils.ts`.

### No polling, ever
`hooks/useTodayDate.ts` tracks the real calendar date without a ticking timer: recalculates once on mount, once whenever the tab/app regains visibility (covers backgrounding, device sleep, PWA reopen), and via a single `setTimeout` scheduled for the *next local midnight only* — it fires at most once per calendar day and immediately reschedules itself. There is no `setInterval` anywhere in the countdown feature.

### Storage: fully separate from tasks
`dailyCheck.countdownGoals.v1` is its own key, its own version constant (`CURRENT_COUNTDOWN_VERSION`), and its own load/save/sanitize functions in `utils/countdownStorage.ts` — structurally identical in spirit to `storageUtils.ts` but intentionally not merged with it, so a countdown-goal session can never affect task completion stats and vice versa. `CURRENT_DATA_VERSION` (tasks) is untouched at `1`.

### Calendar page: status dots
Per-day dots on the Calendar page are now meaningful instead of a single generic "has tasks" mark: no dot for a zero-task day, a neutral dot for 0% completed, an amber dot for a partial day, and an accent-colored dot for a 100% day — computed via the existing `dayStats()` (reused, not reimplemented) rather than a separate boolean set.

### Data isolation — unchanged from v4
No namespacing by display-mode was introduced (matches your explicit instruction this time, and the reasoning documented in "What changed in v4" above still applies: Android installed PWAs already correctly share storage with the browser tab for the same origin).

## What changed in v4

### Focus Countdown (new)
A compact widget on the Today page (`components/FocusCountdown/`, `hooks/useFocusCountdown.ts`): presets (5/10/15/25/30/45/60 min) plus a 1–120 min custom duration, optional "focus on this task" linking to one of today's incomplete tasks, a circular progress ring, and Pause/Resume/Reset.

- **Timestamp-based, not `setInterval` drift**: the single source of truth is an `endTime` timestamp (`Date.now() + durationMs`). The 1-second interval only triggers a re-render — it never decrements a counter. Remaining time is always recomputed as `endTime - Date.now()`.
- **Backgrounding/lock**: a `visibilitychange` listener recomputes remaining time the instant the tab/app becomes visible again, so returning after minutes away shows the correct time rather than a frozen one. (This can't fully escape browser/OS timer throttling while backgrounded — see Known Limitations.)
- **Pause/resume preserve remaining time correctly**: pausing captures `endTime - Date.now()` into `remainingMs` and clears `endTime`; resuming sets a fresh `endTime = Date.now() + remainingMs`.
- **Persisted separately from task data**, under its own key `dailyCheck.focusTimer.v1` — a timer session can never touch task-completion statistics, and a refresh mid-session restores correctly (including auto-completing a session whose time ran out while the tab was closed, rather than silently resuming as if no time had passed).
- No sound by default; a short `navigator.vibrate()` pulse fires on completion only where the device supports it, with no UI to configure it since it's a single, unobtrusive default (no annoying default sound, per your spec).
- Accessible: `role="timer"` with `aria-live="off"` on the numeric display (so screen readers aren't spammed every second), plus a separate visually-hidden `aria-live="polite"` region that announces only state changes (started/paused/resumed/reset/complete).

### Data isolation / privacy — investigated, and a deliberate non-change
I looked into "separate storage namespaces for browser vs. installed standalone mode" as asked, and chose **not** to implement it, for a concrete reason: on Android, an installed PWA (WebAPK) and the browser tab for the same site share the same browser engine, profile, and origin — so they already share `localStorage` today, which is what lets your existing V3 tasks show up correctly however you open the app. Forcibly splitting storage by `display-mode` would not "fix" isolation — it would introduce it where none currently exists and shouldn't, and the two most likely outcomes are (a) the installed app suddenly appears to have lost all your tasks, or (b) tasks added in one context silently stop showing in the other. Both are exactly the kind of silent, apparent data loss your spec explicitly rules out, and there's no reliable way to reconcile "which store is the real one" after the fact.

What's true and worth understanding instead:
- Nothing here is a server-side or cross-device sync — every browser and every device already gets its own independent, empty store, correctly, with no code change needed. That was already true and remains true.
- The one platform-level caveat outside this app's control: iOS Safari's storage for home-screen web apps has a track record of being more aggressively cleared (Intelligent Tracking Prevention) than regular Safari tabs. No client-side code can reliably fix that; it's a platform constraint. The existing Export/Import feature is the practical mitigation, and I added one line about it to Settings → About so this is visible in-app rather than a surprise.
- No task data is hardcoded, bundled, or demo-seeded anywhere (confirmed by reading `storageUtils.ts`, `useTasks.tsx`, and every page — nothing changed here, this was already true in v1–v3).

### Responsive polish
- `.page-date-line` (Today's date heading) is now fluid via `clamp(19px, 5.6vw, 24px)` instead of a fixed size + one breakpoint override, so it scales smoothly rather than jumping at a single width, and long localized dates wrap instead of overflowing (`overflow-wrap: break-word`).
- Day-nav/week-nav center label: added `min-width: 0` + ellipsis truncation so it can never collide with or push against the prev/today/next buttons on a 320–430px phone, even with a larger OS font-size setting.
- Quick Add: added a `max-width: 340px` stacked fallback (input full-width, button full-width beneath it) for the narrowest phones or large accessibility text sizes, instead of letting the two controls get cramped.
- Removed a few now-dead CSS rules left over from the original single-page layout (`.date-line`, `.greeting`, `.header-actions` — all superseded by `.page-date-line`/`.page-greeting`/the topbar in v2) rather than leaving them alongside the new ones.

## What changed in v3

A UI polish / mobile UX / accessibility / reliability pass. No routes, storage schema, or calculation logic changed.

### Fixed: oversized Export/Import icons (root cause)
Every icon in `components/icons.tsx` was missing explicit `width`/`height` on its `<svg>`. Anywhere that wasn't wrapped in a container with its own `svg { width; height }` rule (like Settings' action buttons), the browser fell back to its default intrinsic SVG size (300×150px) — that's what was blowing up the Export/Import buttons. Fixed by giving every icon an explicit default size at the source, so it can't happen again anywhere else in the app; context-specific CSS (nav icons, kebab menu, etc.) still overrides it as before.

### Settings Data section rebuilt
New reusable `components/ActionRow/ActionRow.tsx` (icon + title + description + button, 44px button height, 20px icon, compact) replaces the old oversized rows for Export Backup, Import Backup, Print Weekly Progress, and Install App.

### Import safety
- `parseImportFile` now also rejects a non-numeric `version` field.
- Error copy: "Couldn't import this backup. Check that the file is a valid Daily Check backup."
- Confirm dialog: "Import this backup? / This will replace your current Daily Check data." — current data is never touched until this is confirmed.

### Reusable components
- `ConfirmModal`: optional title, `aria-labelledby`/`aria-describedby`, Escape-to-close, focus moves to Cancel on open, body scroll locked while open.
- `AddTaskModal`: Escape-to-close, `aria-labelledby`, body scroll locked while open.
- `EmptyState`: rewritten compact (was consuming too much vertical space), optional icon, consistent copy across pages ("No tasks yet", "No tasks found.", "Nothing important right now.", etc.)
- New `hooks/useBodyScrollLock.ts`, shared by the sidebar drawer and both modals instead of duplicating the same logic three times.

### Touch targets & header
- `.icon-btn`, `.icon-round`, `.hamburger` all now a true 44×44px (previously 36–40px in places).
- Topbar title is now genuinely centered (a side effect of the hamburger/theme buttons being equal width).
- Checkbox tap area bumped 26→28px — a deliberate, smaller improvement rather than a fragile negative-margin layout hack to hit a literal 44px on a dense list row (see Known Limitations).

### Motion & accessibility
- `prefers-reduced-motion: reduce` now minimizes all animations/transitions app-wide.
- Icon-only buttons re-worded to be clearer for screen readers ("Task actions", "Open navigation", etc.)

### Cleanup
Removed CSS rules that were dead after the Settings rebuild (`.settings-row`, `.version-tag`, a duplicate `.settings-btn` block).

## What changed in v2

- Fixed sidebar on desktop/tablet, slide-out drawer on mobile (hamburger menu), closes on route change, outside click, or Escape; body scroll locks while open.
- Compact top bar (hamburger + "Daily Check" + theme toggle). Per-page date/greeting now lives in page content, not the global header.

### New pages (`src/pages/`)
| Page | Route | What it does |
|---|---|---|
| Today | `/today` | Day nav, progress, quick add, checklist — the default landing page |
| Tasks | `/tasks` | Same day-scoped list plus search (title/notes/category) and All/Active/Completed/High‑Priority + category filters |
| Calendar | `/calendar` | Month grid with a dot on days that have tasks; tap a day to see its tasks |
| Weekly Progress | `/weekly` | Week nav, bar chart, per-day breakdown, summary, Print Week |
| Important | `/important` | High-priority tasks grouped into Today / Upcoming / Completed |
| High Priority | `/high-priority` | Flat high-priority list sorted by day then creation time; completed tasks collapse |
| Categories | `/categories` | Category cards with active/completed counts; tap a card to see its tasks |
| Settings | `/settings` | Theme (Light/Dark/System), install prompt, export/import backup, print link, about |

### Corrected zero-task-day rule (was a bug in v1)
A day with **zero tasks** now has `pct: null`, and is handled specially everywhere:
- Progress card shows "No tasks", never 0% or 100%
- Weekly average only includes days with at least one task ("No activity yet" if none do)
- "Best Day" can never be a zero-task day; ties break on completed-task count
- Streaks: a zero-task day is skipped entirely — it neither extends nor breaks a streak

This logic lives in `src/utils/progressUtils.ts` (stats/average/best-day) and `src/utils/streakUtils.ts` (current/best streak), both covered by the manual test pass below.

### Task menu
The four separate icon buttons (up/down/edit/delete) are now a single **⋮** menu per task, to cut visual clutter — closes on outside click or Escape.

### Data — unchanged
`storageUtils.ts` and the `AppData`/`Task`/`DayData` shapes are **untouched**. No schema/version bump, no migration needed — this is why your existing tasks survive the update. `CURRENT_DATA_VERSION` stays at `1`; the migration hook in `storageUtils.ts` is ready for whenever a future version does need one.

### PWA — unchanged
`vite.config.ts`'s `VitePWA` block (manifest, icons, workbox caching) was not modified.

## Project structure

```
src/
  components/
    Sidebar/, Header/, Layout/        nav shell
    TaskList/ (TaskList, TaskItem)    task rows + kebab menu
    QuickAddTask/, ProgressCard/      Today-page pieces
    WeeklyChart/, WeeklySummary/, PrintWeek/
    Calendar/                        month grid
    Modals/ (AddTaskModal, ConfirmModal)
    EmptyState/, icons.tsx
  pages/
    Today/, Tasks/, Calendar/, WeeklyProgress/,
    Important/, HighPriority/, Categories/, Settings/
  hooks/
    useTasks.tsx    TasksProvider + useTasks() — all task CRUD, theme, import/export state
    useTheme.ts     derives isDark from a ThemePreference, syncs the DOM attribute
    useSidebar.ts   mobile drawer open state, Escape-to-close, body scroll lock
    usePwaInstall.ts
  utils/
    dateUtils, taskUtils, progressUtils, streakUtils, storageUtils, taskQueries
  types/index.ts
  App.tsx      BrowserRouter + TasksProvider + routes
  main.tsx     mounts React, registers the service worker
public/icons/  PWA icons (unchanged)
vercel.json    SPA rewrite (new — required for client-side routing)
```

## Data & backups

- All tasks live under one versioned `localStorage` key (`dailyCheck.data`, schema v1).
- Settings → Export Backup downloads `daily-check-backup.json` with every task, date, priority, category, note, order, and completion state.
- Settings → Import Backup restores from that file after a confirmation step; a malformed file is rejected with "Invalid backup file." instead of crashing.

## What was checked before delivery

Every new/changed file was reviewed by hand, and the full `src/` tree was run through the TypeScript compiler after each batch of changes to catch syntax and type errors (this sandbox has no `@types/react` installed, so React-prop-shape noise — including a `key`-prop false positive that shows up on every `.map()`'d component without real React types loaded — was identified and filtered out by hand; no structural errors remained). One real bug was caught and fixed during the v2 pass: a couple of `\u2014`/`\u2019` unicode escapes placed directly in JSX text/attributes instead of inside a JS string. The v3 pass found and fixed the oversized-icon root cause described above.

**I could not run `npm install`, `npm run build`, or an actual browser test in this sandbox — there is no outbound network access here.** Nothing below should be read as "passed," only as reviewed in code. Please run through this once you `npm install` locally:

- [ ] `npm install && npm run dev` — sidebar opens/closes on mobile width, outside-click and Escape close it, no route change leaves it stuck open, body doesn't scroll behind the open drawer
- [ ] **Settings → Data**: Export Backup and Import Backup rows are compact (small icon, no giant arrows) — this was the P0 bug, confirm it visually on an actual phone
- [ ] Today: add/edit/delete/complete/uncomplete a task, priority, category, notes; day nav; Clear completed (requires confirm)
- [ ] Tasks: search matches title/notes/category; each filter chip and the category dropdown narrow the list correctly; combining filters works; "No tasks found." empty state on a no-match search
- [ ] Calendar: month nav, Today button, dots appear only on days with tasks, selecting a day shows its tasks
- [ ] Weekly Progress: week nav, chart, per-day breakdown, Print Week → Save as PDF
- [ ] **Zero-task-day test cases (section 29 of your spec)** — worth going through literally one by one:
  - [ ] Case A: no tasks anywhere → Today shows "No tasks yet"; Weekly average, Best Day, streak all show empty/zero, never 0%/100%
  - [ ] Case B/C/D/E: 1 incomplete → 0%; 1 complete → 100%; 8/10 → 80% (streak day); 7/10 → 70% (not a streak day)
  - [ ] Case F: Mon=no tasks, Tue=100%, Wed=100% → weekly average 100%, not 66.7%
  - [ ] Case G: Mon=no tasks, Tue=80% → current streak = 1, not broken by Monday
  - [ ] Case H: Mon=100%, Tue=50% → Best Day = Monday
  - [ ] Case I: whole week zero tasks → "No activity yet", never 0%/100%
  - [ ] Case J: import an invalid file → current data is untouched, clear error shown
- [ ] Important / High Priority: mark a task High priority, confirm it shows in both (grouped vs. flat), completed collapses on High Priority, both use the same `TaskItem` component
- [ ] Categories: counts match reality; tapping a card filters correctly; grid stays readable at 320px
- [ ] Settings: theme Light/Dark/System; Export then Import the same file; import an unrelated/non-JSON file and confirm "Couldn't import this backup..."; confirm dialog reads "Import this backup? / This will replace your current Daily Check data."; Print Weekly Progress row navigates to `/weekly`
- [ ] `npm run build && npm run preview` — install prompt, then offline reload, confirm `vercel.json` rewrite still present in the build output source
- [ ] Existing production data (already on your phone) still loads correctly after deploying this update — the schema didn't change, so this should be a non-event, but worth confirming once on a real device
- [ ] 320px, 360px, 375px, 390px, 414px, 430px, 480px, 768px, 1024px, 1280px+ — no horizontal scroll, no clipped buttons/menus, modal never exceeds viewport height
- [ ] Toggle "Reduce motion" in OS accessibility settings and confirm drawer/modal/checkbox transitions shorten to nearly instant
- [ ] Tab through Today page and a modal with keyboard only — focus is visible at every stop, Escape closes modals/drawer, Enter submits Quick Add
- [ ] **Countdown Goals**: create a goal (Settings → Goals, and separately via Today card's "+ Add a countdown goal"/"Manage"), confirm it appears on Today as primary
- [ ] Create a second goal, confirm the first stays primary until you explicitly select the new one in the manager
- [ ] Edit a goal's dates, confirm the Today card updates immediately (no refresh needed)
- [ ] Delete the primary goal with one other goal existing → the remaining goal becomes primary automatically; delete the only goal → Today falls back to the subtle "+ Add a countdown goal" link, not an empty card
- [ ] Goal with `startDate` in the future → Today shows "Starts in X days", no progress bar, no negative number
- [ ] Goal with `targetDate` = today → **"1 DAY LEFT"** (inclusive — never "0 DAYS LEFT" on the target date itself), progress bar at 100%
- [ ] Goal with `startDate` = `targetDate` (one-day goal) → allowed, shows "0 DAYS LEFT" that day, no divide-by-zero
- [ ] Goal whose `targetDate` has already passed → **"Completed"**, never a negative number and never a stray "0 DAYS LEFT"
- [ ] Refresh the page mid-goal → days-left value is identical (it's recomputed from dates, not stored as a countdown)
- [ ] **Verify no hours/minutes/seconds ever appear anywhere in the countdown UI**
- [ ] **Verify there is no `setInterval` in the countdown feature** — `grep -rn "setInterval" src/hooks/useTodayDate.ts src/utils/countdownUtils.ts src/components/CountdownGoal` should return nothing
- [ ] Confirm a countdown goal never changes Today's task completion count, weekly average, or streaks
- [ ] Today page date heading and day-nav row at 320px width — no overflow, no collision
- [ ] Calendar: a 100%-complete day shows an accent dot, a partial day shows an amber dot, a 0%-of-N day shows a neutral dot, a zero-task day shows no dot

## Known limitations

- **Checkbox touch target**: bumped from 26px to 28px, not a full 44×44px (unchanged from v3/v4 — see prior reasoning below).
- **Storage namespacing was investigated and deliberately not implemented**, in both v4 and v4.1 — see "What changed in v4" above for the full reasoning. Nothing changed about how `dailyCheck.data` is stored or keyed.
- **Inclusive challenge-day counting was clarified and implemented after the first v4.1 pass** — see "What changed in v4.1" above. The target date now always shows "1 DAY LEFT", never "0", and the day after shows "Completed".
- **Countdown Goals accessibility is functional but not exhaustively polished**: the icon picker in the goal form is a set of hidden native radio inputs behind emoji-only labels, so a screen reader announces "radio button" plus the emoji's accessible name, which is serviceable but not as descriptive as a labeled icon picker could be. Everything else (Escape, focus, `aria-labelledby`, body scroll lock) follows the same pattern as the rest of the app's modals.
- No automated tests exist for this project (matches what was already true in v1–v4) — everything above is a manual/code-review pass, not an automated one.
- **Build was not run.** I attempted `npm install` in this sandbox and it failed with `403 Forbidden` from the npm registry — this environment has no outbound network access at all (confirmed, not assumed). I could not run `npm install` or `npm run build`, so I cannot claim the build passes. The full `src/` tree was checked with a bare TypeScript compiler (no `@types/react`, no bundler) after every batch of edits, filtering out the noise that's specific to missing React type declarations — real syntax/type errors would still have surfaced through that and none did, but **this is not a substitute for an actual `npm run build`**, which you'll need to run yourself before trusting or deploying this.
