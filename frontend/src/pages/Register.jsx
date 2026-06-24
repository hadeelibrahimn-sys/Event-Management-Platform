import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Register.css";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Register:", name, email, password);
  };

  return (
    <div className="register-page">

      {/* Shared Navbar */}
      <Navbar />

      {/* Main card */}
      <div className="register-card">

        {/* Left: decorative geometric shapes */}
        <div className="register-left">
          <div className="geo-shape geo-shape-1" />
          <div className="geo-shape geo-shape-2" />
          <div className="geo-shape geo-shape-3" />
        </div>

        {/* Right: title + form */}
        <div className="register-right">
          <h1 className="register-page-title">Sign Up</h1>
          <p className="register-subtitle">
            Enter your personal details and start journey with us
          </p>

          <form className="register-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="register-input"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              className="register-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="register-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              className="register-input"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <p className="register-signin-text">
              Already have an account?{" "}
              <Link to="/login" className="register-signin-link">Sign in</Link>
            </p>

            <button type="submit" className="register-btn">Sign Up</button>
          </form>
        </div>
      </div>

      {/* Shared Footer */}
      <Footer />

    </div>
  );
}

export default Register;
