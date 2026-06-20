import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="logo">
        <div className="logo-icon">C</div>
        <div className="logo-text">
          <span className="logo-name">Eventify</span>
        </div>
      </Link>

      {/* Nav Links */}
      <div className="nav-links">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          Home
        </Link>
        <Link to="/events" className={location.pathname === "/events" ? "active" : ""}>
          Events
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
