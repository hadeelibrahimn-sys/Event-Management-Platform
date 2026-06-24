import Navbar from "../components/Navbar";
import about1 from "../assets/about1.png";
import about2 from "../assets/about2.png";
import "./About.css";

function About() {
  return (
    <div className="about-page">
      <Navbar />

      <div className="about-content">

        {/* ── SECTION 1: Hero ── */}
        <section className="about-hero">

          {/* Left: text */}
          <div className="about-hero-left">
            <p className="about-label">ABOUT US ——</p>
            <h1 className="about-hero-title">
              Bringing People<br />
              Together Through<br />
              Unforgettable Events
            </h1>
            <p className="about-hero-desc">
              Eventify is a unified platform that helps you discover, create,
              plan and manage events with ease. Whether you're organising
              an intimate gathering or a large-scale celebration, we provide
              the tools, services and support to make it seamless.
            </p>
          </div>

          {/* Right: ONE image only + Our Mission card */}
          <div className="about-hero-right">

            {/* Single top image only */}
            <img src={about1} alt="Event" className="about-img-1" />

            {/* Our Mission card */}
            <div className="our-mission-card">
              <div className="mission-icon-row">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#7c3aed" strokeWidth="1.8">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
                <span className="mission-label">Our Mission</span>
              </div>
              <p className="mission-text">
                To simplify event planning and bring ideas to life by
                connecting people, services and experiences in one
                powerful platform.
              </p>
            </div>

          </div>
        </section>

        {/* ── SECTION 2: Who We Are ── */}
        <section className="about-who">

          {/* Left: about2 image only here */}
          <div className="who-image-wrapper">
            <img src={about2} alt="Who we are" className="who-image" />
          </div>

          {/* Right: text + stats */}
          <div className="who-right">
            <h2 className="who-title">Who We Are</h2>
            <p className="who-desc">
              Eventify was created to solve the challenges of fragmented event planning.
              We bring everything together in one place — from finding the right services
              to managing every detail of your event.
            </p>
            <p className="who-desc">
              Our platform empowers organisers, connects service providers, and
              creates memorable experiences for attendees.
            </p>

            {/* Stats */}
            <div className="who-stats">
              <div className="stat-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#7c3aed" strokeWidth="1.8">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
                <div>
                  <p className="stat-number">10K+</p>
                  <p className="stat-label">Happy Users</p>
                </div>
              </div>
              <div className="stat-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#7c3aed" strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <div>
                  <p className="stat-number">5K+</p>
                  <p className="stat-label">Events Hosted</p>
                </div>
              </div>
              <div className="stat-item">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#7c3aed" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
                <div>
                  <p className="stat-number">500+</p>
                  <p className="stat-label">Trusted Partners</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: What We Do ── */}
        <section className="about-what">
          <h2 className="what-title">What We Do</h2>
          <div className="what-underline" />

          <div className="what-cards">
            <div className="what-card">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#7c3aed" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
              </svg>
              <p className="what-card-title">Discover Events</p>
              <p className="what-card-desc">Find amazing events happening near you or around the world.</p>
            </div>

            <div className="what-card">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#7c3aed" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M12 5v14M5 12h14" />
              </svg>
              <p className="what-card-title">Create & Manage</p>
              <p className="what-card-desc">Create your own events and manage every detail effortlessly.</p>
            </div>

            <div className="what-card">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#7c3aed" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p className="what-card-title">Book Services</p>
              <p className="what-card-desc">Browse and book trusted services for your perfect event.</p>
            </div>

            <div className="what-card">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#7c3aed" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="what-card-title">Connect Easily</p>
              <p className="what-card-desc">Communicate with organisers and service providers seamlessly.</p>
            </div>

            <div className="what-card">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#7c3aed" strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <p className="what-card-title">Plan Smarter</p>
              <p className="what-card-desc">Get guided recommendations and plan your event with ease.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default About;
