import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./FindOrganizers.css";

function FindOrganizers() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrganizers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const response = await fetch(`/api/organisers?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not load organizers.");
        return;
      }
      setOrganizers(data.organizers || []);
    } catch (err) {
      setError("Something went wrong loading organizers.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadOrganizers();
  }, [loadOrganizers]);

  const handleSearch = () => setSearch(searchInput);

  return (
    <div className="fo-page">
      <Navbar />

      <div className="fo-content">
        <div className="fo-header">
          <h1 className="fo-title">Find Organizers</h1>
          <p className="fo-subtitle">Browse people who've published events on Eventify and see their track record.</p>
        </div>

        <div className="fo-search-row">
          <input
            type="text"
            className="fo-search-input"
            placeholder="Search by name, specialty, or location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="fo-search-btn" onClick={handleSearch}>Search</button>
        </div>

        {loading && <p className="event-list-status">Loading organizers...</p>}
        {!loading && error && <p className="event-list-status event-list-status--error">{error}</p>}
        {!loading && !error && organizers.length === 0 && (
          <p className="event-list-status">No organizers found yet.</p>
        )}

        {!loading && !error && organizers.length > 0 && (
          <div className="fo-grid">
            {organizers.map((org) => (
              <div key={org.user_id} className="fo-card" onClick={() => navigate(`/organisers/${org.user_id}`)}>
                <div
                  className="fo-avatar"
                  style={org.avatar_url ? { backgroundImage: `url(${org.avatar_url})` } : undefined}
                >
                  {!org.avatar_url && org.full_name?.charAt(0).toUpperCase()}
                </div>
                <h3 className="fo-name">{org.full_name}</h3>
                {org.specialty && <p className="fo-specialty">{org.specialty}</p>}
                <div className="fo-meta">
                  {org.location && <span>{org.location}</span>}
                  {org.experience_years != null && <span>{org.experience_years} yrs experience</span>}
                </div>
                <p className="fo-event-count">{org.published_event_count} published event{org.published_event_count === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FindOrganizers;
