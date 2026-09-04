import { useNavigate } from "react-router-dom";
import "./EventCard.css";

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

// This event card is used in both ExploreEvents and SavedEvents
// so both pages keep the same design.
// saved and onToggleSave are optional.
// If they are not provided, the heart button will not appear.

function EventCard({ event, saved = false, onToggleSave, savePending = false }) {
  const navigate = useNavigate();

  const handleToggleSave = (e) => {
    e.stopPropagation();
    onToggleSave?.(event.event_id, !saved);
  };

  return (
    <div className="event-card" onClick={() => navigate(`/events/${event.event_id}`)}>
      <div
        className="event-card-image"
        style={event.image_url ? { backgroundImage: `url(${event.image_url})` } : undefined}
      >
        {!event.image_url && <span className="event-card-noimage">No image</span>}

        {onToggleSave && (
          <button
            className={`event-card-save-btn ${saved ? "saved" : ""}`}
            onClick={handleToggleSave}
            disabled={savePending}
            aria-label={saved ? "Unsave event" : "Save event"}
            title={saved ? "Unsave event" : "Save event"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </button>
        )}
      </div>
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        {event.category && <span className="event-card-category">{event.category}</span>}
        {formatDate(event.start_date) && (
          <p className="event-card-date">{formatDate(event.start_date)}</p>
        )}
        {event.venue_name && <p className="event-card-venue">{event.venue_name}</p>}
      </div>
    </div>
  );
}

export default EventCard;
