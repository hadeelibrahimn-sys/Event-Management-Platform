import { EVENT_CATEGORIES } from "../data/eventCategories";
import "../pages/CreateEvent.css";

// Shared event form used by both CreateEvent and EditEvent — covers every
// field that maps to the events table (title, category, description,
// format, venue, dates/times, participants, image). The pages around this
// component own the navbar/hero and decide what "save" actually means
// (POST vs PUT) and how the two footer buttons are labeled.
function EventForm({
  form,
  onChange,
  submitting,
  submitError,
  onSecondaryAction,
  secondaryLabel = "Save Draft",
  onPrimaryAction,
  primaryLabel = "Publish Event",
  primaryLoadingLabel = "Saving...",
  onCancel,
}) {
  const handleChange = (field, value) => onChange(field, value);

  return (
    <>
      {/* ── Event Details ── */}
      <div className="ce-section">
        <div className="ce-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
          <h2 className="ce-section-title">Event Details</h2>
        </div>

        <div className="ce-row">
          <div className="ce-field">
            <label className="ce-label">Event Title</label>
            <input
              type="text"
              className="ce-input"
              placeholder="Enter event title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>
          <div className="ce-field">
            <label className="ce-label">Event Category</label>
            <select
              className="ce-input ce-select"
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
            >
              <option value="">Select a category</option>
              {EVENT_CATEGORIES.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="ce-field">
          <label className="ce-label">Event Description</label>
          <textarea
            className="ce-textarea"
            placeholder="Describe your event..."
            maxLength={500}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
          <span className="ce-char-count">{form.description.length}/500</span>
        </div>
      </div>

      {/* ── Event Format ── */}
      <div className="ce-section">
        <div className="ce-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
            <circle cx="9" cy="7" r="4"/>
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
          </svg>
          <h2 className="ce-section-title">Event Format</h2>
        </div>

        <div className="ce-format-grid">
          {[
            {
              id: "in-person",
              label: "In-person",
              desc: "Event takes place at a physical venue",
              icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M4 8h16"/></svg>
            },
            {
              id: "online",
              label: "Online",
              desc: "Event takes place on the virtual platform",
              icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            },
            {
              id: "hybrid",
              label: "Hybrid",
              desc: "Combination of in-person and online event",
              icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6"><circle cx="7" cy="8" r="4"/><path d="M1 18v-2a4 4 0 0 1 4-4h4"/><rect x="13" y="10" width="10" height="8" rx="2"/><path d="M16 18v2M19 18v2"/></svg>
            }
          ].map(fmt => (
            <button
              key={fmt.id}
              className={`ce-format-card ${form.format === fmt.id ? "selected" : ""}`}
              onClick={() => handleChange("format", fmt.id)}
              type="button"
            >
              <div className="ce-format-radio">
                <div className={`ce-radio-dot ${form.format === fmt.id ? "active" : ""}`} />
              </div>
              {fmt.icon}
              <p className="ce-format-label">{fmt.label}</p>
              <p className="ce-format-desc">{fmt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Venue Information ── */}
      {form.format !== "online" && (
        <div className="ce-section">
          <div className="ce-section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <h2 className="ce-section-title">Venue Information</h2>
          </div>
          <p className="ce-section-sub">This section is only for in-person events.</p>
          <div className="ce-row">
            <div className="ce-field">
              <label className="ce-label">Venue Name</label>
              <input
                type="text"
                className="ce-input"
                placeholder="Enter venue name"
                value={form.venueName}
                onChange={(e) => handleChange("venueName", e.target.value)}
              />
            </div>
            <div className="ce-field">
              <label className="ce-label">Address</label>
              <input
                type="text"
                className="ce-input"
                placeholder="Enter full address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Date & Time ── */}
      <div className="ce-section">
        <div className="ce-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <h2 className="ce-section-title">Date & Time</h2>
        </div>
        <div className="ce-row ce-row-4">
          <div className="ce-field">
            <label className="ce-label">Start Date</label>
            <input type="date" className="ce-input" value={form.startDate} onChange={(e) => handleChange("startDate", e.target.value)}/>
          </div>
          <div className="ce-field">
            <label className="ce-label">End Date</label>
            <input type="date" className="ce-input" value={form.endDate} onChange={(e) => handleChange("endDate", e.target.value)}/>
          </div>
          <div className="ce-field">
            <label className="ce-label">Start Time</label>
            <input type="time" className="ce-input" value={form.startTime} onChange={(e) => handleChange("startTime", e.target.value)}/>
          </div>
          <div className="ce-field">
            <label className="ce-label">End Time</label>
            <input type="time" className="ce-input" value={form.endTime} onChange={(e) => handleChange("endTime", e.target.value)}/>
          </div>
        </div>
      </div>

      {/* ── Participant Details ── */}
      <div className="ce-section">
        <div className="ce-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
            <circle cx="9" cy="7" r="4"/>
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
          </svg>
          <h2 className="ce-section-title">Participant Details</h2>
        </div>
        <div className="ce-row">
          <div className="ce-field">
            <label className="ce-label">Maximum Participants</label>
            <input
              type="number"
              className="ce-input"
              placeholder="Enter maximum number"
              value={form.maxParticipants}
              onChange={(e) => handleChange("maxParticipants", e.target.value)}
            />
          </div>
          <div className="ce-field">
            <label className="ce-label">Registration Deadline</label>
            <input
              type="date"
              className="ce-input"
              value={form.registrationDeadline}
              onChange={(e) => handleChange("registrationDeadline", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Event Image ── */}
      <div className="ce-section">
        <div className="ce-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <h2 className="ce-section-title">Event Image</h2>
        </div>
        <p className="ce-section-sub">Paste a link to an image to represent your event.</p>
        <div className="ce-field">
          <label className="ce-label">Event Image URL</label>
          <input
            type="text"
            className="ce-input"
            placeholder="https://example.com/image.jpg"
            value={form.imageUrl}
            onChange={(e) => handleChange("imageUrl", e.target.value)}
          />
        </div>
        {form.imageUrl && (
          <img src={form.imageUrl} alt="Event preview" className="ce-image-preview" />
        )}
      </div>

      {/* ── Footer buttons ── */}
      {submitError && <p className="ce-submit-error">{submitError}</p>}
      <div className="ce-footer-btns">
        {onCancel && (
          <button className="ce-cancel-btn" onClick={onCancel} disabled={submitting} type="button">
            Cancel
          </button>
        )}
        <button className="ce-draft-btn" onClick={onSecondaryAction} disabled={submitting} type="button">
          {secondaryLabel}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <path d="M17 21v-8H7v8M7 3v5h8"/>
          </svg>
        </button>
        <button className="ce-publish-btn" onClick={onPrimaryAction} disabled={submitting} type="button">
          {submitting ? primaryLoadingLabel : primaryLabel}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </>
  );
}

export default EventForm;
