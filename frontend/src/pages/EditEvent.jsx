import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

// The API stores dates as full ISO timestamps and times as "HH:MM:SS" —
// HTML date/time inputs need "YYYY-MM-DD" and "HH:MM".
const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");
const toTimeInput = (value) => (value ? String(value).slice(0, 5) : "");

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("published");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const initialFormRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { state: { from: `/edit-event/${id}` } });
        return;
      }

      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setLoadError(data.message || "Event not found.");
          return;
        }

        const ev = data.event;
        const currentUser = JSON.parse(localStorage.getItem("user") || "null");
        if (currentUser && ev.organizer_id !== currentUser.user_id) {
          if (!cancelled) setLoadError("You're not authorized to edit this event.");
          return;
        }

        if (!cancelled) {
          const loadedForm = {
            title: ev.title || "",
            category: ev.category || "",
            description: ev.description || "",
            format: ev.format || "in-person",
            venueName: ev.venue_name || "",
            address: ev.address || "",
            startDate: toDateInput(ev.start_date),
            endDate: toDateInput(ev.end_date),
            startTime: toTimeInput(ev.start_time),
            endTime: toTimeInput(ev.end_time),
            maxParticipants: ev.max_participants ?? "",
            registrationDeadline: toDateInput(ev.registration_deadline),
            imageUrl: ev.image_url || "",
          };
          setForm(loadedForm);
          initialFormRef.current = loadedForm;
          setStatus(ev.status || "published");
        }
      } catch (err) {
        if (!cancelled) setLoadError("Something went wrong loading this event.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEvent();
    return () => { cancelled = true; };
  }, [id, navigate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEvent = async (nextStatus) => {
    setSubmitError("");

    if (!form.title.trim()) {
      setSubmitError("Event title is required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/edit-event/${id}` } });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, status: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.message || "Could not save changes.");
        return;
      }

      navigate("/my-events", {
        state: { flash: nextStatus === "draft" ? "Saved as a draft." : "Your changes were saved." },
      });
    } catch (err) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => saveEvent("draft");
  const handleSaveAndPublish = () => saveEvent("published");

  const isDirty = initialFormRef.current
    ? JSON.stringify(form) !== JSON.stringify(initialFormRef.current)
    : false;

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    navigate("/my-events");
  };

  return (
    <div className="ce-page">

      {/* ── Navbar ── */}
      <nav className="ce-navbar">
        <span className="ce-logo">Organizer</span>
        <div className="ce-nav-links">
          <button className="ce-nav-link" onClick={() => navigate("/dashboard")}>Home</button>
          <button className="ce-nav-link" onClick={() => navigate("/events")}>Discover Events</button>
          <button className="ce-nav-link active" onClick={() => navigate("/my-events")}>My Events</button>
          <button className="ce-nav-link" onClick={() => navigate("/create-event")}>Create Event</button>
        </div>
      </nav>

      <div className="ce-content">
        <h1 className="ce-hero-title" style={{ margin: "24px 0 4px" }}>Edit Event</h1>
        <p className="ce-hero-desc" style={{ marginBottom: 24 }}>
          Update your event's details below.{" "}
          {status === "draft" && "It's currently a draft — save & publish when you're ready."}
        </p>

        {loading && <p className="ce-section-sub">Loading event...</p>}
        {!loading && loadError && (
          <div>
            <p className="ce-submit-error" style={{ textAlign: "left" }}>{loadError}</p>
            <button className="ce-draft-btn" onClick={() => navigate("/my-events")}>← Back to My Events</button>
          </div>
        )}

        {!loading && !loadError && (
          <EventForm
            form={form}
            onChange={handleChange}
            submitting={submitting}
            submitError={submitError}
            onSecondaryAction={handleSaveDraft}
            secondaryLabel="Save as Draft"
            onPrimaryAction={handleSaveAndPublish}
            primaryLabel="Save & Publish"
            primaryLoadingLabel="Saving..."
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}

export default EditEvent;
