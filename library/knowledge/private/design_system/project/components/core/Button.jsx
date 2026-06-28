import React from "react";

/**
 * rflectr Button. The relay-gradient primary is the single brand action per
 * region (blue→purple). `provider` (green) and `tool` (violet) carry the two
 * sides of the relay; secondary / ghost / gold round it out.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  iconLeft,
  iconRight,
  onClick,
  type = "button",
  style,
  ...rest
}) {
  const sizes = {
    sm: { height: 32, padding: "0 12px", font: "var(--text-sm)", gap: 6 },
    md: { height: 38, padding: "0 15px", font: "var(--text-sm)", gap: 8 },
    lg: { height: 46, padding: "0 22px", font: "var(--text-base)", gap: 10 },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary:   { background: "var(--relay-gradient)", color: "var(--relay-on)",   border: "1px solid transparent" },
    provider:  { background: "var(--provider-subtle)", color: "var(--provider)",  border: "1px solid var(--provider-border)" },
    tool:      { background: "var(--tool-subtle)",     color: "var(--tool)",      border: "1px solid var(--tool-border)" },
    secondary: { background: "var(--bg-elevated)",     color: "var(--text-primary)", border: "1px solid var(--border-strong)" },
    ghost:     { background: "transparent",            color: "var(--text-secondary)", border: "1px solid transparent" },
    gold:      { background: "transparent",            color: "var(--gold)",      border: "1px solid var(--gold-border)" },
    danger:    { background: "var(--critical-bg)",     color: "var(--critical)",  border: "1px solid var(--critical)" },
  };
  const v = variants[variant] || variants.primary;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    fontFamily: "var(--font-sans)",
    fontSize: s.font,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1,
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "filter var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
    whiteSpace: "nowrap",
    userSelect: "none",
    ...v,
    ...style,
  };

  const onEnter = (e) => {
    if (disabled) return;
    if (variant === "primary") e.currentTarget.style.filter = "brightness(1.12)";
    else if (variant === "secondary") e.currentTarget.style.background = "var(--bg-subtle)";
    else if (variant === "ghost") e.currentTarget.style.background = "var(--bg-elevated)";
    else if (variant === "gold") e.currentTarget.style.background = "var(--gold-subtle)";
    else e.currentTarget.style.filter = "brightness(1.15)";
  };
  const onLeave = (e) => { if (!disabled) { e.currentTarget.style.filter = "none"; e.currentTarget.style.background = v.background; } };
  const onDown = (e) => { if (!disabled) e.currentTarget.style.transform = "translateY(1px)"; };
  const onUp = (e) => { if (!disabled) e.currentTarget.style.transform = "none"; };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={base}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={onDown}
      onMouseUp={onUp}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
