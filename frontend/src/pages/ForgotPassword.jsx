import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import forgetpassImage from "../assets/forgetpass.png";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Reset link sent to:", email);
  };

  return (
    <div className="fp-page">

      {/* Shared Navbar */}
      <Navbar />

      {/* Main content */}
      <div className="fp-content">

        {/* Left: form */}
        <div className="fp-left">
          <h1 className="fp-title">Forgot Your<br />Password?</h1>
          <p className="fp-subtitle">
            No worries! Enter your email address and<br />
            we'll send you a reset link to your inbox.
          </p>

          <form className="fp-form" onSubmit={handleSubmit}>
            <label className="fp-label">Email Address</label>
            <div className="fp-input-wrapper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#9080b0" strokeWidth="1.8">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 7l10 7 10-7" />
              </svg>
              <input
                type="email"
                className="fp-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="fp-btn">Send Reset Link</button>
          </form>

          <Link to="/login" className="fp-back-link">← Back to Login</Link>
        </div>

        {/* Right: illustration */}
        <div className="fp-right">
          <img
            src={forgetpassImage}
            alt="Forgot password illustration"
            className="fp-illustration"
          />
        </div>

      </div>

      {/* Shared Footer */}
      <Footer />

    </div>
  );
}

export default ForgotPassword;
