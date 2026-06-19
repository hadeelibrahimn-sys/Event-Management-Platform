import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <h2>Eventify</h2>

      <Link to="/">Home</Link>
      <Link to="/events">Events</Link>
      <Link to="/about">About</Link>
      <Link to="/contact">Contact</Link>

      <Link to="/login">Log In</Link>
      <Link to="/register">Register</Link>
    </nav>
  );
}

export default Navbar;
