import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import FlashBanner from "../components/FlashBanner";
import "./MyEvents.css";

function MyEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "attending" ? "attending" : "hosting");
  const [flash, setFlash] = useState(location.state?.flash || "");

  // Hosting — events this user created.
  const [hostedEvents, setHostedEvents] = useState([]);
  const [hostedLoading, setHostedLoading] = useState(true);
  const [hostedError, setHostedError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Attending — events this user booked a spot at.
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);

  // Clear the router state once we've captured it so refreshing or
  // navigating back doesn't re-show the same success message.
  useEffect(() => {
    if (location.state?.flash) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "attending" ? { tab: "attending" } : {}, { replace: true });
  };

  const loadHostedEvents = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/my-events" } });
      return;
    }

    setHostedLoading(true);
    setHostedError("");
    try {
      const response = await fetch("/api/events/mine/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setHostedError(data.message || "Could not load your events.");
        return;
      }
      setHostedEvents(data.events || []);
    } catch (err) {
      setHostedError("Something went wrong loading your events.");
    } finally {
      setHostedLoading(false);
    }
  }, [navigate]);

  const loadBookings = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/my-events?tab=attending" } });
      return;
    }

    setBookingsLoading(true);
    setBookingsError("");
    try {
      const response = await fetch("/api/bookings/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setBookingsError(data.message || "Could not load your tickets.");
        return;
      }
      setBookings(data.bookings || []);
      setBookingsLoaded(true);
    } catch (err) {
      setBookingsError("Something went wrong loading your tickets.");
    } finally {
      setBookingsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadHostedEvents();
  }, [loadHostedEvents]);

  // Lazy-load the Attending tab the first time it's opened.
  useEffect(() => {
    if (activeTab === "attending" && !bookingsLoaded) {
      loadBookings();
    }
  }, [activeTab, bookingsLoaded, loadBookings]);

  const handleDelete = async (eventId, title) => {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;

    const token = localStorage.getItem("token");
    setDeletingId(eventId);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setHostedError(data.message || "Could not delete event.");
        return;
      }
      setHostedEvents((prev) => prev.filter((ev) => ev.event_id !== eventId));
    } catch (err) {
      setHostedError("Something went wrong deleting the event.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;

    const token = localStorage.getItem("token");
    setCancelingId(bookingId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setBookingsError(data.message || "Could not cancel booking.");
        return;
      }
      setBookings((prev) =>
        prev.map((b) => (b.booking_id === bookingId ? { ...b, status: "cancelled" } : b))
      );
    } catch (err) {
      setBookingsError("Something went wrong cancelling the booking.");
    } finally {
      setCancelingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="my-events-page">
      <Navbar />

      <div className="my-events-content">
        <div className="my-events-header">
          <h1 className="my-events-title">My Events & Tickets</h1>
          {activeTab === "hosting" && (
            <div className="my-events-header-actions">
              <button className="my-events-profile-btn" onClick={() => navigate("/organiser-profile/edit")}>
                Organizer Profile
              </button>
              <button className="my-events-create-btn" onClick={() => navigate("/create-event")}>
                + Create Event
              </button>
            </div>
          )}
        </div>

        <div className="my-events-tabs">
          <button
            className={`my-events-tab ${activeTab === "hosting" ? "active" : ""}`}
            onClick={() => switchTab("hosting")}
          >
            Hosting
          </button>
          <button
            className={`my-events-tab ${activeTab === "attending" ? "active" : ""}`}
            onClick={() => switchTab("attending")}
          >
            Attending
          </button>
        </div>

        <FlashBanner message={flash} onDismiss={() => setFlash("")} />

        {activeTab === "hosting" && (
          <>
            {hostedLoading && <p className="my-events-status">Loading your events...</p>}
            {!hostedLoading && hostedError && <p className="my-events-status my-events-status--error">{hostedError}</p>}

            {!hostedLoading && !hostedError && hostedEvents.length === 0 && (
              <div className="my-events-empty">
                <p>You haven't created any events yet.</p>
                <button className="my-events-create-btn" onClick={() => navigate("/create-event")}>
                  Create your first event
                </button>
              </div>
            )}

            {!hostedLoading && !hostedError && hostedEvents.length > 0 && (
              <div className="my-events-list">
                {hostedEvents.map((ev) => (
                  <div key={ev.event_id} className="my-event-row">
                    <div
                      className="my-event-thumb"
                      style={ev.image_url ? { backgroundImage: `url(${ev.image_url})` } : undefined}
                    />
                    <div className="my-event-info">
                      <div className="my-event-top">
                        <h3 className="my-event-title">{ev.title}</h3>
                        <span className={`my-event-status my-event-status--${ev.status}`}>{ev.status}</span>
                      </div>
                      <div className="my-event-meta">
                        {ev.category_group && <span>{ev.category_group}</span>}
                        {formatDate(ev.start_date) && <span>{formatDate(ev.start_date)}</span>}
                        {ev.venue_name && <span>{ev.venue_name}</span>}
                      </div>
                    </div>
                    <div className="my-event-actions">
                      <button className="my-event-view-btn" onClick={() => navigate(`/events/${ev.event_id}`)}>
                        View
                      </button>
                      <button className="my-event-edit-btn" onClick={() => navigate(`/edit-event/${ev.event_id}`)}>
                        Edit
                      </button>
                      <button
                        className="my-event-delete-btn"
                        onClick={() => handleDelete(ev.event_id, ev.title)}
                        disabled={deletingId === ev.event_id}
                      >
                        {deletingId === ev.event_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "attending" && (
          <>
            {bookingsLoading && <p className="my-events-status">Loading your tickets...</p>}
            {!bookingsLoading && bookingsError && <p className="my-events-status my-events-status--error">{bookingsError}</p>}

            {!bookingsLoading && !bookingsError && bookings.length === 0 && (
              <div className="my-events-empty">
                <p>You haven't booked any events yet.</p>
                <button className="my-events-create-btn" onClick={() => navigate("/events")}>
                  Explore events to book
                </button>
              </div>
            )}

            {!bookingsLoading && !bookingsError && bookings.length > 0 && (
              <div className="my-events-list">
                {bookings.map((b) => (
                  <div key={b.booking_id} className="my-event-row">
                    <div
                      className="my-event-thumb"
                      style={b.image_url ? { backgroundImage: `url(${b.image_url})` } : undefined}
                    />
                    <div className="my-event-info">
                      <div className="my-event-top">
                        <h3 className="my-event-title">{b.title}</h3>
                        <span className={`my-event-status my-event-status--${b.status}`}>{b.status}</span>
                      </div>
                      <div className="my-event-meta">
                        {formatDate(b.start_date) && <span>{formatDate(b.start_date)}</span>}
                        {b.venue_name && <span>{b.venue_name}</span>}
                        <span>{b.quantity} spot{b.quantity === 1 ? "" : "s"}</span>
                        <span>Ref: {b.reference_code}</span>
                      </div>
                    </div>
                    <div className="my-event-actions">
                      <button className="my-event-view-btn" onClick={() => navigate(`/events/${b.event_id}`)}>
                        View
                      </button>
                      {b.status === "confirmed" && (
                        <button
                          className="my-event-delete-btn"
                          onClick={() => handleCancelBooking(b.booking_id)}
                          disabled={cancelingId === b.booking_id}
                        >
                          {cancelingId === b.booking_id ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MyEvents;
