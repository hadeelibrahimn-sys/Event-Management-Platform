import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";
import "./SavedEvents.css";

function SavedEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savePendingId, setSavePendingId] = useState(null);

  const loadSavedEvents = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/saved-events" } });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/saved-events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not load your saved events.");
        return;
      }
      setEvents(data.events || []);
    } catch (err) {
      setError("Something went wrong loading your saved events.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadSavedEvents();
  }, [loadSavedEvents]);

  // Unsaving here removes the card entirely rather than just flipping the
  // heart — this page is only ever showing saved events.
  const handleToggleSave = async (eventId, nextSaved) => {
    if (nextSaved) return; // cards here are always already saved

    const token = localStorage.getItem("token");
    setSavePendingId(eventId);
    const previousEvents = events;
    setEvents((prev) => prev.filter((ev) => ev.event_id !== eventId));

    try {
      const response = await fetch(`/api/saved-events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Request failed");
    } catch (err) {
      setEvents(previousEvents); // revert
    } finally {
      setSavePendingId(null);
    }
  };

  return (
    <div className="saved-events-page">
      <Navbar />

      <div className="saved-events-content">
        <div className="saved-events-header">
          <h1 className="saved-events-title">Saved Events</h1>
          <button className="saved-events-explore-btn" onClick={() => navigate("/events")}>
            Explore Events
          </button>
        </div>

        {loading && <p className="event-list-status">Loading your saved events...</p>}
        {!loading && error && <p className="event-list-status event-list-status--error">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <div className="saved-events-empty">
            <p>You haven't saved any events yet.</p>
            <button className="saved-events-explore-btn" onClick={() => navigate("/events")}>
              Explore events to save
            </button>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="event-card-grid">
            {events.map((ev) => (
              <EventCard
                key={ev.event_id}
                event={ev}
                saved={true}
                onToggleSave={handleToggleSave}
                savePending={savePendingId === ev.event_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedEvents;
