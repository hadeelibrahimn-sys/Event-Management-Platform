import Navbar from "../components/Navbar";
import contactImage from "../assets/contacts.png";
import "./Contact.css";

function Contact() {
  return (
    <div className="contact-page">
      <Navbar />

      <div className="contact-image-wrapper">

        {/* Image */}
        <div className="contact-image-container">
          <img
            src={contactImage}
            alt="Contact us"
            className="contact-image"
          />

          {/* Contact details overlaid on bottom-left of image */}
          <div className="contact-overlay">

            {/* Tagline */}
            <p className="contact-tagline">
              <strong>We'd love to hear from you.</strong><br />
              Whether you have a question, feedback,<br />
              or an event idea, our team is here to help.
            </p>

            {/* Email */}
            <div className="contact-email-row">
              <div className="contact-icon-circle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#2d1b5e" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 7 10-7" />
                </svg>
              </div>
              <span className="contact-email-text">Eventifysupport@gmail.com</span>
            </div>

            {/* Socials */}
            <div className="contact-socials">

              {/* Instagram */}
              <div className="contact-social-item">
                <div className="contact-icon-circle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#2d1b5e" strokeWidth="1.8">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="#2d1b5e" />
                  </svg>
                </div>
                <span className="contact-social-label">Eventifyofficial</span>
              </div>

              {/* TikTok */}
              <div className="contact-social-item">
                <div className="contact-icon-circle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#2d1b5e" strokeWidth="1.8">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                </div>
                <span className="contact-social-label">Eventifyofficial</span>
              </div>

              {/* WhatsApp */}
              <div className="contact-social-item">
                <div className="contact-icon-circle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#2d1b5e" strokeWidth="1.8">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6
                      4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0
                      1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1
                      3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <span className="contact-social-label">+966 538601397</span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Contact;
