import React from "react";

/**
 * rflectr Badge — a small status/label chip. Tones carry meaning:
 * `relay` (core/route), `provider` (green, connected), `tool` (violet),
 * `gold` (premium/brand), `local` (the 127.0.0.1 / runs-local affordance),
 * plus severities. `dot` adds a leading status dot; `mono` sets the label in
 * the values typeface (ids, ports, counts).
 */
export function Badge({ children, tone = "neutral", dot = false, mono = false, style, ...rest }) {
  const tones = {
    relay:    { fg: "var(--relay)",    bg: "var(--relay-subtle)",    bd: "var(--relay-border)" },
    provider: { fg: "var(--provider)", bg: "var(--provider-subtle)", bd: "var(--provider-border)" },
    tool:     { fg: "var(--tool)",     bg: "var(--tool-subtle)",     bd: "var(--tool-border)" },
    gold:     { fg: "var(--gold)",     bg: "var(--gold-subtle)",     bd: "var(--gold-border)" },
    local:    { fg: "var(--local)",    bg: "var(--local-subtle)",    bd: "var(--provider-border)" },
    neutral:  { fg: "var(--text-secondary)", bg: "var(--bg-elevated)", bd: "var(--border-default)" },
    info:     { fg: "var(--info)",     bg: "var(--info-bg)",         bd: "rgba(91,141,239,0.34)" },
    warning:  { fg: "var(--warning)",  bg: "var(--warning-bg)",      bd: "rgba(242,162,60,0.34)" },
    critical: { fg: "var(--critical)", bg: "var(--critical-bg)",     bd: "rgba(240,85,106,0.34)" },
    success:  { fg: "var(--success)",  bg: "var(--success-bg)",      bd: "var(--provider-border)" },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: "var(--radius-full)",
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.fg,
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: mono ? "11px" : "var(--text-xs)",
        fontWeight: mono ? 500 : 600,
        letterSpacing: mono ? "0" : "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", background: t.fg, flex: "none", boxShadow: `0 0 6px ${t.fg}` }} />
      )}
      {children}
    </span>
  );
}
