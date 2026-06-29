import React from "react";

/**
 * rflectr Input — text field on an inset well. `mono` sets the value in the
 * values typeface (for ids, ports, paths, search). `accent` tints the focus
 * ring (relay / provider / tool). Supports a leading icon and an inline affix.
 */
export function Input({
  value,
  defaultValue,
  onChange,
  placeholder,
  mono = false,
  accent = "relay",
  iconLeft,
  affix,
  disabled = false,
  type = "text",
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const ring = { relay: "var(--relay)", provider: "var(--provider)", tool: "var(--tool)" }[accent] || "var(--relay)";
  const ringSubtle = { relay: "var(--relay-border)", provider: "var(--provider-border)", tool: "var(--tool-border)" }[accent] || "var(--relay-border)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 38,
        padding: "0 12px",
        background: "var(--bg-inset)",
        border: `1px solid ${focused ? ring : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: focused ? `0 0 0 3px ${ringSubtle}` : "none",
        transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {iconLeft && <span style={{ display: "flex", color: "var(--text-tertiary)", flex: "none" }}>{iconLeft}</span>}
      <input
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: mono ? "var(--text-sm)" : "var(--text-base)",
          letterSpacing: mono ? "0" : "-0.005em",
        }}
        {...rest}
      />
      {affix && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", flex: "none" }}>{affix}</span>}
    </div>
  );
}
