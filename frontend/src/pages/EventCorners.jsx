import Navbar from "../components/Navbar";
import "./EventCorners.css";

const CORNER_PREVIEWS = [
  {
    name: "Coffee Catering Corner",
    desc: "A styled coffee & beverage station for your event, staffed and stocked.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" />
        <line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    name: "Decorative Setup Corner",
    desc: "A curated backdrop and styling corner — florals, balloons, and props.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6">
        <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z" />
      </svg>
    ),
  },
  {
    name: "Photo Booth Corner",
    desc: "A ready-to-go photo corner with props and instant prints.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    name: "Lounge Corner",
    desc: "A relaxed seating area to give guests a place to unwind.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6">
        <path d="M3 18v-6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6" />
        <path d="M21 18v2H3v-2" /><path d="M3 13v-2a2 2 0 0 1 2-2" /><path d="M21 13v-2a2 2 0 0 0-2-2" />
      </svg>
    ),
  },
];

function EventCorners() {
  return (
    <div className="ec-page">
      <Navbar />

      <div className="ec-content">
        <div className="ec-hero">
          <span className="ec-badge">Coming Soon</span>
          <h1 className="ec-title">Event Corners</h1>
          <p className="ec-desc">
            Event Corners is a curated collection of ready-made setups and stations —
            coffee catering, decor, photo booths, and more — that you'll be able to add
            straight into your event. Each corner is put together and offered by Eventify
            itself, not an open marketplace of outside vendors.
          </p>
          <p className="ec-desc ec-desc-sub">
            We're still putting the first corners together. Once they're ready, you'll be
            able to browse them, view details, and book or purchase the ones that fit your event.
          </p>
        </div>

        <div className="ec-grid">
          {CORNER_PREVIEWS.map((c) => (
            <div key={c.name} className="ec-card">
              <div className="ec-card-icon">{c.icon}</div>
              <h3 className="ec-card-name">{c.name}</h3>
              <p className="ec-card-desc">{c.desc}</p>
              <span className="ec-card-tag">Coming Soon</span>
            </div>
          ))}
        </div>

        <div className="ec-flow">
          <span>Browse My Corners</span>
          <span className="ec-flow-arrow">→</span>
          <span>View Corner Details</span>
          <span className="ec-flow-arrow">→</span>
          <span>Book or Purchase</span>
          <span className="ec-flow-arrow">→</span>
          <span>Manage Booking / Order</span>
        </div>
      </div>
    </div>
  );
}

export default EventCorners;
