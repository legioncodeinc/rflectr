import React from "react";

/**
 * rflectr Card — the base surface. Defined by a 1px border on a surface fill,
 * 12px radius, NO drop shadow (border defines a card, not elevation). The one
 * expressive light is `glow` — "relay" / "gold" / "provider" — reserved for a
 * single focused element. `accent` paints a 2px edge on the left marking the
 * card's role (the route, a provider, a tool).
 */
export function Card({ children, glow, accent, padded = true, style, ...rest }) {
  const glows = { relay: "var(--glow-relay)", gold: "var(--glow-gold)", provider: "var(--glow-provider)" };
  const accents = { relay: "var(--relay)", provider: "var(--provider)", tool: "var(--tool)", gold: "var(--gold)" };

  return (
    <div
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: padded ? "var(--space-5)" : 0,
        boxShadow: glow ? glows[glow] : "none",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {accent && (
        <span
          aria-hidden="true"
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accents[accent] || "var(--relay)" }}
        />
      )}
      {children}
    </div>
  );
}
