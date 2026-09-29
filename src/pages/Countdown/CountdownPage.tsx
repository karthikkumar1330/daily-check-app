import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdowns } from "../../hooks/useCountdowns";
import type { Countdown } from "../../types";
import { computeCountdownStatus } from "../../utils/countdownUtils";
import { formatShort, todayStr } from "../../utils/dateUtils";
import CountdownFormModal from "./CountdownFormModal";
import CountdownDetailModal from "./CountdownDetailModal";
import { BackIcon } from "../../components/icons";
import ConfirmModal from "../../components/Modals/ConfirmModal";

type FilterTab = "all" | "active" | "completed";
type SortOption = "target_asc" | "target_desc" | "pinned" | "recent";

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
    (filterTab === "completed"
      ? displayedCompleted.length
      : filterTab === "active"
      ? pinnedCountdowns.length + regularActiveCountdowns.length
      : pinnedCountdowns.length + regularActiveCountdowns.length + displayedCompleted.length);

  return (
    <div className="page countdown-page" style={{ paddingBottom: 64 }}>
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

      {/* Header: Countdowns   + New */}
      <div
        className="section-row"
        style={{
          margin: "0 0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
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
          <h1 className="page-title" style={{ margin: 0, fontSize: 24 }}>
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
            padding: "0 16px",
            minHeight: 40,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent, #10b981)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            borderRadius: 12,
            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
          }}
          aria-label="Create new countdown"
        >
          <span>+ New</span>
        </button>
      </div>

      {/* Zero Countdowns Empty State (Compact & Vertically Balanced) */}
      {countdowns.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "44px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            marginTop: 16
          }}
        >
          <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden="true">
            🎯
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
              color: "var(--ink)",
              letterSpacing: "-0.01em"
            }}
          >
            No countdowns yet
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-muted)",
              margin: 0,
              maxWidth: 300,
              lineHeight: 1.5
            }}
          >
            Create a countdown for an exam, trip, deadline, milestone, birthday or goal.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingCountdown(null);
              setFormModalOpen(true);
            }}
            style={{
              marginTop: 6,
              minHeight: 44,
              padding: "0 20px",
              background: "var(--accent, #10b981)",
              color: "#fff",
              fontWeight: 700,
              borderRadius: 12
            }}
          >
            + Create Countdown
          </button>
        </div>
      ) : (
        <>
          {/* Search Box */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="search"
              className="input"
              placeholder="Search countdowns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                minHeight: 42,
                fontSize: 14,
                borderRadius: 12,
                padding: "0 14px"
              }}
              aria-label="Search countdowns"
            />
          </div>

          {/* Filter Pills & Subtle Sort */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 20
            }}
          >
            {/* Filter Pills: [ All ] [ Active ] [ Completed ] */}
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

            {/* Subtle Sort Control */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{
                  minHeight: 34,
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "0 8px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--ink-muted)",
                  cursor: "pointer"
                }}
                aria-label="Sort countdowns"
              >
                <option value="target_asc">Sort: Target date ▾</option>
                <option value="target_desc">Sort: Latest date ▾</option>
                <option value="pinned">Sort: Pinned first ▾</option>
                <option value="recent">Sort: Recently added ▾</option>
              </select>
            </div>
          </div>

          {/* No matches for search */}
          {totalVisibleCount === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 16px",
                color: "var(--ink-muted)",
                fontSize: 14
              }}
            >
              No countdowns found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : null}

          {/* ========================================================
              SECTION: PINNED COUNTDOWNS (Hero Card layout)
             ======================================================== */}
          {filterTab !== "completed" && pinnedCountdowns.length > 0 ? (
            <div style={{ marginBottom: 28 }} ref={menuContainerRef}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 10,
                  paddingLeft: 2
                }}
              >
                PINNED
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {pinnedCountdowns.map((item) => (
                  <HeroCountdownCard
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

          {/* ========================================================
              SECTION: ALL / ACTIVE COUNTDOWNS
             ======================================================== */}
          {filterTab !== "completed" && regularActiveCountdowns.length > 0 ? (
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 10,
                  paddingLeft: 2
                }}
              >
                {pinnedCountdowns.length > 0 ? "ALL COUNTDOWNS" : "ACTIVE COUNTDOWNS"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {regularActiveCountdowns.map((item) => (
                  <HeroCountdownCard
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

          {/* ========================================================
              SECTION: COMPLETED COUNTDOWNS
             ======================================================== */}
          {(filterTab === "all" || filterTab === "completed") &&
          displayedCompleted.length > 0 ? (
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 10,
                  paddingLeft: 2
                }}
              >
                COMPLETED ({displayedCompleted.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displayedCompleted.map((item) => {
                  return (
                    <HeroCountdownCard
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
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Form Modal (Create / Edit) */}
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

      {/* Detail Modal */}
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

      {/* Delete Confirmation */}
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
  );
}

/**
 * Modern Hero Countdown Card
 * The countdown number is the visual hero!
 */
interface HeroCountdownCardProps {
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

function HeroCountdownCard({
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
}: HeroCountdownCardProps) {
  const status = computeCountdownStatus(countdown, today);
  const isCompleted = countdown.mode !== "countup" && status.phase === "completed";
  const isToday = status.phase === "today";
  const isCountUp = countdown.mode === "countup";

  return (
    <div
      className="card countdown-hero-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{
        padding: "18px 20px",
        borderRadius: 18,
        cursor: "pointer",
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)"
      }}
      aria-label={`${countdown.title}, ${
        isCompleted
          ? "Completed"
          : isToday
          ? "Today"
          : isCountUp
          ? `${status.displayValue} days`
          : `${status.displayValue} ${status.displayUnit || "days left"}`
      }`}
    >
      {/* Top Header: Icon + Name on left; Subtle Pin + Overflow Menu on right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            flex: 1
          }}
        >
          <span style={{ fontSize: 24, flexShrink: 0 }} aria-hidden="true">
            {countdown.icon}
          </span>
          <div
            style={{
              fontSize: 16.5,
              fontWeight: 700,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em"
            }}
          >
            {countdown.title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            position: "relative"
          }}
        >
          {countdown.pinned ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--accent, #10b981)"
              }}
            >
              PINNED
            </span>
          ) : null}

          {countdown.showOnToday ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 8,
                background: "var(--surface-hover)",
                color: "var(--ink-muted)",
                border: "1px solid var(--border)"
              }}
              title="Shown on Today screen"
            >
              TODAY
            </span>
          ) : null}

          {/* Overflow Menu Button */}
          <button
            type="button"
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            aria-label="Countdown actions"
            style={{
              width: 32,
              height: 32,
              fontSize: 18,
              borderRadius: 8,
              color: "var(--ink-muted)"
            }}
          >
            ⋮
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen ? (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: 36,
                right: 0,
                zIndex: 60,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                minWidth: 175,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <button
                type="button"
                onClick={onTogglePin}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <span>📌</span>
                <span>{countdown.pinned ? "Unpin" : "Pin to top"}</span>
              </button>

              <button
                type="button"
                onClick={onToggleShowOnToday}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <span>📅</span>
                <span>{countdown.showOnToday ? "Hide from Today" : "Show on Today"}</span>
              </button>

              <button
                type="button"
                onClick={onEdit}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={onDuplicate}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <span>📋</span>
                <span>Duplicate</span>
              </button>

              <button
                type="button"
                onClick={onDelete}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--danger, #ef4444)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Hero Number Section */}
      <div style={{ textAlign: "center", margin: "10px 0 16px" }}>
        {isCompleted ? (
          <div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "var(--ink-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase"
              }}
            >
              COMPLETED
            </div>
          </div>
        ) : isToday ? (
          <div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "var(--accent, #10b981)",
                letterSpacing: "-0.02em"
              }}
            >
              TODAY
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "clamp(36px, 9vw, 52px)",
                fontWeight: 800,
                lineHeight: 1,
                color: "var(--accent, #10b981)",
                letterSpacing: "-0.03em"
              }}
            >
              {status.displayValue}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                marginTop: 6
              }}
            >
              {isCountUp ? "DAYS" : status.displayUnit || "DAYS LEFT"}
            </div>
          </div>
        )}
      </div>

      {/* Target Date Below Number */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--ink-muted)",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span>
          {isCompleted
            ? `Target reached · ${formatShort(countdown.targetDate)}`
            : isCountUp
            ? `Since · ${formatShort(countdown.targetDate)}`
            : `Target · ${formatShort(countdown.targetDate)}`}
          {countdown.countWorkingDays ? " (work days)" : ""}
        </span>

        {/* Elapsed % indicator */}
        {!isCompleted ? (
          <span style={{ fontSize: 11.5, fontWeight: 600 }}>
            {status.progressPct}%
          </span>
        ) : null}
      </div>

      {/* Optional Progress Indicator */}
      <div
        style={{
          width: "100%",
          height: 6,
          background: "var(--surface-hover)",
          borderRadius: 3,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${status.progressPct}%`,
            height: "100%",
            background: isCompleted ? "var(--ink-muted)" : "var(--accent, #10b981)",
            borderRadius: 3,
            transition: "width 0.3s ease"
          }}
        />
      </div>
    </div>
  );
}
