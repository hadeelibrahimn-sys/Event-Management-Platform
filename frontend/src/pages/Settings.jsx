import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Settings.css";

function Settings() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { state: { from: "/settings" } });
        return;
      }

      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setLoadError(data.message || "Could not load your account.");
          return;
        }
        if (!cancelled) {
          setForm({ full_name: data.user.full_name || "", email: data.user.email || "" });
        }
      } catch (err) {
        if (!cancelled) setLoadError("Something went wrong loading your account.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSubmit = async () => {
    setSubmitError("");

    if (!form.full_name.trim() || !form.email.trim()) {
      setSubmitError("Full name and email are both required.");
      return;
    }

    const token = localStorage.getItem("token");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.message || "Could not save your changes.");
        return;
      }

      // Keep the locally-stored user in sync so the rest of the app
      // (welcome message, ownership checks, etc.) reflects the new values.
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      localStorage.setItem("user", JSON.stringify({ ...storedUser, ...data.user }));

      setSaved(true);
    } catch (err) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordSaved(false);
  };

  const handlePasswordSubmit = async () => {
    setPasswordError("");

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in all three password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }

    const token = localStorage.getItem("token");
    setPasswordSubmitting(true);
    try {
      const response = await fetch("/api/auth/me/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.message || "Could not change your password.");
        return;
      }

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="set-page">
      <Navbar />

      <div className="set-content">
        <h1 className="set-title">Settings</h1>
        <p className="set-subtitle">Update your account's name and email.</p>

        {loading && <p className="event-list-status">Loading...</p>}
        {!loading && loadError && <p className="event-list-status event-list-status--error">{loadError}</p>}

        {!loading && !loadError && (
          <div className="set-card">
            <div className="set-field">
              <label className="set-label">Full Name</label>
              <input
                type="text"
                className="set-input"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
              />
            </div>

            <div className="set-field">
              <label className="set-label">Email</label>
              <input
                type="email"
                className="set-input"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            {submitError && <p className="set-error">{submitError}</p>}
            {saved && <p className="set-saved">Saved.</p>}

            <button className="set-save-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <div className="set-card set-card-spaced">
            <h2 className="set-card-heading">Change Password</h2>

            <div className="set-field">
              <label className="set-label">Current Password</label>
              <input
                type="password"
                className="set-input"
                value={passwordForm.currentPassword}
                onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
              />
            </div>

            <div className="set-field">
              <label className="set-label">New Password</label>
              <input
                type="password"
                className="set-input"
                value={passwordForm.newPassword}
                onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
              />
            </div>

            <div className="set-field">
              <label className="set-label">Confirm New Password</label>
              <input
                type="password"
                className="set-input"
                value={passwordForm.confirmPassword}
                onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
              />
            </div>

            {passwordError && <p className="set-error">{passwordError}</p>}
            {passwordSaved && <p className="set-saved">Password updated.</p>}

            <button className="set-save-btn" onClick={handlePasswordSubmit} disabled={passwordSubmitting}>
              {passwordSubmitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
