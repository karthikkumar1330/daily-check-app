import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdowns } from "../../hooks/useCountdowns";
import type { Countdown } from "../../types";
import { computeCountdownStatus } from "../../utils/countdownUtils";
import { formatLong, formatShort, todayStr } from "../../utils/dateUtils";
import CountdownFormModal from "./CountdownFormModal";
import CountdownDetailModal from "./CountdownDetailModal";
import { BackIcon } from "../../components/icons";

type SortOption = "soonest" | "latest" | "pinned" | "recently_added";

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
    toggleShowOnToday
  } = useCountdowns();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);
  const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("soonest");
  const [toast, setToast] = useState<string | null>(null);

  const today = todayStr();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  }

  // Filter and sort countdowns
  const { filteredActive, filteredCompleted } = useMemo(() => {
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
      if (sortBy === "latest") {
        return b.targetDate.localeCompare(a.targetDate);
      }
      if (sortBy === "recently_added") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      // "soonest" (default)
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.targetDate.localeCompare(b.targetDate);
    };

    const active = activeCountdowns.filter(matchesQuery).sort(sortFn);
    const completed = completedCountdowns.filter(matchesQuery).sort(sortFn);

    return { filteredActive: active, filteredCompleted: completed };
  }, [activeCountdowns, completedCountdowns, searchQuery, sortBy]);

  // Featured card (if not searching, use standard featured; if searching, use first match)
  const currentFeatured = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredActive[0] || null;
    }
    return featuredCountdown;
  }, [searchQuery, filteredActive, featuredCountdown]);

  // Remaining active items excluding the featured one
  const upcomingList = useMemo(() => {
    if (!currentFeatured) return filteredActive;
    return filteredActive.filter((c) => c.id !== currentFeatured.id);
  }, [filteredActive, currentFeatured]);

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

      {/* Header */}
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
            fontWeight: 600
          }}
          aria-label="Create new countdown"
        >
          <span>+ New</span>
        </button>
      </div>

      {/* Empty State when zero countdowns exist */}
      {countdowns.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            borderRadius: 16
          }}
        >
          <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">
            🎯
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
            No countdowns yet
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-muted)",
              margin: 0,
              maxWidth: 320,
              lineHeight: 1.5
            }}
          >
            Count down to an exam, trip, deadline, milestone, birthday, or anything important.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingCountdown(null);
              setFormModalOpen(true);
            }}
            style={{
              marginTop: 10,
              minHeight: 44,
              padding: "0 22px",
              background: "var(--accent, #10b981)",
              color: "#fff",
              fontWeight: 600
            }}
          >
            + Create Countdown
          </button>
        </div>
      ) : (
        <>
          {/* Search & Sort Controls (shown when there are >= 3 countdowns or search is active) */}
          {countdowns.length >= 3 || searchQuery ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
                alignItems: "center"
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <input
                  type="search"
                  className="input"
                  placeholder="Search countdowns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", minHeight: 38, fontSize: 13 }}
                  aria-label="Search countdowns"
                />
              </div>

              <div>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{ minHeight: 38, fontSize: 12.5, padding: "0 10px" }}
                  aria-label="Sort countdowns"
                >
                  <option value="soonest">Sort: Soonest</option>
                  <option value="latest">Sort: Latest</option>
                  <option value="pinned">Sort: Pinned first</option>
                  <option value="recently_added">Sort: Recently added</option>
                </select>
              </div>
            </div>
          ) : null}

          {/* FEATURED COUNTDOWN CARD */}
          {currentFeatured ? (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 8,
                  paddingLeft: 2
                }}
              >
                Featured
              </div>

              {(() => {
                const status = computeCountdownStatus(currentFeatured, today);
                return (
                  <div
                    className="card countdown-featured-card"
                    onClick={() => setSelectedCountdown(currentFeatured)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCountdown(currentFeatured);
                      }
                    }}
                    style={{
                      padding: "20px 22px",
                      borderRadius: 16,
                      background: "var(--surface)",
                      border: "1.5px solid var(--border)",
                      cursor: "pointer",
                      position: "relative",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease"
                    }}
                    aria-label={`Featured countdown: ${currentFeatured.title}, ${status.displayValue} ${status.displayUnit}`}
                  >
                    {/* Top Row: Icon + Title + Pin badge */}
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
                        <span style={{ fontSize: 26, flexShrink: 0 }} aria-hidden="true">
                          {currentFeatured.icon}
                        </span>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: "var(--ink)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {currentFeatured.title}
                        </div>
                      </div>

                      {currentFeatured.pinned ? (
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 12,
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "var(--accent, #10b981)",
                            flexShrink: 0
                          }}
                        >
                          Pinned
                        </span>
                      ) : null}
                    </div>

                    {/* Big Numbers Section */}
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: clampNumber(status.displayValue.length),
                          fontWeight: 800,
                          lineHeight: 1,
                          color: "var(--accent, #10b981)",
                          letterSpacing: "-0.02em"
                        }}
                      >
                        {status.displayValue}
                      </div>
                      {status.displayUnit ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                            marginTop: 6
                          }}
                        >
                          {status.displayUnit}
                        </div>
                      ) : null}
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "var(--ink-muted)",
                          marginTop: 6
                        }}
                      >
                        {formatLong(currentFeatured.targetDate)}
                        {currentFeatured.targetTime ? ` at ${currentFeatured.targetTime}` : ""}
                        {currentFeatured.countWorkingDays ? " (Working days)" : ""}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: "var(--ink-muted)",
                          marginBottom: 5
                        }}
                      >
                        <span>Timeline progress</span>
                        <span>{status.progressPct}% elapsed</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 7,
                          background: "var(--surface-hover)",
                          borderRadius: 4,
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: `${status.progressPct}%`,
                            height: "100%",
                            background: "var(--accent, #10b981)",
                            borderRadius: 4
                          }}
                        />
                      </div>
                    </div>

                    {/* Next Milestone Footer */}
                    {status.nextMilestone ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 12,
                          paddingTop: 10,
                          borderTop: "1px solid var(--border)",
                          color: "var(--ink-muted)"
                        }}
                      >
                        <span>
                          Next milestone: <strong style={{ color: "var(--ink)" }}>{status.nextMilestone.label}</strong>
                        </span>
                        <span style={{ color: "var(--accent, #10b981)", fontWeight: 600 }}>
                          View details &rarr;
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          ) : null}

          {/* UPCOMING COUNTDOWNS LIST */}
          {upcomingList.length > 0 ? (
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 8,
                  paddingLeft: 2
                }}
              >
                Upcoming ({upcomingList.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingList.map((item) => {
                  const status = computeCountdownStatus(item, today);
                  return (
                    <div
                      key={item.id}
                      className="card countdown-item-card"
                      onClick={() => setSelectedCountdown(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCountdown(item);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        borderRadius: 12,
                        cursor: "pointer",
                        gap: 12
                      }}
                      aria-label={`${item.title}, ${status.badgeText}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">
                          {item.icon}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--ink)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-muted)",
                              fontWeight: 500,
                              marginTop: 1
                            }}
                          >
                            {formatShort(item.targetDate)}
                            {item.countWorkingDays ? " · Working days" : ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--accent, #10b981)",
                            background: "rgba(16, 185, 129, 0.1)",
                            padding: "4px 8px",
                            borderRadius: 8
                          }}
                        >
                          {status.badgeText}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--ink-muted)" }} aria-hidden="true">
                          &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* PAST COUNTDOWNS LIST */}
          {filteredCompleted.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: 8,
                  paddingLeft: 2
                }}
              >
                Past Events ({filteredCompleted.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredCompleted.map((item) => (
                  <div
                    key={item.id}
                    className="card countdown-item-card"
                    onClick={() => setSelectedCountdown(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCountdown(item);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      opacity: 0.8,
                      gap: 12
                    }}
                    aria-label={`Past event: ${item.title}, completed ${formatShort(item.targetDate)}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true">
                        ✓
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: "var(--ink)",
                            textDecoration: "line-through",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>
                          Completed {formatShort(item.targetDate)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCountdown(item.id);
                        showToast(`Deleted "${item.title}".`);
                      }}
                      style={{ fontSize: 12, color: "var(--danger, #ef4444)", padding: "4px 6px" }}
                      aria-label={`Delete past event ${item.title}`}
                    >
                      Delete
                    </button>
                  </div>
                ))}
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
              showToast(`Created countdown "${data.title}".`);
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
    </div>
  );
}

function clampNumber(len: number): string {
  if (len <= 2) return "54px";
  if (len <= 4) return "44px";
  return "36px";
}
