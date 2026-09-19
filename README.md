# Daily Check

A clean, minimal daily checklist, todo list, and weekly progress tracker. React + TypeScript + Vite, installable as a PWA. All data lives in your browser's `localStorage` — no login, no backend, no tracking.

**V3** is a mobile UX / UI polish and reliability pass on top of V2's navigation and pages. No routes, storage schema, or business logic changed — see "What changed in v3" below.

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
- Settings → Import Backup restores from that file after a confirmation step; a malformed or incompatible file is rejected with "Couldn't import this backup. Check that the file is a valid Daily Check backup." instead of crashing.

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

### V3-specific test checklist

These checks are specific to the V3 mobile UX, accessibility, reliability, and Settings-data changes.

- [ ] **Settings → Data**: Export Backup, Import Backup, Print Weekly Progress, and Install App use compact action rows; no SVG/icon expands to a giant 300×150px default size.
- [ ] **Header and touch targets**: hamburger, theme toggle, and other icon buttons are 44×44px; the `Daily Check` title stays visually centered at narrow mobile widths.
- [ ] **Empty states**: Tasks, Important, High Priority, and Categories use compact, consistent empty-state copy and optional icons without excessive vertical whitespace.
- [ ] **Modals**: Add Task and Import confirmation close with Escape, move focus appropriately when opened, expose correct `aria-labelledby`/`aria-describedby`, and prevent body scrolling behind the modal.
- [ ] **Sidebar**: mobile drawer still opens/closes correctly, closes on outside click/Escape/route change, and prevents background scrolling while open.
- [ ] **Reduced motion**: enable the OS `prefers-reduced-motion` setting and confirm drawer, modal, checkbox, and other transitions become minimal.
- [ ] **Import safety**: malformed JSON, missing/invalid data, and non-numeric `version` are rejected; the current data is untouched before validation and confirmation; the confirmation text is exactly `Import this backup?` / `This will replace your current Daily Check data.`
- [ ] **Responsive layout**: verify 320px, 360px, 375px, 390px, 414px, 430px, 480px, 768px, 1024px, and 1280px+ widths for horizontal overflow, clipped controls, modal overflow, and readable Settings rows.
- [ ] **PWA regression**: verify the existing manifest/service worker/install behavior and the `vercel.json` SPA rewrite are still present after the V3 update.
- [ ] **Existing data regression**: open the deployed V3 app with the existing localStorage data and confirm tasks, completion state, categories, priorities, notes, and weekly statistics remain intact.
- [ ] **Known checkbox limitation**: confirm the checkbox remains a 28px visual/tap target as documented; do not treat this as a failed 44px icon-button requirement.

## Known limitations

- **Checkbox touch target**: bumped from 26px to 28px, not a full 44×44px. Hitting a literal 44px would have required either a wrapper element with an invisible padded hit-area or a negative-margin layout hack that risks bleeding into the 8px gap between adjacent task rows; given the density of a checklist UI, I chose the smaller, lower-risk improvement instead of a fragile trick. If a true 44px checkbox hit-area matters more than list density to you, this is the one place I'd revisit first.
- No automated tests exist for this project (matches what was already true in v1/v2) — everything above is a manual pass.

