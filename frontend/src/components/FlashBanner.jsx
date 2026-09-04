import { useEffect, useState } from "react";

// This banner shows success or error messages after navigation.
// It disappears automatically after a few seconds.
// The user can also close it manually.
// Simple inline styles are used so it can fit easily into different pages.

function FlashBanner({ message, tone = "success", onDismiss, autoHideMs = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (!autoHideMs) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [message, autoHideMs, onDismiss]);

  if (!message || !visible) return null;

  const palette = tone === "error"
    ? { bg: "#fde8e8", color: "#b91c1c", border: "#f5b8b8" }
    : { bg: "#e3f7ea", color: "#15803d", border: "#b8e8c8" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        background: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: "12px 18px",
        fontFamily: "'Poppins', sans-serif",
        fontSize: 13.5,
        fontWeight: 500,
        marginBottom: 20,
      }}
    >
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); onDismiss?.(); }}
        style={{
          background: "none",
          border: "none",
          color: palette.color,
          fontSize: 16,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
          opacity: 0.7,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export default FlashBanner;
