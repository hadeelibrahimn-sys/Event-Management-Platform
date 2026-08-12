import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./SimulationInfo.css";

/* ── sessionStorage helpers ── */
const STORAGE_KEYS = {
  name:      "eventify_sim_name",
  guests:    "eventify_sim_guests",
  eventType: "eventify_sim_event_type",
};

/* ── Event types (docs/customization-system-design.md §5) ──
   Used later, in the workspace, to rank the object library so relevant
   items surface first — nothing is ever hidden based on this choice.
   Mirrors the broad category groups used across the platform
   (frontend/src/data/eventCategories.js) so "event type" here and
   "category" elsewhere stay conceptually aligned. */
const EVENT_TYPES = [
  { id: "education",    label: "Education",    emoji: "\u{1F393}" },
  { id: "celebration",  label: "Celebration",  emoji: "\u{1F389}" },
  { id: "business",     label: "Business",     emoji: "\u{1F4BC}" },
  { id: "entertainment",label: "Entertainment",emoji: "\u{1F3AD}" },
  { id: "culture",      label: "Culture",      emoji: "\u{1F3A8}" },
  { id: "sports",       label: "Sports",       emoji: "⚽" },
  { id: "wellness",     label: "Wellness",     emoji: "\u{1F33F}" },
  { id: "technology",   label: "Technology",   emoji: "\u{1F4BB}" },
  { id: "food-drink",   label: "Food & Drink", emoji: "\u{1F37D}\u{FE0F}" },
  { id: "community",    label: "Community",    emoji: "\u{1F91D}" },
  { id: "other",        label: "Other",        emoji: "✨" },
];

const saveToSession = (key, value) => {
  try { sessionStorage.setItem(key, value); } catch(e) {}
};

const readFromSession = (key) => {
  try { return sessionStorage.getItem(key) || ""; } catch(e) { return ""; }
};

