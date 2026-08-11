import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./EditOrganiserProfile.css";

const EMPTY_FORM = {
  bio: "",
  specialty: "",
  experience_years: "",
  avatar_url: "",
  location: "",
};

function EditOrganiserProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { state: { from: "/organiser-profile/edit" } });
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem("user") || "null");
      if (currentUser) setUserId(currentUser.user_id);

      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/organisers/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setLoadError(data.message || "Could not load your profile.");
          return;
        }

        if (!cancelled && data.profile) {
          setForm({
            bio: data.profile.bio || "",
            specialty: data.profile.specialty || "",
            experience_years: data.profile.experience_years ?? "",
            avatar_url: data.profile.avatar_url || "",
            location: data.profile.location || "",
          });
        }
      } catch (err) {
        if (!cancelled) setLoadError("Something went wrong loading your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/organiser-profile/edit" } });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/organisers/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.message || "Could not save your profile.");
        return;
      }
      setSaved(true);
    } catch (err) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="eop-page">
      <Navbar />

      <div className="eop-content">
        <h1 className="eop-title">Organizer Profile</h1>
        <p className="eop-subtitle">
          This shows up on Find Organizers once you have at least one published event.
        </p>

        {loading && <p className="event-list-status">Loading...</p>}
        {!loading && loadError && <p className="event-list-status event-list-status--error">{loadError}</p>}

        {!loading && !loadError && (
          <div className="eop-card">
            <div className="eop-field">
              <label className="eop-label">Bio</label>
              <textarea
                className="eop-textarea"
                placeholder="Tell people what you do and what kind of events you organize..."
                maxLength={600}
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
              />
              <span className="eop-char-count">{form.bio.length}/600</span>
            </div>

            <div className="eop-row">
              <div className="eop-field">
                <label className="eop-label">Specialty</label>
                <input
                  type="text"
                  className="eop-input"
                  placeholder="e.g. Weddings, Corporate Conferences"
                  value={form.specialty}
                  onChange={(e) => handleChange("specialty", e.target.value)}
                />
              </div>
              <div className="eop-field">
                <label className="eop-label">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  className="eop-input"
                  placeholder="e.g. 5"
                  value={form.experience_years}
                  onChange={(e) => handleChange("experience_years", e.target.value)}
                />
              </div>
            </div>

            <div className="eop-row">
              <div className="eop-field">
                <label className="eop-label">Location</label>
                <input
                  type="text"
                  className="eop-input"
                  placeholder="e.g. Cairo, Egypt"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>
              <div className="eop-field">
                <label className="eop-label">Avatar Image URL</label>
                <input
                  type="text"
                  className="eop-input"
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatar_url}
                  onChange={(e) => handleChange("avatar_url", e.target.value)}
                />
              </div>
            </div>

            {submitError && <p className="eop-submit-error">{submitError}</p>}
            {saved && <p className="eop-saved">Profile saved.</p>}

            <div className="eop-footer">
              {userId && (
                <button className="eop-preview-btn" onClick={() => navigate(`/organisers/${userId}`)}>
                  View my public profile
                </button>
              )}
              <button className="eop-save-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditOrganiserProfile;
