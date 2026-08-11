import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";
import "./OrganizerProfile.css";

function OrganizerProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const isOwnProfile = currentUser && organizer && currentUser.user_id === organizer.user_id;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/organisers/${userId}`);
        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setError(data.message || "Organizer not found.");
          return;
        }
        if (!cancelled) {
          setOrganizer(data.organizer);
          setEvents(data.events || []);
        }
      } catch (err) {
        if (!cancelled) setError("Something went wrong loading this organizer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleContact = async () => {
    setContactError("");
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/organisers/${userId}` } });
      return;
    }

    setContacting(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ other_user_id: userId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setContactError(data.message || "Could not start a conversation.");
        return;
      }
      navigate(`/messages/${data.conversation_id}`);
    } catch (err) {
      setContactError("Something went wrong. Please try again.");
    } finally {
      setContacting(false);
    }
  };

  return (
    <div className="op-page">
      <Navbar />

      <div className="op-content">
        {loading && <p className="event-list-status">Loading organizer...</p>}
        {!loading && error && (
          <div className="op-status-wrap">
            <p className="event-list-status event-list-status--error">{error}</p>
            <button className="op-back-btn" onClick={() => navigate("/organisers")}>← Back to Find Organizers</button>
          </div>
        )}

        {!loading && !error && organizer && (
          <>
            <button className="op-back-link" onClick={() => navigate("/organisers")}>← Back to Find Organizers</button>

            <div className="op-header">
              <div
                className="op-avatar"
                style={organizer.avatar_url ? { backgroundImage: `url(${organizer.avatar_url})` } : undefined}
              >
                {!organizer.avatar_url && organizer.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="op-header-info">
                <h1 className="op-name">{organizer.full_name}</h1>
                {organizer.specialty && <p className="op-specialty">{organizer.specialty}</p>}
                <div className="op-meta">
                  {organizer.location && <span>{organizer.location}</span>}
                  {organizer.experience_years != null && <span>{organizer.experience_years} years experience</span>}
                  <span>{organizer.published_event_count} published event{organizer.published_event_count === 1 ? "" : "s"}</span>
                </div>
              </div>
              {!isOwnProfile && (
                <button className="op-contact-btn" onClick={handleContact} disabled={contacting}>
                  {contacting ? "Starting..." : "Contact Organizer"}
                </button>
              )}
            </div>
            {contactError && <p className="op-contact-error">{contactError}</p>}

            {organizer.bio && (
              <div className="op-bio-card">
                <h3 className="op-section-heading">About</h3>
                <p className="op-bio">{organizer.bio}</p>
              </div>
            )}

            <div className="op-events-section">
              <h3 className="op-section-heading">Published Events</h3>
              {events.length === 0 ? (
                <p className="event-list-status">No published events yet.</p>
              ) : (
                <div className="event-card-grid">
                  {events.map((ev) => (
                    <EventCard key={ev.event_id} event={ev} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OrganizerProfile;
