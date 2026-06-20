import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import heroImage from "../assets/hero-illustration.png";
import "./Home.css";

function Home() {
  return (
    <div className="home-page">
      <Navbar />

      <section className="hero">
        {/* Left: Hero Illustration - takes up full left half */}
        <div className="hero-image-wrapper">
          <img
            src={heroImage}
            alt="Event planning illustration"
            className="hero-image"
          />
        </div>

        {/* Right: Hero Content */}
        <div className="hero-content">
          <h1 className="hero-title">
            Plan, Create &<br />
            <span className="highlight">Discover</span> Events
          </h1>
          <p className="hero-subtitle">
            Everything you need to find, manage and attend events all in one place
          </p>
          <Link to="/about" className="hero-cta">
            About us
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
