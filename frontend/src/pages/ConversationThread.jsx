import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./ConversationThread.css";

const POLL_MS = 5000;

function formatTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ConversationThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    if (currentUser) setCurrentUserId(currentUser.user_id);
  }, []);

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/messages/${id}` } });
      return;
    }

    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        if (!silent) setError(data.message || "Could not load this conversation.");
        return;
      }
      setMessages(data.messages || []);
      setOtherUser(data.otherUser || null);
    } catch (err) {
      if (!silent) setError("Something went wrong loading this conversation.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadMessages();
    // Light polling, not real-time infrastructure — just a periodic refetch
    // so a reply shows up without a manual reload.
    const interval = setInterval(() => loadMessages({ silent: true }), POLL_MS);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;

    const token = localStorage.getItem("token");
    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not send message.");
        return;
      }
      setMessages((prev) => [...prev, data]);
      setDraft("");
    } catch (err) {
      setError("Something went wrong sending your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ct-page">
      <Navbar />

      <div className="ct-content">
        <button className="ct-back-link" onClick={() => navigate("/messages")}>← Back to Messages</button>

        {loading && <p className="event-list-status">Loading conversation...</p>}
        {!loading && error && messages.length === 0 && (
          <p className="event-list-status event-list-status--error">{error}</p>
        )}

        {!loading && (messages.length > 0 || !error) && (
          <div className="ct-card">
            <div className="ct-header">
              <div className="ct-avatar">{otherUser?.full_name?.charAt(0).toUpperCase()}</div>
              <h2 className="ct-name">{otherUser?.full_name || "Conversation"}</h2>
            </div>

            <div className="ct-messages">
              {messages.length === 0 && (
                <p className="ct-empty-hint">This is the start of your conversation. Say hello 👋</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.message_id}
                  className={`ct-bubble-row ${m.sender_id === currentUserId ? "mine" : "theirs"}`}
                >
                  <div className="ct-bubble">
                    <p className="ct-bubble-body">{m.body}</p>
                    <span className="ct-bubble-time">{formatTime(m.created_at)}</span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {error && <p className="ct-inline-error">{error}</p>}

            <div className="ct-composer">
              <textarea
                className="ct-composer-input"
                placeholder="Write a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button className="ct-send-btn" onClick={handleSend} disabled={sending || !draft.trim()}>
                {sending ? "..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationThread;
