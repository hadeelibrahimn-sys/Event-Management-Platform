import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import logoImage from "../assets/EventifyLogo.png";

function Navbar() {
  const location = useLocation();

  // Logged-in users should land back on their Dashboard, not the public
  // landing/login page — no reason to send them through that journey again.
  const isLoggedIn = Boolean(localStorage.getItem("token"));
  const homePath = isLoggedIn ? "/dashboard" : "/";

  return (
    <nav className="navbar">

      {/* Logo — now uses the real Eventify logo image */}
      <Link to={homePath} className="logo">
        <img src={logoImage} alt="Eventify Logo" className="logo-img" />
      </Link>

      {/* Nav Links */}
      <div className="nav-links">
        <Link to={homePath} className={location.pathname === homePath ? "active" : ""}>
          Home
        </Link>
        <Link to="/events" className={location.pathname === "/events" ? "active" : ""}>
          Events
        </Link>
        <Link to="/organisers" className={location.pathname.startsWith("/organisers") ? "active" : ""}>
          Organizers
        </Link>
        <Link to="/contact" className={location.pathname === "/contact" ? "active" : ""}>
          Contact
        </Link>
      </div>

      {/* Auth Links */}
      <div className="auth-links">
        <span className="search-icon">🔍</span>
        <Link to="/login" className="login-link">
          Log In
        </Link>
        <Link to="/register" className="register-link">
          Register
        </Link>
      </div>

    </nav>
  );
}

export default Navbar;
