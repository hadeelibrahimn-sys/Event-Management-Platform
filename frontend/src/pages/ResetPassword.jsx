import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import resetpassImage from "../assets/resetpass.png";
import "./ResetPassword.css";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: connect to backend — verify token and update password
    console.log("Reset password:", password);
  };

  return (
    <div className="rp-page">

      {/* Shared Navbar */}
      <Navbar />

      {/* Main content */}
      <div className="rp-content">

        {/* Left: form */}
        <div className="rp-left">

          <h1 className="rp-title">Reset Your<br />Password</h1>

          <p className="rp-subtitle">
            Create a new password for your account.<br />
            Make sure it's strong and secure.
          </p>

          <form className="rp-form" onSubmit={handleSubmit}>

            {/* New Password */}
            <label className="rp-label">New Password</label>
            <div className="rp-input-wrapper">
              {/* Lock icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#9080b0" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                className="rp-input"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {/* Eye icon toggle */}
              <span className="rp-eye" onClick={() => setShowPassword(!showPassword)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#9080b0" strokeWidth="1.8">
                  {showPassword
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </span>
            </div>

            {/* Confirm Password */}
            <label className="rp-label">Confirm Password</label>
            <div className="rp-input-wrapper">
              {/* Lock icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#9080b0" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showConfirm ? "text" : "password"}
                className="rp-input"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {/* Eye icon toggle */}
              <span className="rp-eye" onClick={() => setShowConfirm(!showConfirm)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#9080b0" strokeWidth="1.8">
                  {showConfirm
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </span>
            </div>

            {/* Reset Password button */}
            <button type="submit" className="rp-btn">
              Reset Password
            </button>

          </form>

          {/* Back to Login */}
          <Link to="/login" className="rp-back-link">
            ← Back to Login
          </Link>

        </div>

        {/* Right: illustration */}
        <div className="rp-right">
          <img
            src={resetpassImage}
            alt="Reset password illustration"
            className="rp-illustration"
          />
        </div>

      </div>

      {/* Shared Footer */}
      <Footer />

    </div>
  );
}

export default ResetPassword;
