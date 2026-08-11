import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import customLayoutPreview from "../assets/layouts/customizelayout.png";
import "./SimulationLayout.css";

/* ── sessionStorage helpers ── */
const KEYS = {
  name:      "eventify_sim_name",
  guests:    "eventify_sim_guests",
  eventType: "eventify_sim_event_type",
  type:      "eventify_sim_type",
  layout:    "eventify_sim_layout",
  width:     "eventify_sim_width",
  length:    "eventify_sim_length",
  height:    "eventify_sim_height",
};

const save = (key, val) => { try { sessionStorage.setItem(key, String(val)); } catch(e) {} };
const read = (key, fallback = "") => { try { return sessionStorage.getItem(key) ?? fallback; } catch(e) { return fallback; } };

/* ── Layout config ── */
const LAYOUTS = {
  indoor: {
    id: "indoor",
    name: "Indoor Hall",
    desc: "Three walls and a floor. Open front for camera access.",
    defaultWidth: 20, defaultLength: 15, defaultHeight: 4,
    sqm: 300,
    thumb: (active) => (
      <div className={`sl-thumb-img-wrap ${active ? "active" : ""}`}>
        <img
          src="/src/assets/layouts/thumb-indoor.png"
          alt="Indoor Hall"
          className="sl-thumb-img"
        />
      </div>
    ),
  },
  enclosed: {
    id: "enclosed",
    name: "Enclosed Room",
    desc: "Four walls and a floor. Front wall auto-hidden in workspace.",
    defaultWidth: 15, defaultLength: 15, defaultHeight: 4,
    sqm: 225,
    thumb: (active) => (
      <div className={`sl-thumb-img-wrap ${active ? "active" : ""}`}>
        <img
          src="/src/assets/layouts/thumb-enclosed.png"
          alt="Enclosed Room"
          className="sl-thumb-img"
        />
      </div>
    ),
  },
  lshaped: {
    id: "lshaped",
    name: "L-Shaped Room",
    desc: "An L-shaped floor plan with walls following the shape.",
    defaultWidth: 14, defaultLength: 12, defaultHeight: 4,
    sqm: 120,
    thumb: (active) => (
      <div className={`sl-thumb-img-wrap ${active ? "active" : ""}`}>
        <img
          src="/src/assets/layouts/thumb-lshaped.png"
          alt="L-Shaped Room"
          className="sl-thumb-img"
        />
      </div>
    ),
  },
  garden: {
    id: "garden",
    name: "Garden / Outdoor",
    desc: "Grass floor only. No walls. Perfect for open-air events.",
    defaultWidth: 25, defaultLength: 20, defaultHeight: null,
    sqm: 500,
    heightDisabled: true,
    thumb: (active) => (
      <div className={`sl-thumb-img-wrap ${active ? "active" : ""}`}>
        <img
          src="/src/assets/layouts/thumb-garden.png"
          alt="Garden / Outdoor"
          className="sl-thumb-img"
        />
      </div>
    ),
  },
};

/* ── Capacity guidance ── */
function getCapacityGuidance(width, length, guests) {
  if (!width || !length || !guests) return null;
  const usableArea = width * length * 0.7;
  const recommended = Math.floor(usableArea / 2);
  const ratio = guests / recommended;

  if (ratio <= 1) return {
    level: "good",
    message: `This space comfortably fits ${guests} guests.`,
    sub: `Estimated comfortable capacity: ${recommended} guests.`,
  };
  if (ratio <= 1.2) return {
    level: "warning",
    message: `This space is near capacity for ${guests} guests.`,
    sub: `Estimated comfortable capacity: ${recommended} guests. Consider a larger room.`,
  };
  return {
    level: "danger",
    message: `This space may be too small for ${guests} guests.`,
    sub: `Estimated comfortable capacity: ${recommended} guests. We recommend a larger space.`,
  };
}

