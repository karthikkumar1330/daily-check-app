import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdowns } from "../../hooks/useCountdowns";
import type { Countdown } from "../../types";
import {
  computeCountdownStatus,
  formatFullTargetDate,
  formatSmartTargetDate
} from "../../utils/countdownUtils";
import { todayStr } from "../../utils/dateUtils";
import CountdownFormModal from "./CountdownFormModal";
import CountdownDetailModal from "./CountdownDetailModal";
import { BackIcon } from "../../components/icons";
import ConfirmModal from "../../components/Modals/ConfirmModal";

type FilterTab = "all" | "active" | "completed";
type SortOption = "target_asc" | "target_desc" | "pinned" | "recent";

async function shareCountdownSummary(countdown: Countdown, onToast: (msg: string) => void) {
  const status = computeCountdownStatus(countdown, todayStr());
  const dateFormatted = formatFullTargetDate(countdown.targetDate);
  const text = `${countdown.icon} ${countdown.title}\n${status.displayValue} ${status.displayUnit}\nTarget: ${dateFormatted}\n— via Daily Check`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: countdown.title,
        text
      });
      onToast("Shared countdown.");
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    onToast("Copied countdown summary to clipboard!");
  } catch {
    onToast("Unable to share countdown.");
  }
}

export default function CountdownPage() {
  const navigate = useNavigate();
  const {
    countdowns,
    activeCountdowns,
    completedCountdowns,
    featuredCountdown,
    createCountdown,
    updateCountdown,
    deleteCountdown,
    duplicateCountdown,
    togglePin,
    toggleFeatured,
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
  const {
    featuredItem,
    pinnedCountdowns,
    regularActiveCountdowns,
    displayedCompleted
  } = useMemo(() => {
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

    // Rule 11: Only feature if user explicitly marked one as featured
    let hero: Countdown | null = null;
    let nonFeaturedActive = matchedActive;

    if (featuredCountdown && matchedActive.some((c) => c.id === featuredCountdown.id)) {
      hero = featuredCountdown;
      nonFeaturedActive = matchedActive.filter((c) => c.id !== featuredCountdown.id);
    }

    const pinned = nonFeaturedActive.filter((c) => c.pinned);
    const regular = nonFeaturedActive.filter((c) => !c.pinned);

    return {
      featuredItem: hero,
      pinnedCountdowns: pinned,
      regularActiveCountdowns: regular,
      displayedCompleted: matchedCompleted
    };
  }, [activeCountdowns, completedCountdowns, featuredCountdown, searchQuery, sortBy]);

  const totalVisibleCount =
    filterTab === "completed"
      ? displayedCompleted.length
      : filterTab === "active"
      ? (featuredItem ? 1 : 0) + pinnedCountdowns.length + regularActiveCountdowns.length
      : (featuredItem ? 1 : 0) + pinnedCountdowns.length + regularActiveCountdowns.length + displayedCompleted.length;

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

        {/* Clean Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "0 0 4px"
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
            <div>
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
            <span>+</span>
            <span>New</span>
          </button>
        </div>

        {/* Header Subtitle */}
        <div
          style={{
            fontSize: 13,
            color: "var(--ink-muted)",
            fontWeight: 500,
            margin: "0 0 16px 48px"
          }}
        >
          Important dates, at a glance
        </div>

        {/* Global Empty State (Zero Countdowns) */}
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
              Track an exam, trip, milestone or important date.
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
            {/* Search Input */}
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
                🔍
              </span>
              <input
                type="search"
                className="input"
                placeholder="Search countdowns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 42,
                  height: 42,
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
                marginBottom: 16,
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
                  <option value="pinned">Pinned first ▾</option>
                  <option value="recent">Recently added ▾</option>
                </select>
              </div>
            </div>

            {/* No Search Matches */}
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
                <div>Try another search term.</div>
              </div>
            ) : null}

            {/* FEATURED HERO SECTION (Rule 10 & 11: Only shown if user explicitly featured one) */}
            {filterTab !== "completed" && featuredItem ? (
              <div style={{ marginBottom: 18 }}>
                <div className="countdown-section-label">FEATURED</div>
                <FeaturedHeroCard
                  countdown={featuredItem}
                  today={today}
                  onOpen={() => setSelectedCountdown(featuredItem)}
                  isMenuOpen={menuOpenId === featuredItem.id}
                  onToggleMenu={() =>
                    setMenuOpenId((curr) => (curr === featuredItem.id ? null : featuredItem.id))
                  }
                  onEdit={() => {
                    setMenuOpenId(null);
                    setEditingCountdown(featuredItem);
                    setFormModalOpen(true);
                  }}
                  onToggleFeature={() => {
                    setMenuOpenId(null);
                    toggleFeatured(featuredItem.id);
                    showToast("Removed from Featured.");
                  }}
                  onTogglePin={() => {
                    setMenuOpenId(null);
                    togglePin(featuredItem.id);
                    showToast(featuredItem.pinned ? "Unpinned." : "Pinned to top.");
                  }}
                  onToggleShowOnToday={() => {
                    setMenuOpenId(null);
                    toggleShowOnToday(featuredItem.id);
                    showToast(
                      featuredItem.showOnToday ? "Hidden from Today." : "Shown on Today screen."
                    );
                  }}
                  onDuplicate={() => {
                    setMenuOpenId(null);
                    duplicateCountdown(featuredItem.id);
                    showToast(`Duplicated "${featuredItem.title}".`);
                  }}
                  onShare={() => {
                    setMenuOpenId(null);
                    shareCountdownSummary(featuredItem, showToast);
                  }}
                  onDelete={() => {
                    setMenuOpenId(null);
                    setDeleteConfirmTarget(featuredItem);
                  }}
                />
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
                      onToggleFeature={() => {
                        setMenuOpenId(null);
                        toggleFeatured(item.id);
                        showToast(item.featured ? "Removed from Featured." : "Set as Featured hero.");
                      }}
                      onTogglePin={() => {
                        setMenuOpenId(null);
                        togglePin(item.id);
                        showToast("Unpinned countdown.");
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
                      onShare={() => {
                        setMenuOpenId(null);
                        shareCountdownSummary(item, showToast);
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
                  {pinnedCountdowns.length > 0 || featuredItem ? "UPCOMING" : "ALL COUNTDOWNS"}
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
                      onToggleFeature={() => {
                        setMenuOpenId(null);
                        toggleFeatured(item.id);
                        showToast(item.featured ? "Removed from Featured." : "Set as Featured hero.");
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
                      onShare={() => {
                        setMenuOpenId(null);
                        shareCountdownSummary(item, showToast);
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

            {/* COMPLETED SECTION (Visually quieter, no negative numbers ever) */}
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
                      onToggleFeature={() => {
                        setMenuOpenId(null);
                        toggleFeatured(item.id);
                        showToast(item.featured ? "Removed from Featured." : "Set as Featured hero.");
                      }}
                      onTogglePin={() => {
                        setMenuOpenId(null);
                        togglePin(item.id);
                        showToast(item.pinned ? "Unpinned." : "Pinned to top.");
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
                      onShare={() => {
                        setMenuOpenId(null);
                        shareCountdownSummary(item, showToast);
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
            onToggleFeatured={() => {
              toggleFeatured(selectedCountdown.id);
              setSelectedCountdown((curr) =>
                curr ? { ...curr, featured: !curr.featured } : null
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
 * Featured Hero Card Component (Section 10 & 11)
 *
 * Structure:
 * ┌────────────────────────────────────┐
 * │ 🎓                              ⋮  │
 * │                                    │
 * │ 21 DAYS LEFT                       │
 * │ SBI PO Exam                        │
 * │ 21 October 2026 · Active           │
 * │                                    │
 * │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
 * └────────────────────────────────────┘
 */
interface CardProps {
  countdown: Countdown;
  today: string;
  onOpen: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onToggleFeature: () => void;
  onTogglePin: () => void;
  onToggleShowOnToday: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
}

function FeaturedHeroCard({
  countdown,
  today,
  onOpen,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onToggleFeature,
  onTogglePin,
  onToggleShowOnToday,
  onDuplicate,
  onShare,
  onDelete
}: CardProps) {
  const status = computeCountdownStatus(countdown, today);
  const isCompleted = status.phase === "completed";
  const dateFormatted = formatSmartTargetDate(countdown.targetDate, today);
  const statusLabel = isCompleted ? "Completed" : "Active";

  const statusText = status.displayUnit
    ? `${status.displayValue} ${status.displayUnit}`
    : status.displayValue;

  return (
    <div
      className="countdown-hero-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Featured: ${countdown.title}, ${statusText}, ${dateFormatted}`}
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--accent, #10b981)",
        borderRadius: 16,
        padding: "16px 16px 14px",
        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.08)",
        cursor: "pointer",
        position: "relative",
        userSelect: "none",
        transition: "transform 0.12s ease"
      }}
    >
      {/* Top Row: Icon on left, Overflow menu on right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 26 }} aria-hidden="true">
            {countdown.icon}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--accent, #10b981)"
            }}
          >
            FEATURED
          </span>
          {countdown.pinned ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 6,
                background: "var(--surface-hover)",
                color: "var(--ink-muted)",
                border: "1px solid var(--border)"
              }}
            >
              PINNED
            </span>
          ) : null}
        </div>

        {/* Overflow Menu Button */}
        <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
          <button
            type="button"
            className="countdown-widget-menu-btn"
            onClick={onToggleMenu}
            aria-label={`Options for ${countdown.title}`}
            aria-expanded={isMenuOpen}
          >
            ⋮
          </button>

          {isMenuOpen ? (
            <CardOverflowDropdown
              countdown={countdown}
              onToggleFeature={onToggleFeature}
              onTogglePin={onTogglePin}
              onToggleShowOnToday={onToggleShowOnToday}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onShare={onShare}
              onDelete={onDelete}
            />
          ) : null}
        </div>
      </div>

      {/* Countdown Number (Strongest visual element) */}
      <div
        style={{
          fontSize: "clamp(26px, 7vw, 34px)",
          fontWeight: 800,
          color: isCompleted ? "var(--ink-muted)" : "var(--ink)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: 4
        }}
      >
        {statusText}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--ink)",
          marginBottom: 3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {countdown.title}
      </div>

      {/* Target date · status */}
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--ink-muted)",
          marginBottom: status.hasMeaningfulProgress ? 12 : 0
        }}
      >
        {dateFormatted} · {statusLabel}
      </div>

      {/* Meaningful Progress Bar */}
      {status.hasMeaningfulProgress ? (
        <div
          style={{
            width: "100%",
            height: 5,
            background: "var(--surface-hover)",
            borderRadius: 3,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${status.progressPct}%`,
              height: "100%",
              background: "var(--accent, #10b981)",
              borderRadius: 3
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Compact Glanceable Countdown Widget Card (Section 12 & 13)
 * Target height ~80–100px
 *
 * Structure:
 * ┌────────────────────────────────────┐
 * │ 🎯  21 DAYS LEFT               ⋮  │
 * │     SBI PO 2027                    │
 * │     21 Oct 2026 · Active           │
 * └────────────────────────────────────┘
 */
function CompactCountdownCard({
  countdown,
  today,
  onOpen,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onToggleFeature,
  onTogglePin,
  onToggleShowOnToday,
  onDuplicate,
  onShare,
  onDelete
}: CardProps) {
  const status = computeCountdownStatus(countdown, today);
  const isCompleted = status.phase === "completed";
  const dateFormatted = formatSmartTargetDate(countdown.targetDate, today);
  const statusLabel = isCompleted ? "Completed" : "Active";

  const statusText = status.displayUnit
    ? `${status.displayValue} ${status.displayUnit}`
    : status.displayValue;

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
      aria-label={`${countdown.title}, ${statusText}, ${dateFormatted}`}
    >
      {/* Top Row: Icon + Status on Left, Overflow Menu on Right */}
      <div className="countdown-widget-top">
        <div className="countdown-widget-left">
          <span className="countdown-widget-icon" aria-hidden="true">
            {countdown.icon || "🎯"}
          </span>
          <span className={`countdown-widget-status ${isCompleted ? "status-completed" : "status-upcoming"}`}>
            {isCompleted ? "✓ COMPLETED" : statusText}
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
            <CardOverflowDropdown
              countdown={countdown}
              onToggleFeature={onToggleFeature}
              onTogglePin={onTogglePin}
              onToggleShowOnToday={onToggleShowOnToday}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onShare={onShare}
              onDelete={onDelete}
            />
          ) : null}
        </div>
      </div>

      {/* Row 2: Title */}
      <div className="countdown-widget-title" title={countdown.title}>
        {countdown.title}
      </div>

      {/* Row 3: Target date · Status */}
      <div className="countdown-widget-date">
        {dateFormatted} · {statusLabel}
      </div>
    </div>
  );
}

/**
 * Reusable Card Overflow Dropdown Menu (Section 15)
 */
function CardOverflowDropdown({
  countdown,
  onToggleFeature,
  onTogglePin,
  onToggleShowOnToday,
  onEdit,
  onDuplicate,
  onShare,
  onDelete
}: {
  countdown: Countdown;
  onToggleFeature: () => void;
  onTogglePin: () => void;
  onToggleShowOnToday: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="countdown-overflow-dropdown" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="countdown-menu-item" onClick={onToggleFeature}>
        <span>⭐</span>
        <span>{countdown.featured ? "Remove from Featured" : "Feature"}</span>
      </button>

      <button type="button" className="countdown-menu-item" onClick={onTogglePin}>
        <span>📌</span>
        <span>{countdown.pinned ? "Unpin" : "Pin"}</span>
      </button>

      <button type="button" className="countdown-menu-item" onClick={onToggleShowOnToday}>
        <span>🎯</span>
        <span>{countdown.showOnToday ? "Hide from Today" : "Show on Today"}</span>
      </button>

      <button type="button" className="countdown-menu-item" onClick={onEdit}>
        <span>✏️</span>
        <span>Edit</span>
      </button>

      <button type="button" className="countdown-menu-item" onClick={onDuplicate}>
        <span>📋</span>
        <span>Duplicate</span>
      </button>

      <button type="button" className="countdown-menu-item" onClick={onShare}>
        <span>↗</span>
        <span>Share</span>
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
  );
}
