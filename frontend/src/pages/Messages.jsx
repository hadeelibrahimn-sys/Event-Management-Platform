import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Messages.css";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/messages" } });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not load your messages.");
        return;
      }
      setConversations(data.conversations || []);
    } catch (err) {
      setError("Something went wrong loading your messages.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="msg-page">
      <Navbar />

      <div className="msg-content">
        <h1 className="msg-title">Messages</h1>

        {loading && <p className="event-list-status">Loading your messages...</p>}
        {!loading && error && <p className="event-list-status event-list-status--error">{error}</p>}

        {!loading && !error && conversations.length === 0 && (
          <div className="msg-empty">
            <p>No conversations yet.</p>
            <button className="msg-explore-btn" onClick={() => navigate("/organisers")}>
              Find an organizer to contact
            </button>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="msg-list">
            {conversations.map((c) => (
              <div
                key={c.conversation_id}
                className={`msg-row ${c.unread ? "unread" : ""}`}
                onClick={() => navigate(`/messages/${c.conversation_id}`)}
              >
                <div className="msg-avatar">{c.other_user_name?.charAt(0).toUpperCase()}</div>
                <div className="msg-row-info">
                  <div className="msg-row-top">
                    <h3 className="msg-row-name">{c.other_user_name}</h3>
                    <span className="msg-row-time">{timeAgo(c.last_message_at || c.updated_at)}</span>
                  </div>
                  <p className="msg-row-preview">
                    {c.last_message || "Say hello 👋"}
                  </p>
                </div>
                {c.unread && <span className="msg-unread-dot" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
