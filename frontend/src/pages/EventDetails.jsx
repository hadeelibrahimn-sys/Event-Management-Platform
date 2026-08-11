import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import FlashBanner from "../components/FlashBanner";
import "./EventDetails.css";

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(location.state?.flash || "");
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingResult, setBookingResult] = useState(null);

  // Clear the router state once captured so refreshing/back-navigating
  // doesn't re-show the same success message.
  useEffect(() => {
    if (location.state?.flash) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setError(data.message || "Event not found.");
          return;
        }
        if (!cancelled) setEvent(data.event);
      } catch (err) {
        if (!cancelled) setError("Something went wrong loading this event.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEvent();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let cancelled = false;
    fetch(`/api/saved-events/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : { saved: false }))
      .then((data) => { if (!cancelled) setSaved(!!data.saved); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const handleToggleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/events/${id}` } });
      return;
    }

    const nextSaved = !saved;
    setSavePending(true);
    setSaved(nextSaved); // optimistic
    try {
      const response = await fetch(`/api/saved-events/${id}`, {
        method: nextSaved ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Request failed");
    } catch (err) {
      setSaved(!nextSaved); // revert
    } finally {
      setSavePending(false);
    }
  };

  const remaining = event && event.max_participants != null
    ? event.max_participants - (event.booked_count || 0)
    : null;
  const isFull = remaining !== null && remaining <= 0;

  const handleBook = async () => {
    setBookingError("");
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/events/${id}` } });
      return;
    }

    if (!Number.isInteger(bookingQuantity) || bookingQuantity < 1) {
      setBookingError("Enter a valid number of spots.");
      return;
    }
    if (remaining !== null && bookingQuantity > remaining) {
      setBookingError(`Only ${remaining} spot${remaining === 1 ? "" : "s"} left.`);
      return;
    }

    setBooking(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id: id, quantity: bookingQuantity }),
      });
      const data = await response.json();

      if (!response.ok) {
        setBookingError(data.message || "Could not complete booking.");
        return;
      }

      setBookingResult({ reference_code: data.reference_code, quantity: data.quantity });
      setEvent((prev) => prev && ({ ...prev, booked_count: (prev.booked_count || 0) + bookingQuantity }));
    } catch (err) {
      setBookingError("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="ed-page">
      <Navbar />

      <div className="ed-content">
        <FlashBanner message={flash} onDismiss={() => setFlash("")} />

        {loading && <p className="ed-status">Loading event...</p>}
        {!loading && error && (
          <div className="ed-status-wrap">
            <p className="ed-status ed-status--error">{error}</p>
            <button className="ed-back-btn" onClick={() => navigate("/events")}>← Back to Explore Events</button>
          </div>
        )}

        {!loading && !error && event && (
          <>
            <button className="ed-back-link" onClick={() => navigate("/events")}>← Back to Explore Events</button>

            <div
              className="ed-banner"
              style={event.image_url ? { backgroundImage: `url(${event.image_url})` } : undefined}
            >
              {!event.image_url && <span className="ed-banner-noimage">No image</span>}
            </div>

            <div className="ed-body">
              <div className="ed-main">
                <div className="ed-tags-row">
                  <div>
                    {event.category_group && <span className="ed-category">{event.category_group}</span>}
                    {event.category && event.category !== event.category_group && (
                      <span className="ed-subcategory">{event.category.replace(/-/g, " ")}</span>
                    )}
                  </div>
                  <button
                    className={`ed-save-btn ${saved ? "saved" : ""}`}
                    onClick={handleToggleSave}
                    disabled={savePending}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                    </svg>
                    {saved ? "Saved" : "Save"}
                  </button>
                </div>
                <h1 className="ed-title">{event.title}</h1>

                {event.description && (
                  <p className="ed-description">{event.description}</p>
                )}
              </div>

              <div className="ed-sidebar">
                <div className="ed-book-card">
                  {bookingResult ? (
                    <div className="ed-book-success">
                      <p className="ed-book-success-title">You're booked!</p>
                      <p className="ed-book-success-detail">
                        {bookingResult.quantity} spot{bookingResult.quantity === 1 ? "" : "s"} reserved.
                      </p>
                      <p className="ed-book-reference">Reference: {bookingResult.reference_code}</p>
                      <button className="ed-book-tickets-link" onClick={() => navigate("/my-events?tab=attending")}>
                        View My Tickets →
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="ed-info-heading">
                        {remaining !== null ? `${Math.max(remaining, 0)} spots left` : "Reserve your spot"}
                      </h3>
                      {isFull ? (
                        <p className="ed-book-full">This event is fully booked.</p>
                      ) : (
                        <>
                          <div className="ed-book-qty-row">
                            <label className="ed-info-label" htmlFor="ed-book-qty">Spots</label>
                            <input
                              id="ed-book-qty"
                              type="number"
                              min={1}
                              max={remaining !== null ? remaining : undefined}
                              className="ed-book-qty-input"
                              value={bookingQuantity}
                              onChange={(e) => setBookingQuantity(parseInt(e.target.value, 10) || 1)}
                            />
                          </div>
                          {bookingError && <p className="ed-submit-error" style={{ textAlign: "left" }}>{bookingError}</p>}
                          <button className="ed-book-btn" onClick={handleBook} disabled={booking}>
                            {booking ? "Booking..." : "Reserve my spot"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="ed-info-card">
                  <h3 className="ed-info-heading">Event Details</h3>

                  {formatDate(event.start_date) && (
                    <div className="ed-info-row">
                      <span className="ed-info-label">Date</span>
                      <span className="ed-info-value">{formatDate(event.start_date)}</span>
                    </div>
                  )}

                  {(formatTime(event.start_time) || formatTime(event.end_time)) && (
                    <div className="ed-info-row">
                      <span className="ed-info-label">Time</span>
                      <span className="ed-info-value">
                        {formatTime(event.start_time)}
                        {formatTime(event.end_time) ? ` – ${formatTime(event.end_time)}` : ""}
                      </span>
                    </div>
                  )}

                  <div className="ed-info-row">
                    <span className="ed-info-label">Format</span>
                    <span className="ed-info-value">{event.format}</span>
                  </div>

                  {event.venue_name && (
                    <div className="ed-info-row">
                      <span className="ed-info-label">Venue</span>
                      <span className="ed-info-value">{event.venue_name}</span>
                    </div>
                  )}

                  {event.address && (
                    <div className="ed-info-row">
                      <span className="ed-info-label">Address</span>
                      <span className="ed-info-value">{event.address}</span>
                    </div>
                  )}

                  {event.max_participants && (
                    <div className="ed-info-row">
                      <span className="ed-info-label">Capacity</span>
                      <span className="ed-info-value">{event.max_participants} participants</span>
                    </div>
                  )}

                  {formatDate(event.registration_deadline) && (
                    <div className="ed-info-row">
                      <span className="ed-info-label">Register by</span>
                      <span className="ed-info-value">{formatDate(event.registration_deadline)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EventDetails;
