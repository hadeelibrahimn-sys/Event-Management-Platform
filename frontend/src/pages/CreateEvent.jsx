import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm";
import "./CreateEvent.css";

const EMPTY_FORM = {
  title: "",
  category: "",
  description: "",
  format: "in-person",
  venueName: "",
  address: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  maxParticipants: "",
  registrationDeadline: "",
  imageUrl: "",
};

function CreateEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard this event? Your changes won't be saved.")) return;
    navigate("/my-events");
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const submitEvent = async (status) => {
    setSubmitError("");

    if (!form.title.trim()) {
      setSubmitError("Event title is required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setSubmitError("Please log in to create an event.");
      navigate("/login", { state: { from: "/create-event" } });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.message || "Could not save event.");
        return;
      }

      navigate(`/events/${data.event_id}`, {
        state: { flash: status === "draft" ? "Your event was saved as a draft." : "Your event was published!" },
      });
    } catch (err) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => submitEvent("draft");
  const handlePublish = () => submitEvent("published");

  return (
    <div className="ce-page">

      {/* ── Navbar ── */}
      <nav className="ce-navbar">
        <span className="ce-logo">Organizer</span>
        <div className="ce-nav-links">
          <button className="ce-nav-link" onClick={() => navigate("/dashboard")}>Home</button>
          <button className="ce-nav-link" onClick={() => navigate("/events")}>Discover Events</button>
          <button className="ce-nav-link" onClick={() => navigate("/my-events")}>My Events</button>
          <button className="ce-nav-link active">Create Event</button>
        </div>
        <div className="ce-nav-right">
          <button className="ce-bell">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <div className="ce-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
        </div>
      </nav>

      <div className="ce-content">

        {/* ── Hero banner ── */}
        <div className="ce-hero">
          <div className="ce-hero-left">
            <h1 className="ce-hero-title">
              Create and Share<br />
              <span className="ce-hero-highlight">Your Event</span>
            </h1>
            <p className="ce-hero-desc">
              Create workshops, courses, conferences, seminars,<br />
              and activities for participants to discover and join.
            </p>
            <div className="ce-hero-btns">
              <button className="ce-start-btn">
                Start Creating
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                </svg>
              </button>
              <button className="ce-view-btn" onClick={() => navigate("/my-events")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                View My Events
              </button>
            </div>
          </div>

          {/* Right: calendar illustration */}
          <div className="ce-hero-right">
            <svg width="260" height="200" viewBox="0 0 260 200">
              <rect x="60" y="20" width="160" height="150" rx="8" fill="white" stroke="#e5e0f5" strokeWidth="1.5"/>
              {[85,105,125,145,165,185].map((x,i) => (
                <ellipse key={i} cx={x} cy="20" rx="6" ry="8" fill="none" stroke="#7c3aed" strokeWidth="2"/>
              ))}
              <rect x="60" y="28" width="160" height="28" rx="4" fill="#7c3aed" opacity="0.1"/>
              {[70,90,110,130].map((y,i) => (
                <line key={i} x1="70" y1={y} x2="210" y2={y} stroke="#e5e0f5" strokeWidth="1"/>
              ))}
              {[98,126,154,182].map((x,i) => (
                <line key={i} x1={x} y1="56" x2={x} y2="170" stroke="#e5e0f5" strokeWidth="1"/>
              ))}
              <rect x="110" y="95" width="40" height="35" rx="4" fill="#7c3aed" opacity="0.15"/>
              <path d="M118 113 l8 8 16-16" stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <ellipse cx="45" cy="180" rx="20" ry="14" fill="#86efac" opacity="0.7"/>
              <path d="M45 166 Q38 148 35 132" stroke="#4ade80" strokeWidth="2.5" fill="none"/>
              <path d="M45 166 Q54 146 58 130" stroke="#4ade80" strokeWidth="2.5" fill="none"/>
              <rect x="35" y="180" width="20" height="16" rx="3" fill="#d8b4fe" opacity="0.6"/>
              <rect x="205" y="148" width="38" height="34" rx="6" fill="#7c3aed" opacity="0.8"/>
              <path d="M243 158 Q256 158 256 168 Q256 178 243 178" stroke="#7c3aed" strokeWidth="3" fill="none"/>
              <text x="55" y="60" fill="#7c3aed" fontSize="14">✦</text>
              <text x="215" y="50" fill="#7c3aed" fontSize="10">✦</text>
              <text x="230" y="100" fill="#a78bfa" fontSize="8">✦</text>
            </svg>
          </div>
        </div>

        <EventForm
          form={form}
          onChange={handleChange}
          submitting={submitting}
          submitError={submitError}
          onSecondaryAction={handleSaveDraft}
          secondaryLabel="Save Draft"
          onPrimaryAction={handlePublish}
          primaryLabel="Publish Event"
          primaryLoadingLabel="Publishing..."
          onCancel={handleCancel}
        />

      </div>
    </div>
  );
}

export default CreateEvent;
