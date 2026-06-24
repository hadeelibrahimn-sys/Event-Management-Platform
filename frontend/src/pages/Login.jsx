import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login:", email, password);
  };

  return (
    <div className="login-page">

      {/* Shared Navbar */}
      <Navbar />

      {/* Centered login card */}
      <div className="login-container">

        <div className="login-avatar">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>

        <div className="login-card">
          <h2 className="login-title">Log In</h2>

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="login-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="login-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="login-forgot">
              <Link to="/forgot-password" className="login-forgot-link">
                Forgot password?
              </Link>
            </div>
            <button type="submit" className="login-btn">Log in</button>
          </form>

          <p className="login-signup-text">
            Don't have an account?{" "}
            <Link to="/register" className="login-signup-link">Sign up</Link>
          </p>
        </div>
      </div>

      {/* Shared Footer */}
      <Footer />

    </div>
  );
}

export default Login;
