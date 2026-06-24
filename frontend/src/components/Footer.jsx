import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">

      {/* Divider line */}
      <div className="footer-divider" />

      <div className="footer-content">

        {/* Left: brand */}
        <div className="footer-brand">
          <p className="footer-logo">EVENTIFY</p>
          <p className="footer-tagline">
            Discover. Plan. Attend.<br />
            Make every event unforgettable.
          </p>
        </div>

        {/* Right: follow us + icons */}
        <div className="footer-socials">
          <p className="footer-follow">Follow us</p>
          <div className="footer-icons">

            {/* Instagram */}
            <div className="footer-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#555" strokeWidth="1.8">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="#555" />
              </svg>
            </div>

            {/* TikTok */}
            <div className="footer-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#555" strokeWidth="1.8">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </div>

            {/* WhatsApp */}
            <div className="footer-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#555" strokeWidth="1.8">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6
                  4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0
                  1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1
                  3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
