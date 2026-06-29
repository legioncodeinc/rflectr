import React from "react";
import { Badge } from "../core/Badge.jsx";

/**
 * ProviderCard — a connected backend in the registry (Zen/Go, Groq, OpenAI,
 * Mistral, DeepSeek, Gemini, Ollama, OpenRouter, Vertex…). Shows the provider
 * monogram, its key status (keychain / missing / OAuth — the key is NEVER
 * shown), and how many models it exposes. The selected provider gets the
 * relay glow.
 */
export function ProviderCard({ name, monogram, brandColor = "var(--relay)", status = "connected", models, note, selected = false, onClick, style, ...rest }) {
  const statusMap = {
    connected: { tone: "provider", dot: true, label: "keychain", key: "key stored in keychain" },
    missing:   { tone: "warning",  dot: true, label: "missing key", key: "no key — add to connect" },
    oauth:     { tone: "relay",    dot: true, label: "OAuth", key: "authorized via OAuth" },
    local:     { tone: "local",    dot: true, label: "local", key: "runs on your machine" },
  };
  const st = statusMap[status] || statusMap.connected;
  const mono = (monogram || name || "?").slice(0, 2);

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "16px 16px 14px",
        background: "var(--bg-surface)",
        border: `1px solid ${selected ? "var(--relay-border)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: selected ? "var(--glow-relay)" : "none",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
        width: "100%",
        ...style,
      }}
      onMouseEnter={(e) => { if (onClick && !selected) e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { if (onClick && !selected) e.currentTarget.style.borderColor = "var(--border-default)"; }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
        <div style={{ width: 38, height: 38, flex: "none", borderRadius: "var(--radius-md)", background: "var(--bg-inset)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: brandColor, textTransform: "lowercase" }}>
          {mono}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          {typeof models === "number" && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>{models} models</div>
          )}
        </div>
        <Badge tone={st.tone} dot={st.dot}>{st.label}</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
        <KeyGlyph />
        {note || st.key}
      </div>
    </button>
  );
}

function KeyGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  );
}
