import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImage from "../assets/EventifyLogo.png";
import "./CustomerDashboard.css";

// Lavender SVG icons
const Icons = {
  Home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  DiscoverEvents: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  EventCorners: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/><circle cx="12" cy="7" r="1" fill="#a78bfa"/></svg>,
  FindOrganizers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  CreateEvents: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>,
  MyEventsTickets: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>,
  SavedEvents: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  Messages: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  AboutUs: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeNav, setActiveNav] = useState("Home");
  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/bookings/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => {
        const today = new Date().toISOString().slice(0, 10);
        const upcomingBookings = (data.bookings || [])
          .filter((b) => b.status === "confirmed" && b.start_date && b.start_date.slice(0, 10) >= today)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          .slice(0, 3);
        setUpcoming(upcomingBookings);
      })
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));

    fetch("/api/events/recommended", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((data) => setRecommended(data.events || []))
      .catch(() => {})
      .finally(() => setRecommendedLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { name: "Home", icon: Icons.Home, path: null },
    { name: "Discover Events", icon: Icons.DiscoverEvents, path: "/events" },
    { name: "Event Corners", icon: Icons.EventCorners, path: "/event-corners" },
    { name: "Find Organizers",     icon: Icons.FindOrganizers, path: "/organisers" },
    { name: "Create Events", icon: Icons.CreateEvents, path: "/create-event" },
    { name: "My Events & Tickets", icon: Icons.MyEventsTickets, path: "/my-events" },
    { name: "Saved Events",        icon: Icons.SavedEvents, path: "/saved-events" },
    { name: "Messages",            icon: Icons.Messages, path: "/messages" },
    { name: "Settings",            icon: Icons.Settings, path: "/settings" },
    { name: "About us", icon: Icons.AboutUs, path: "/about" },
  ];

  return (
    <div className="dashboard-page">

      {/* ── Sidebar ── */}
      <aside className="dashboard-sidebar">

        <div className="sidebar-logo">
          <img src={logoImage} alt="Eventify" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
           <button
           key={item.name}
           className={`sidebar-nav-item ${activeNav === item.name ? "active" : ""}`}
           onClick={() => {
             setActiveNav(item.name);
             if (item.path) navigate(item.path);
           }}
         >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Simulation card */}
        <div className="sidebar-simulation-card">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          <p className="simulation-title">Simulate your event before it happens</p>
          <p className="simulation-desc">Preview and customise layouts to bring your event to life.</p>
          <button className="simulation-btn" onClick={() => navigate("/simulation")}>
            Open Simulation Tool → </button>
        </div>

      </aside>

      {/* ── Main Content ── */}
      <main className="dashboard-main">

        {/* Top bar */}
        <div className="dashboard-topbar">
          <div className="topbar-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Search events, organisers..." className="topbar-search-input" />
          </div>
          <div className="topbar-right">
            <button className="topbar-bell">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button 
            className="topbar-contact-btn" 
            onClick={() => window.open("/contact", "_blank")}
            >Get in Touch </button>
            <div className="topbar-avatar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Welcome */}
        <div className="dashboard-welcome">
          <p className="welcome-text">Welcome back, {user?.full_name?.split(" ")[0]}! 👋</p>
        </div>

        {/* Content grid */}
        <div className="dashboard-grid">
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Upcoming Events</h2>
              <button className="section-view-all" onClick={() => navigate("/my-events?tab=attending")}>View all</button>
            </div>
            {!upcomingLoading && upcoming.length === 0 && (
              <div className="section-content">
                <p className="empty-state">No upcoming events yet.</p>
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="section-list">
                {upcoming.map((b) => (
                  <div key={b.booking_id} className="dash-item" onClick={() => navigate(`/events/${b.event_id}`)}>
                    <div
                      className="dash-item-thumb"
                      style={b.image_url ? { backgroundImage: `url(${b.image_url})` } : undefined}
                    />
                    <div className="dash-item-info">
                      <p className="dash-item-title">{b.title}</p>
                      <p className="dash-item-meta">{formatDate(b.start_date)}{b.venue_name ? ` · ${b.venue_name}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-section recommended">
            <div className="section-header">
              <h2 className="section-title">Recommended for you</h2>
              <button className="section-view-all" onClick={() => navigate("/events")}>View all</button>
            </div>
            {!recommendedLoading && recommended.length === 0 && (
              <div className="section-content">
                <p className="empty-state">No recommendations yet.</p>
              </div>
            )}
            {recommended.length > 0 && (
              <div className="section-list">
                {recommended.map((ev) => (
                  <div key={ev.event_id} className="dash-item" onClick={() => navigate(`/events/${ev.event_id}`)}>
                    <div
                      className="dash-item-thumb"
                      style={ev.image_url ? { backgroundImage: `url(${ev.image_url})` } : undefined}
                    />
                    <div className="dash-item-info">
                      <p className="dash-item-title">{ev.title}</p>
                      <p className="dash-item-meta">{ev.category_group || ev.category || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button className="dashboard-logout" onClick={handleLogout}>Log out</button>

      </main>
    </div>
  );
}

export default CustomerDashboard;