export default function SimulationLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();

  /* ── Recover data from location.state or sessionStorage ── */
  const eventName = location.state?.eventName || read(KEYS.name)  || "";
  const guests    = Number(location.state?.guests || read(KEYS.guests) || 0);
  const eventType = location.state?.eventType || read(KEYS.eventType) || "";

  /* Redirect to page 1 if no data */
  useEffect(() => {
    if (!eventName || !guests) navigate("/simulation", { replace: true });
  }, []);

  /* ── Local state ── */
  const [workspaceType, setWorkspaceType] = useState(read(KEYS.type) || "predefined");
  const [selectedLayout, setSelectedLayout] = useState(read(KEYS.layout) || "indoor");
  const [dims, setDims] = useState({
    width:  Number(read(KEYS.width))  || LAYOUTS.indoor.defaultWidth,
    length: Number(read(KEYS.length)) || LAYOUTS.indoor.defaultLength,
    height: Number(read(KEYS.height)) || LAYOUTS.indoor.defaultHeight,
  });
  const [dimErrors, setDimErrors] = useState({ width: "", length: "", height: "" });

  const layout = LAYOUTS[selectedLayout] || LAYOUTS.indoor;

  /* ── When layout changes reset dims to defaults ── */
  useEffect(() => {
    setDims({
      width:  layout.defaultWidth,
      length: layout.defaultLength,
      height: layout.defaultHeight || 4,
    });
    setDimErrors({ width: "", length: "", height: "" });
  }, [selectedLayout]);

  /* ── Persist to sessionStorage ── */
  useEffect(() => { save(KEYS.type, workspaceType); }, [workspaceType]);
  useEffect(() => { save(KEYS.layout, selectedLayout); }, [selectedLayout]);
  useEffect(() => {
    save(KEYS.width,  dims.width);
    save(KEYS.length, dims.length);
    save(KEYS.height, dims.height);
  }, [dims]);

  /* ── Dimension validation ── */
  const validateDim = (name, value) => {
    const n = Number(value);
    if (!value) return `${name} is required.`;
    if (isNaN(n) || n <= 0) return `${name} must be a positive number.`;
    if (name === "Width"  && n > 100) return "Width cannot exceed 100 m.";
    if (name === "Length" && n > 100) return "Length cannot exceed 100 m.";
    if (name === "Height" && (n < 2 || n > 20)) return "Height must be between 2 and 20 m.";
    return "";
  };

  const handleDimChange = (field, value, label) => {
    setDims(prev => ({ ...prev, [field]: value }));
    setDimErrors(prev => ({ ...prev, [field]: validateDim(label, value) }));
  };

  /* ── Capacity guidance ── */
  const guidance = getCapacityGuidance(
    workspaceType === "predefined" ? dims.width : dims.width,
    dims.length,
    guests
  );

  /* ── Can proceed? ── */
  const canProceed = () => {
    if (workspaceType === "predefined" && !selectedLayout) return false;
    if (dimErrors.width || dimErrors.length) return false;
    if (!layout.heightDisabled && dimErrors.height) return false;
    if (!dims.width || !dims.length) return false;
    return true;
  };

  /* ── Start Designing ── */
  const handleStart = () => {
    if (!canProceed()) return;
    navigate("/workspace", {
      state: {
        eventName,
        guests,
        eventType,
        workspaceType,
        layoutId: workspaceType === "predefined" ? selectedLayout : "custom",
        dims: {
          width:  Number(dims.width),
          length: Number(dims.length),
          height: layout.heightDisabled ? 4 : Number(dims.height),
        },
      }
    });
  };

  return (
    <div className="sl-page">
      <Navbar />

      <div className="sl-body">

        {/* Header */}
        <div className="sl-header">
          <div className="sl-back-row">
            <button className="sl-back-btn" onClick={() => navigate("/simulation")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back
            </button>
          </div>
          <h1 className="sl-title">Choose Your <span className="sl-highlight">Starting Layout</span></h1>
          <p className="sl-subtitle">Start with a predefined room shape or create your own space from scratch.</p>
        </div>

        {/* Step indicator */}
        <div className="sl-steps">
          <div className="sl-step done">
            <div className="sl-step-dot">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <span>Event Info</span>
          </div>
          <div className="sl-step-line done"/>
          <div className="sl-step active">
            <div className="sl-step-dot">2</div>
            <span>Layout</span>
          </div>
          <div className="sl-step-line"/>
          <div className="sl-step">
            <div className="sl-step-dot">3</div>
            <span>Workspace</span>
          </div>
        </div>

        {/* Event summary pill */}
        <div className="sl-event-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span><strong>{eventName}</strong> · {guests} guests{eventType ? ` · ${eventType.charAt(0).toUpperCase()}${eventType.slice(1)}` : ""}</span>
        </div>

        {/* Main grid */}
        <div className="sl-grid">

          {/* ── Left: Workspace Type + Layout selection ── */}
          <div className="sl-left">

            {/* Step 1: Workspace type */}
            <div className="sl-section">
              <div className="sl-section-num">1</div>
              <div className="sl-section-body">
                <h2 className="sl-section-title">Select Workspace Type</h2>
                <div className="sl-type-cards">

                  <button
                    className={`sl-type-card ${workspaceType === "predefined" ? "active" : ""}`}
                    onClick={() => setWorkspaceType("predefined")}
                  >
                    <div className="sl-type-radio">
                      {workspaceType === "predefined" && <div className="sl-radio-dot"/>}
                    </div>
                    <div className="sl-type-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={workspaceType==="predefined"?"#7c3aed":"#aaa"} strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M3 9h18M9 21V9"/>
                      </svg>
                    </div>
                    <div className="sl-type-text">
                      <span className="sl-type-name">Predefined Layout</span>
                      <span className="sl-type-desc">Choose from standard room shapes. Starts completely empty.</span>
                    </div>
                  </button>

                  <button
                    className={`sl-type-card ${workspaceType === "custom" ? "active" : ""}`}
                    onClick={() => setWorkspaceType("custom")}
                  >
                    <div className="sl-type-radio">
                      {workspaceType === "custom" && <div className="sl-radio-dot"/>}
                    </div>
                    <div className="sl-type-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={workspaceType==="custom"?"#7c3aed":"#aaa"} strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/>
                        <path d="M12 8v8M8 12h8"/>
                      </svg>
                    </div>
                    <div className="sl-type-text">
                      <span className="sl-type-name">Custom Layout</span>
                      <span className="sl-type-desc">Start with a blank ground. Add walls, doors, and elements yourself.</span>
                    </div>
                  </button>

                </div>
              </div>
            </div>

            {/* Step 2: Layout cards (Predefined only) */}
            {workspaceType === "predefined" && (
              <div className="sl-section">
                <div className="sl-section-num">2</div>
                <div className="sl-section-body">
                  <h2 className="sl-section-title">Choose a Room Shape</h2>
                  <div className="sl-layout-grid">
                    {Object.values(LAYOUTS).map(l => (
                      <button
                        key={l.id}
                        className={`sl-layout-card ${selectedLayout === l.id ? "active" : ""}`}
                        onClick={() => setSelectedLayout(l.id)}
                      >
                        <div className="sl-layout-thumb">
                          {l.thumb(selectedLayout === l.id)}
                        </div>
                        <span className="sl-layout-name">{l.name}</span>
                        <span className="sl-layout-dims">
                          {l.defaultWidth}m × {l.defaultLength}m
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Info note */}
                  <div className="sl-info-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                    </svg>
                    <p>Predefined layouts start completely empty — no furniture, decorations, doors, or windows. You add everything in the workspace.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom layout info */}
            {workspaceType === "custom" && (
              <div className="sl-section">
                <div className="sl-section-num">2</div>
                <div className="sl-section-body">
                  <h2 className="sl-section-title">Custom Blank Ground</h2>
                  <div className="sl-custom-preview">
                    <img
                      src={customLayoutPreview}
                      alt="Custom layout — build your own walls, doors and floor"
                      className="sl-custom-preview-img"
                    />
                  </div>
                  <div className="sl-custom-included">
                    <p className="sl-custom-included-title">What's included at the start:</p>
                    <div className="sl-custom-items">
                      {["No walls","No doors","No windows","No furniture","No decorations","No lights","No ceiling","No objects"].map(item => (
                        <div key={item} className="sl-custom-item">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── Right: Dimensions + Capacity ── */}
          <div className="sl-right">

            {/* Step 3: Dimensions */}
            <div className="sl-right-card">
              <div className="sl-section-num-inline">
                {workspaceType === "predefined" ? "3" : "2"}
              </div>
              <h2 className="sl-section-title">Room Dimensions</h2>
              <p className="sl-dim-note">
                {workspaceType === "predefined"
                  ? `Default dimensions for ${layout.name} are pre-filled. You can override them.`
                  : "Enter your custom room dimensions."}
              </p>

              <div className="sl-dim-fields">

                <div className="sl-dim-field">
                  <label className="sl-dim-label">Width (m)</label>
                  <input
                    type="number"
                    className={`sl-dim-input ${dimErrors.width ? "error" : ""}`}
                    value={dims.width}
                    onChange={e => handleDimChange("width", e.target.value, "Width")}
                    min="1" max="100" step="0.5"
                  />
                  {dimErrors.width && <p className="sl-dim-error">{dimErrors.width}</p>}
                </div>

                <div className="sl-dim-field">
                  <label className="sl-dim-label">Length (m)</label>
                  <input
                    type="number"
                    className={`sl-dim-input ${dimErrors.length ? "error" : ""}`}
                    value={dims.length}
                    onChange={e => handleDimChange("length", e.target.value, "Length")}
                    min="1" max="100" step="0.5"
                  />
                  {dimErrors.length && <p className="sl-dim-error">{dimErrors.length}</p>}
                </div>

                {!layout.heightDisabled && (
                  <div className="sl-dim-field">
                    <label className="sl-dim-label">Height (m)</label>
                    <input
                      type="number"
                      className={`sl-dim-input ${dimErrors.height ? "error" : ""}`}
                      value={dims.height}
                      onChange={e => handleDimChange("height", e.target.value, "Height")}
                      min="2" max="20" step="0.5"
                    />
                    {dimErrors.height && <p className="sl-dim-error">{dimErrors.height}</p>}
                  </div>
                )}

                {layout.heightDisabled && (
                  <div className="sl-dim-field disabled">
                    <label className="sl-dim-label">Height (m)</label>
                    <input
                      type="text"
                      className="sl-dim-input"
                      value="N/A — no walls"
                      disabled
                    />
                    <p className="sl-dim-note-small">Garden has no walls, so height is not applicable.</p>
                  </div>
                )}

              </div>

              {/* Area summary */}
              <div className="sl-area-summary">
                <div className="sl-area-item">
                  <span className="sl-area-label">Floor Area</span>
                  <span className="sl-area-value">{(Number(dims.width||0) * Number(dims.length||0)).toFixed(0)} m²</span>
                </div>
                <div className="sl-area-item">
                  <span className="sl-area-label">Usable Area (70%)</span>
                  <span className="sl-area-value">{(Number(dims.width||0) * Number(dims.length||0) * 0.7).toFixed(0)} m²</span>
                </div>
              </div>
            </div>

            {/* Capacity guidance */}
            {guidance && (
              <div className={`sl-capacity-card ${guidance.level}`}>
                <div className="sl-capacity-icon">
                  {guidance.level === "good" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                  {guidance.level === "warning" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  )}
                  {guidance.level === "danger" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                </div>
                <div className="sl-capacity-text">
                  <p className="sl-capacity-msg">{guidance.message}</p>
                  <p className="sl-capacity-sub">{guidance.sub}</p>
                  <p className="sl-capacity-disclaimer">
                    * Estimated guidance only — not a legal or safety occupancy limit.
                  </p>
                </div>
              </div>
            )}

            {/* Important note */}
            <div className="sl-important-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <div>
                <p className="sl-important-title">Both options start completely empty.</p>
                <p className="sl-important-body">You have full control to customise, decorate, and design your space exactly the way you want inside the workspace.</p>
              </div>
            </div>

            {/* Start Designing button */}
            <button
              className={`sl-start-btn ${canProceed() ? "ready" : ""}`}
              onClick={handleStart}
              disabled={!canProceed()}
            >
              Start Designing
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
