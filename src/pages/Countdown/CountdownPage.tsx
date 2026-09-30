import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdowns } from "../../hooks/useCountdowns";
import type { Countdown } from "../../types";
import { computeCountdownStatus, type CountdownStatus } from "../../utils/countdownUtils";
import { parseDateStr, todayStr } from "../../utils/dateUtils";
import CountdownFormModal from "./CountdownFormModal";
import CountdownDetailModal from "./CountdownDetailModal";
import { BackIcon } from "../../components/icons";
import ConfirmModal from "../../components/Modals/ConfirmModal";

type FilterTab = "all" | "active" | "completed";
type SortOption = "target_asc" | "target_desc" | "pinned" | "recent";

/**
 * Format target date cleanly as "21 Oct 2026"
 */
function formatCardDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Derives the prominent glanceable status string (e.g. "21 DAYS LEFT", "TODAY", "✓ COMPLETED", "143 DAYS")
 */
function getStatusText(
  countdown: Countdown,
  status: CountdownStatus
): { text: string; variant: "upcoming" | "urgent" | "today" | "completed" | "countup" } {
  if (countdown.mode === "countup") {
    if (status.rawDaysDiff === 0) return { text: "TODAY", variant: "today" };
    if (status.rawDaysDiff < 0) {
      const days = Math.abs(status.rawDaysDiff);
      return { text: `${days} ${days === 1 ? "DAY" : "DAYS"}`, variant: "countup" };
    }
    return { text: `STARTS IN ${status.displayValue}D`, variant: "upcoming" };
  }

  if (status.phase === "completed") {
    return { text: "✓ COMPLETED", variant: "completed" };
  }

  if (status.rawDaysDiff === 0) {
    return { text: "TODAY", variant: "today" };
  }

  if (status.rawDaysDiff === 1 && !countdown.countWorkingDays) {
    return { text: "1 DAY LEFT", variant: "urgent" };
  }

  if (countdown.displayMode === "weeksDays") {
    const weeks = Math.floor(status.workingDaysLeft / 7);
    const rem = status.workingDaysLeft % 7;
    return { text: `${weeks}W ${rem}D LEFT`, variant: "upcoming" };
  }

  if (countdown.displayMode === "hours") {
    return { text: `${status.workingDaysLeft * 24} HOURS LEFT`, variant: "upcoming" };
  }

  const days = countdown.countWorkingDays ? status.workingDaysLeft : status.daysLeft;
  const unitText = countdown.countWorkingDays
    ? days === 1 ? "WORK DAY LEFT" : "WORK DAYS LEFT"
    : days === 1 ? "DAY LEFT" : "DAYS LEFT";

  return {
    text: `${days} ${unitText}`,
    variant: days <= 3 ? "urgent" : "upcoming"
  };
}