export default function SimulationInfo() {
  const navigate = useNavigate();

  /* ── Form state — initialised from sessionStorage if available ── */
  const [eventName, setEventName] = useState(
    () => readFromSession(STORAGE_KEYS.name)
  );
  const [guests, setGuests] = useState(
    () => readFromSession(STORAGE_KEYS.guests)
  );
  const [eventType, setEventType] = useState(
    () => readFromSession(STORAGE_KEYS.eventType)
  );

  /* ── Validation error state ── */
  const [errors, setErrors] = useState({ name: "", guests: "", eventType: "" });
  const [touched, setTouched] = useState({ name: false, guests: false, eventType: false });

  /* ── Persist to sessionStorage on every change ── */
  useEffect(() => {
    saveToSession(STORAGE_KEYS.name, eventName);
  }, [eventName]);

  useEffect(() => {
    saveToSession(STORAGE_KEYS.guests, guests);
  }, [guests]);

  useEffect(() => {
    saveToSession(STORAGE_KEYS.eventType, eventType);
  }, [eventType]);

  /* ── Validation logic ── */
  const validateName = (value) => {
    if (!value.trim()) return "Event name is required.";
    if (value.trim().length < 2) return "Event name must be at least 2 characters.";
    return "";
  };

  const validateGuests = (value) => {
    if (!value) return "Expected number of guests is required.";
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return "Please enter a positive whole number.";
    if (n > 5000) return "Maximum supported guest count is 5,000.";
    return "";
  };

  const validateEventType = (value) => {
    if (!value) return "Please choose the type of event.";
    return "";
  };

  const handleEventTypeSelect = (id) => {
    setEventType(id);
    setTouched(prev => ({ ...prev, eventType: true }));
    setErrors(prev => ({ ...prev, eventType: validateEventType(id) }));
  };

  /* ── Live validation as user types (only after field touched) ── */
  const handleNameChange = (e) => {
    const val = e.target.value;
    setEventName(val);
    if (touched.name) setErrors(prev => ({ ...prev, name: validateName(val) }));
  };

  const handleGuestsChange = (e) => {
    const val = e.target.value;
    setGuests(val);
    if (touched.guests) setErrors(prev => ({ ...prev, guests: validateGuests(val) }));
  };

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, name: true }));
    setErrors(prev => ({ ...prev, name: validateName(eventName) }));
  };

  const handleGuestsBlur = () => {
    setTouched(prev => ({ ...prev, guests: true }));
    setErrors(prev => ({ ...prev, guests: validateGuests(guests) }));
  };

  /* ── Submit ── */
  const handleContinue = () => {
    const nameErr      = validateName(eventName);
    const guestsErr    = validateGuests(guests);
    const eventTypeErr = validateEventType(eventType);

    setErrors({ name: nameErr, guests: guestsErr, eventType: eventTypeErr });
    setTouched({ name: true, guests: true, eventType: true });

    if (nameErr || guestsErr || eventTypeErr) return;

    /* Pass to Page 2 via location.state (sessionStorage is backup) */
    navigate("/simulation/layout", {
      state: {
        eventName: eventName.trim(),
        guests: Number(guests),
        eventType,
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleContinue();
  };

  const nameError      = touched.name      ? validateName(eventName)      : "";
  const guestsError    = touched.guests    ? validateGuests(guests)       : "";
  const eventTypeError = touched.eventType ? validateEventType(eventType) : "";
  const isValid = !validateName(eventName) && !validateGuests(guests) && !validateEventType(eventType);

  return (
    <div className="si-page">
      <Navbar />

      <div className="si-body">

        {/* Header */}
        <div className="si-header">
          {/* Decorative left */}
          <div className="si-deco-left">
            <svg width="72" height="88" viewBox="0 0 72 88">
              <polygon points="16,78 52,38 64,58" fill="#7c3aed" opacity="0.85"/>
              <polygon points="16,78 36,28 52,38" fill="#9b59b6" opacity="0.7"/>
              <rect x="28" y="8" width="6" height="6" rx="1" fill="#f59e0b" transform="rotate(20,31,11)"/>
              <rect x="54" y="4" width="5" height="5" rx="1" fill="#ef4444" transform="rotate(-15,56,6)"/>
              <rect x="8"  y="18" width="5" height="5" rx="1" fill="#3b82f6" transform="rotate(30,10,20)"/>
              <circle cx="64" cy="20" r="3" fill="#10b981"/>
              <circle cx="12" cy="44" r="2.5" fill="#f59e0b"/>
            </svg>
          </div>

          <div className="si-title-block">
            <h1 className="si-title">
              Tell us about your <span className="si-highlight">event</span>
            </h1>
            <p className="si-subtitle">
              We'll use this to set up your design workspace.
            </p>
          </div>

          {/* Decorative right */}
          <div className="si-deco-right">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <ellipse cx="28" cy="32" rx="18" ry="22" fill="#7c3aed" opacity="0.85"/>
              <path d="M28 54 Q26 64 28 70" stroke="#7c3aed" strokeWidth="1.5" fill="none"/>
              <ellipse cx="58" cy="42" rx="16" ry="20" fill="#f59e0b" opacity="0.85"/>
              <path d="M58 62 Q56 72 58 78" stroke="#f59e0b" strokeWidth="1.5" fill="none"/>
              <ellipse cx="82" cy="28" rx="14" ry="18" fill="#ec4899" opacity="0.85"/>
              <path d="M82 46 Q80 56 82 62" stroke="#ec4899" strokeWidth="1.5" fill="none"/>
              <path d="M28 70 Q40 88 50 96" stroke="#999" strokeWidth="1" fill="none"/>
              <path d="M58 78 Q54 88 50 96" stroke="#999" strokeWidth="1" fill="none"/>
              <path d="M82 62 Q68 80 50 96" stroke="#999" strokeWidth="1" fill="none"/>
            </svg>
          </div>
        </div>

        {/* Card */}
        <div className="si-card">

          {/* Step indicator */}
          <div className="si-steps">
            <div className="si-step active">
              <div className="si-step-dot">1</div>
              <span>Event Info</span>
            </div>
            <div className="si-step-line"/>
            <div className="si-step">
              <div className="si-step-dot">2</div>
              <span>Layout</span>
            </div>
            <div className="si-step-line"/>
            <div className="si-step">
              <div className="si-step-dot">3</div>
              <span>Workspace</span>
            </div>
          </div>

          {/* Form */}
          <div className="si-form">

            {/* Event Name */}
            <div className="si-field">
              <label className="si-label">
                <span className="si-label-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </span>
                Event Name
                <span className="si-required">*</span>
              </label>
              <input
                type="text"
                className={`si-input ${nameError ? "error" : eventName.trim().length >= 2 ? "valid" : ""}`}
                placeholder="e.g. Sarah's Birthday Party"
                value={eventName}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleKeyDown}
                maxLength={100}
              />
              {nameError && (
                <p className="si-error">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {nameError}
                </p>
              )}
              {!nameError && eventName.trim().length >= 2 && (
                <p className="si-success">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Looks good!
                </p>
              )}
              <p className="si-hint">{eventName.length}/100 characters · minimum 2</p>
            </div>

            {/* Expected Guests */}
            <div className="si-field">
              <label className="si-label">
                <span className="si-label-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                Expected Number of Guests
                <span className="si-required">*</span>
              </label>
              <div className="si-input-wrap">
                <input
                  type="number"
                  className={`si-input ${guestsError ? "error" : guests && !guestsError && Number(guests) > 0 ? "valid" : ""}`}
                  placeholder="e.g. 80"
                  value={guests}
                  onChange={handleGuestsChange}
                  onBlur={handleGuestsBlur}
                  onKeyDown={handleKeyDown}
                  min="1"
                  max="5000"
                />
                <span className="si-input-suffix">guests</span>
              </div>
              {guestsError && (
                <p className="si-error">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {guestsError}
                </p>
              )}
              {!guestsError && guests && Number(guests) > 0 && (
                <p className="si-success">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Looks good!
                </p>
              )}
              <p className="si-hint">Enter a number between 1 and 5,000</p>
            </div>

            {/* Event Type */}
            <div className="si-field">
              <label className="si-label">
                <span className="si-label-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>
                  </svg>
                </span>
                Event Type
                <span className="si-required">*</span>
              </label>
              <div className="si-type-grid">
                {EVENT_TYPES.map(t => (
                  <button
                    type="button"
                    key={t.id}
                    className={`si-type-btn ${eventType === t.id ? "active" : ""}`}
                    onClick={() => handleEventTypeSelect(t.id)}
                  >
                    <span className="si-type-emoji">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              {eventTypeError && (
                <p className="si-error">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {eventTypeError}
                </p>
              )}
              <p className="si-hint">Helps us suggest the right furniture and decor first in your workspace.</p>
            </div>

            {/* Info note */}
            <div className="si-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p>Your guest count helps us suggest an appropriate room size on the next step. You can always adjust it later.</p>
            </div>

            {/* Continue button */}
            <button
              className={`si-continue-btn ${isValid ? "ready" : ""}`}
              onClick={handleContinue}
            >
              Continue to Layout Selection
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>

          </div>
        </div>

        {/* Bottom categories */}
        <div className="si-categories">
          <p className="si-categories-label">✦ Design any kind of event ✦</p>
          <div className="si-categories-row">
            {[
              { name: "Birthdays",   color: "#7c3aed" },
              { name: "Weddings",    color: "#ec4899" },
              { name: "Conferences", color: "#7c3aed" },
              { name: "Workshops",   color: "#7c3aed" },
              { name: "Exhibitions", color: "#7c3aed" },
              { name: "Parties",     color: "#f59e0b" },
            ].map(c => (
              <span key={c.name} className="si-category-pill" style={{ borderColor: c.color, color: c.color }}>
                {c.name}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
