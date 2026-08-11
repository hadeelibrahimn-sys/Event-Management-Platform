import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";
import { CATEGORY_GROUPS, slugifyGroup } from "../data/eventCategories";
import "./ExploreEvents.css";

function ExploreEvents() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());
  const [savePendingId, setSavePendingId] = useState(null);

  const categories = CATEGORY_GROUPS.filter((g) => g !== "Other");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("group", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/events?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not load events.");
        return;
      }
      setEvents(data.events || []);
    } catch (err) {
      setError("Something went wrong loading events.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Bulk-fetch which of these events the current user already saved, so
  // hearts render correctly without a request per card.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let cancelled = false;
    fetch("/api/saved-events/ids", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : { eventIds: [] }))
      .then((data) => {
        if (!cancelled) setSavedIds(new Set(data.eventIds || []));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleToggleSave = async (eventId, nextSaved) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/events" } });
      return;
    }

    setSavePendingId(eventId);
    // Optimistic update — flip it back if the request fails.
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(eventId); else next.delete(eventId);
      return next;
    });

    try {
      const response = await fetch(`/api/saved-events/${eventId}`, {
        method: nextSaved ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Request failed");
    } catch (err) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (nextSaved) next.delete(eventId); else next.add(eventId);
        return next;
      });
    } finally {
      setSavePendingId(null);
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setFreeOnly(false);
    setSearchQuery("");
    setSearchInput("");
  };

  const handleSeeResults = () => {
    setSearchQuery(searchInput);
  };

  return (
    <div className="explore-page">
      <Navbar />

      {/* Hero — CSS gradient background with geometric shapes, bounded to its own content height */}
      <div className="explore-hero">
        <div className="explore-hero-content">

          {/* Title */}
          <h1 className="explore-title">Explore Events</h1>

          {/* Category filter buttons */}
          <div className="explore-categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-btn category-btn--${slugifyGroup(cat)} ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Date/filter boxes + Free only checkbox */}
          <div className="explore-filters">
            <div className="filter-box" />
            <div className="filter-box" />
            <div className="filter-box" />
            <div className="free-only">
              <input
                type="checkbox"
                id="freeOnly"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
              />
              <label htmlFor="freeOnly">Free only</label>
            </div>
          </div>

          {/* Search bar + See results */}
          <div className="explore-search-row">
            <input
              type="text"
              className="explore-search-input"
              placeholder="Search events..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSeeResults()}
            />
            <button className="explore-search-btn" onClick={handleSeeResults}>See results</button>
          </div>

          {/* Clear filters */}
          <button className="explore-clear-btn" onClick={handleClearFilters}>
            Clear filters <span className="clear-icon">⊗</span>
          </button>

        </div>
      </div>

      {/* Results — flat background, consistent with the rest of the app */}
      <div className="explore-results-section">
        <div className="explore-results">
          {loading && <p className="event-list-status">Loading events...</p>}
          {!loading && error && <p className="event-list-status event-list-status--error">{error}</p>}
          {!loading && !error && events.length === 0 && (
            <p className="event-list-status">No events found.</p>
          )}
          {!loading && !error && events.length > 0 && (
            <div className="event-card-grid">
              {events.map((ev) => (
                <EventCard
                  key={ev.event_id}
                  event={ev}
                  saved={savedIds.has(ev.event_id)}
                  onToggleSave={handleToggleSave}
                  savePending={savePendingId === ev.event_id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExploreEvents;
