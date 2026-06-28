import React from "react";
import { Badge } from "../core/Badge.jsx";

/**
 * ModelRow — one model in the catalog. The id is mono (it's a real value you
 * copy/switch to). The format badge tells the truth about support: native,
 * SDK-translated, or unsupported. Star to favorite (up to 20 for mid-session
 * /model switching).
 */
export function ModelRow({ id, family, format = "translated", context, cost, backend, favorite = false, onToggleFavorite, onClick, style, ...rest }) {
  const formats = {
    native:      { tone: "provider", label: "native" },
    translated:  { tone: "relay",    label: "SDK-translated" },
    unsupported: { tone: "neutral",  label: "unsupported" },
  };
  const f = formats[format] || formats.translated;
  const dim = format === "unsupported";

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "26px minmax(0,1fr) 130px 64px 96px",
        alignItems: "center",
        gap: 14,
        padding: "11px 14px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        cursor: onClick ? "pointer" : "default",
        opacity: dim ? 0.6 : 1,
        transition: "border-color var(--dur-fast)",
        ...style,
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = "var(--border-default)"; }}
      {...rest}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(); }}
        title={favorite ? "Unfavorite" : "Favorite"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "none", background: "transparent", cursor: "pointer", color: favorite ? "var(--gold)" : "var(--text-disabled)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 2.5 14.1 8l6 .9-4.3 4.2 1 6-5.3-2.8L6.2 19l1-6L3 8.8l6-.9z" />
        </svg>
      </button>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{id}</div>
        {family && <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 1 }}>{family}</div>}
      </div>

      <div><Badge tone={f.tone} mono>{f.label}</Badge></div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", textAlign: "right" }}>{context || "—"}</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: dim ? "var(--text-tertiary)" : "var(--text-secondary)" }}>{cost || "—"}</span>
        {backend && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-tertiary)" }}>{backend}</span>}
      </div>
    </div>
  );
}