export default function CountdownPage() {
  const navigate = useNavigate();
  const {
    countdowns,
    activeCountdowns,
    completedCountdowns,
    createCountdown,
    updateCountdown,
    deleteCountdown,
    duplicateCountdown,
    togglePin,
    toggleShowOnToday
  } = useCountdowns();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);
  const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("target_asc");
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Countdown | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const today = todayStr();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  }

  // Close card overflow menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpenId]);

  // Filter and sort countdowns
  const { pinnedCountdowns, regularActiveCountdowns, displayedCompleted } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const matchesQuery = (c: Countdown) => {
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    };

    const sortFn = (a: Countdown, b: Countdown) => {
      if (sortBy === "pinned") {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.targetDate.localeCompare(b.targetDate);
      }
      if (sortBy === "target_desc") {
        return b.targetDate.localeCompare(a.targetDate);
      }
      if (sortBy === "recent") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      // "target_asc" (soonest)
      return a.targetDate.localeCompare(b.targetDate);
    };

    const matchedActive = activeCountdowns.filter(matchesQuery).sort(sortFn);
    const matchedCompleted = completedCountdowns.filter(matchesQuery).sort(sortFn);

    const pinned = matchedActive.filter((c) => c.pinned);
    const regular = matchedActive.filter((c) => !c.pinned);

    return {
      pinnedCountdowns: pinned,
      regularActiveCountdowns: regular,
      displayedCompleted: matchedCompleted
    };
  }, [activeCountdowns, completedCountdowns, searchQuery, sortBy]);

  const totalVisibleCount =
    filterTab === "completed"
      ? displayedCompleted.length
      : filterTab === "active"
      ? pinnedCountdowns.length + regularActiveCountdowns.length
      : pinnedCountdowns.length + regularActiveCountdowns.length + displayedCompleted.length;

  return (
    <div className="page countdown-page">
      <div className="countdown-page-container" ref={menuContainerRef}>
        {/* Toast Notification */}
        {toast ? (
          <div
            role="status"
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--ink)",
              color: "var(--surface)",
              padding: "10px 18px",
              borderRadius: 24,
              fontSize: 13,
              fontWeight: 600,
              zIndex: 1100,
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)"
            }}
          >
            {toast}
          </div>
        ) : null}

        {/* Header: Clean top row (Countdowns + New) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "0 0 14px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              style={{ width: 38, height: 38 }}
            >
              <BackIcon />
            </button>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                color: "var(--ink)",
                letterSpacing: "-0.01em"
              }}
            >
              Countdowns
            </h1>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingCountdown(null);
              setFormModalOpen(true);
            }}
            style={{
              minHeight: 38,
              padding: "0 14px",
              fontSize: 13.5,
              fontWeight: 700,
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <span>+ New</span>
            <span className="desktop-inline-label" style={{ display: "none" }}>Countdown</span>
          </button>
        </div>

        {/* Global Empty State (Zero countdowns in storage) */}
        {countdowns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">
              🎯
            </div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ink)",
                margin: "0 0 6px"
              }}
            >
              No countdowns yet
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-muted)",
                margin: "0 0 16px",
                maxWidth: 280,
                lineHeight: 1.4
              }}
            >
              Track an exam, trip, deadline or milestone.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingCountdown(null);
                setFormModalOpen(true);
              }}
              style={{
                minHeight: 40,
                padding: "0 18px",
                fontSize: 13.5,
                fontWeight: 700,
                borderRadius: 10
              }}
            >
              + New Countdown
            </button>
          </div>
        ) : (
          <>
            {/* Search Field (compact ~44px height) */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  pointerEvents: "none"
                }}
                aria-hidden="true"
              >
                🔎
              </span>
              <input
                type="search"
                className="input"
                placeholder="Search countdowns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 44,
                  height: 44,
                  padding: "0 14px 0 38px",
                  fontSize: 14,
                  borderRadius: 12,
                  background: "var(--surface)",
                  border: "1px solid var(--border)"
                }}
                aria-label="Search countdowns"
              />
            </div>

            {/* Filter Pills + Sort Dropdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 18,
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className={`countdown-filter-pill ${filterTab === "all" ? "active" : ""}`}
                  onClick={() => setFilterTab("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`countdown-filter-pill ${filterTab === "active" ? "active" : ""}`}
                  onClick={() => setFilterTab("active")}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`countdown-filter-pill ${filterTab === "completed" ? "active" : ""}`}
                  onClick={() => setFilterTab("completed")}
                >
                  Completed
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{
                    minHeight: 34,
                    height: 34,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "0 8px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--ink-muted)",
                    cursor: "pointer"
                  }}
                  aria-label="Sort countdowns"
                >
                  <option value="target_asc">Target date ▾</option>
                  <option value="target_desc">Latest date ▾</option>
                  <option value="pinned">Pinned first ▾</option>
                  <option value="recent">Recently added ▾</option>
                </select>
              </div>
            </div>

            {/* Search Empty State */}
            {totalVisibleCount === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 16px",
                  color: "var(--ink-muted)",
                  fontSize: 13.5
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  No matching countdowns
                </div>
                <div>Try another search query.</div>
              </div>
            ) : null}

            {/* PINNED SECTION */}
            {filterTab !== "completed" && pinnedCountdowns.length > 0 ? (
              <div style={{ marginBottom: 18 }}>
                <div className="countdown-section-label">PINNED</div>
                <div className="countdown-widget-list">
                  {pinnedCountdowns.map((item) => (
                    <CompactCountdownCard
                      key={item.id}
                      countdown={item}
                      today={today}
                      onOpen={() => setSelectedCountdown(item)}
                      isMenuOpen={menuOpenId === item.id}
                      onToggleMenu={() =>
                        setMenuOpenId((curr) => (curr === item.id ? null : item.id))
                      }
                      onEdit={() => {
                        setMenuOpenId(null);
                        setEditingCountdown(item);
                        setFormModalOpen(true);
                      }}
                      onTogglePin={() => {
                        setMenuOpenId(null);
                        togglePin(item.id);
                        showToast(item.pinned ? "Unpinned countdown." : "Pinned to top.");
                      }}
                      onToggleShowOnToday={() => {
                        setMenuOpenId(null);
                        toggleShowOnToday(item.id);
                        showToast(
                          item.showOnToday ? "Hidden from Today." : "Shown on Today screen."
                        );
                      }}
                      onDuplicate={() => {
                        setMenuOpenId(null);
                        duplicateCountdown(item.id);
                        showToast(`Duplicated "${item.title}".`);
                      }}
                      onDelete={() => {
                        setMenuOpenId(null);
                        setDeleteConfirmTarget(item);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* ACTIVE SECTION */}
            {filterTab !== "completed" && regularActiveCountdowns.length > 0 ? (
              <div style={{ marginBottom: 18 }}>
                <div className="countdown-section-label">
                  {pinnedCountdowns.length > 0 ? "ACTIVE" : "ALL COUNTDOWNS"}
                </div>
                <div className="countdown-widget-list">
                  {regularActiveCountdowns.map((item) => (
                    <CompactCountdownCard
                      key={item.id}
                      countdown={item}
                      today={today}
                      onOpen={() => setSelectedCountdown(item)}
                      isMenuOpen={menuOpenId === item.id}
                      onToggleMenu={() =>
                        setMenuOpenId((curr) => (curr === item.id ? null : item.id))
                      }
                      onEdit={() => {
                        setMenuOpenId(null);
                        setEditingCountdown(item);
                        setFormModalOpen(true);
                      }}
                      onTogglePin={() => {
                        setMenuOpenId(null);
                        togglePin(item.id);
                        showToast("Pinned to top.");
                      }}
                      onToggleShowOnToday={() => {
                        setMenuOpenId(null);
                        toggleShowOnToday(item.id);
                        showToast(
                          item.showOnToday ? "Hidden from Today." : "Shown on Today screen."
                        );
                      }}
                      onDuplicate={() => {
                        setMenuOpenId(null);
                        duplicateCountdown(item.id);
                        showToast(`Duplicated "${item.title}".`);
                      }}
                      onDelete={() => {
                        setMenuOpenId(null);
                        setDeleteConfirmTarget(item);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* COMPLETED SECTION */}
            {(filterTab === "all" || filterTab === "completed") && displayedCompleted.length > 0 ? (
              <div style={{ marginBottom: 18 }}>
                <div className="countdown-section-label">
                  COMPLETED ({displayedCompleted.length})
                </div>
                <div className="countdown-widget-list">
                  {displayedCompleted.map((item) => (
                    <CompactCountdownCard
                      key={item.id}
                      countdown={item}
                      today={today}
                      onOpen={() => setSelectedCountdown(item)}
                      isMenuOpen={menuOpenId === item.id}
                      onToggleMenu={() =>
                        setMenuOpenId((curr) => (curr === item.id ? null : item.id))
                      }
                      onEdit={() => {
                        setMenuOpenId(null);
                        setEditingCountdown(item);
                        setFormModalOpen(true);
                      }}
                      onTogglePin={() => {
                        setMenuOpenId(null);
                        togglePin(item.id);
                        showToast(item.pinned ? "Unpinned countdown." : "Pinned to top.");
                      }}
                      onToggleShowOnToday={() => {
                        setMenuOpenId(null);
                        toggleShowOnToday(item.id);
                        showToast(
                          item.showOnToday ? "Hidden from Today." : "Shown on Today screen."
                        );
                      }}
                      onDuplicate={() => {
                        setMenuOpenId(null);
                        duplicateCountdown(item.id);
                        showToast(`Duplicated "${item.title}".`);
                      }}
                      onDelete={() => {
                        setMenuOpenId(null);
                        setDeleteConfirmTarget(item);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* Creation/Edit Form Modal */}
        {formModalOpen ? (
          <CountdownFormModal
            initialCountdown={editingCountdown}
            onSave={(data) => {
              if (editingCountdown) {
                updateCountdown(editingCountdown.id, data);
                showToast(`Updated "${data.title}".`);
                if (selectedCountdown?.id === editingCountdown.id) {
                  setSelectedCountdown({ ...editingCountdown, ...data });
                }
              } else {
                const created = createCountdown(data);
                showToast(`Created "${data.title}".`);
                setSelectedCountdown(created);
              }
              setFormModalOpen(false);
              setEditingCountdown(null);
            }}
            onCancel={() => {
              setFormModalOpen(false);
              setEditingCountdown(null);
            }}
          />
        ) : null}

        {/* Detailed Inspection Modal */}
        {selectedCountdown ? (
          <CountdownDetailModal
            countdown={selectedCountdown}
            onClose={() => setSelectedCountdown(null)}
            onEdit={() => {
              setEditingCountdown(selectedCountdown);
              setFormModalOpen(true);
              setSelectedCountdown(null);
            }}
            onDuplicate={() => {
              const dup = duplicateCountdown(selectedCountdown.id);
              if (dup) {
                showToast(`Duplicated "${selectedCountdown.title}".`);
                setSelectedCountdown(dup);
              }
            }}
            onDelete={() => {
              deleteCountdown(selectedCountdown.id);
              showToast(`Deleted "${selectedCountdown.title}".`);
              setSelectedCountdown(null);
            }}
            onTogglePin={() => {
              togglePin(selectedCountdown.id);
              setSelectedCountdown((curr) =>
                curr ? { ...curr, pinned: !curr.pinned } : null
              );
            }}
            onToggleShowOnToday={() => {
              toggleShowOnToday(selectedCountdown.id);
              setSelectedCountdown((curr) =>
                curr ? { ...curr, showOnToday: !curr.showOnToday } : null
              );
            }}
            onToast={showToast}
          />
        ) : null}

        {/* Delete Confirmation Modal */}
        {deleteConfirmTarget ? (
          <ConfirmModal
            title={`Delete "${deleteConfirmTarget.title}"?`}
            message="This countdown will be permanently removed."
            confirmLabel="Delete"
            danger
            onConfirm={() => {
              deleteCountdown(deleteConfirmTarget.id);
              showToast(`Deleted "${deleteConfirmTarget.title}".`);
              setDeleteConfirmTarget(null);
            }}
            onCancel={() => setDeleteConfirmTarget(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact Glanceable Countdown Widget Card
 *
 * Structure:
 * ┌────────────────────────────────────┐
 * │ 🎯  21 DAYS LEFT               ⋮  │
 * │     SBI PO 2027                    │
 * │     21 Oct 2026 · Active           │
 * └────────────────────────────────────┘
 */
interface CompactCountdownCardProps {
  countdown: Countdown;
  today: string;
  onOpen: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onToggleShowOnToday: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function CompactCountdownCard({
  countdown,
  today,
  onOpen,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onTogglePin,
  onToggleShowOnToday,
  onDuplicate,
  onDelete
}: CompactCountdownCardProps) {
  const status = computeCountdownStatus(countdown, today);
  const isCompleted = countdown.mode !== "countup" && status.phase === "completed";
  const { text: statusText, variant } = getStatusText(countdown, status);
  const formattedDate = formatCardDate(countdown.targetDate);
  const statusLabel = isCompleted ? "Completed" : "Active";

  return (
    <div
      className={`countdown-widget-card ${isCompleted ? "is-completed" : ""}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${countdown.title}, ${statusText}, ${formattedDate}`}
    >
      {/* Top Row: Icon + Status on Left, Overflow Menu on Right */}
      <div className="countdown-widget-top">
        <div className="countdown-widget-left">
          <span className="countdown-widget-icon" aria-hidden="true">
            {countdown.icon || "🎯"}
          </span>
          <span className={`countdown-widget-status status-${variant}`}>
            {statusText}
          </span>
          {countdown.pinned ? (
            <span className="countdown-widget-badge-pill">PINNED</span>
          ) : null}
          {countdown.showOnToday ? (
            <span
              className="countdown-widget-today-pill"
              title="Shown on Today screen"
            >
              TODAY
            </span>
          ) : null}
        </div>

        {/* Overflow Menu Trigger */}
        <div
          className="countdown-widget-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="countdown-widget-menu-btn"
            onClick={onToggleMenu}
            aria-label={`Options for ${countdown.title}`}
            aria-expanded={isMenuOpen}
          >
            ⋮
          </button>

          {/* Overflow Menu Dropdown */}
          {isMenuOpen ? (
            <div
              className="countdown-overflow-dropdown"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="countdown-menu-item"
                onClick={onTogglePin}
              >
                <span>📌</span>
                <span>{countdown.pinned ? "Unpin" : "Pin to top"}</span>
              </button>

              <button
                type="button"
                className="countdown-menu-item"
                onClick={onToggleShowOnToday}
              >
                <span>📅</span>
                <span>{countdown.showOnToday ? "Hide from Today" : "Show on Today"}</span>
              </button>

              <button
                type="button"
                className="countdown-menu-item"
                onClick={onEdit}
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>

              <button
                type="button"
                className="countdown-menu-item"
                onClick={onDuplicate}
              >
                <span>📋</span>
                <span>Duplicate</span>
              </button>

              <button
                type="button"
                className="countdown-menu-item countdown-menu-item-danger"
                onClick={onDelete}
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Row 2: Title */}
      <div className="countdown-widget-title" title={countdown.title}>
        {countdown.title}
      </div>

      {/* Row 3: Target date · Status */}
      <div className="countdown-widget-date">
        {formattedDate} · {statusLabel}
      </div>
    </div>
  );
}
