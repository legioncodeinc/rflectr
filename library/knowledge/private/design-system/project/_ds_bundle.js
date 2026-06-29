/* @ds-bundle: {"format":3,"namespace":"RflectrDesignSystem_53c68e","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"ModelRow","sourcePath":"components/relay/ModelRow.jsx"},{"name":"ProviderCard","sourcePath":"components/relay/ProviderCard.jsx"},{"name":"RelayMark","sourcePath":"components/relay/RelayMark.jsx"},{"name":"RouteFlow","sourcePath":"components/relay/RouteFlow.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"353264c7f889","components/core/Button.jsx":"f20d7dcdec3c","components/core/Card.jsx":"5db7aaf23a37","components/core/Input.jsx":"31d18e27bc5c","components/relay/ModelRow.jsx":"dd90ddd0db97","components/relay/ProviderCard.jsx":"a0392c396ef1","components/relay/RelayMark.jsx":"cddc7ed2bdde","components/relay/RouteFlow.jsx":"80dde5488ff8","ui_kits/dashboard/chrome.jsx":"a6831ba88028","ui_kits/dashboard/data.js":"e930023dc51c","ui_kits/dashboard/screens.jsx":"0f8032e033df","ui_kits/dashboard/screens2.jsx":"2afeaac3d50e","ui_kits/site/sections.jsx":"f1fe648b5e1e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RflectrDesignSystem_53c68e = window.RflectrDesignSystem_53c68e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * rflectr Badge — a small status/label chip. Tones carry meaning:
 * `relay` (core/route), `provider` (green, connected), `tool` (violet),
 * `gold` (premium/brand), `local` (the 127.0.0.1 / runs-local affordance),
 * plus severities. `dot` adds a leading status dot; `mono` sets the label in
 * the values typeface (ids, ports, counts).
 */
function Badge({
  children,
  tone = "neutral",
  dot = false,
  mono = false,
  style,
  ...rest
}) {
  const tones = {
    relay: {
      fg: "var(--relay)",
      bg: "var(--relay-subtle)",
      bd: "var(--relay-border)"
    },
    provider: {
      fg: "var(--provider)",
      bg: "var(--provider-subtle)",
      bd: "var(--provider-border)"
    },
    tool: {
      fg: "var(--tool)",
      bg: "var(--tool-subtle)",
      bd: "var(--tool-border)"
    },
    gold: {
      fg: "var(--gold)",
      bg: "var(--gold-subtle)",
      bd: "var(--gold-border)"
    },
    local: {
      fg: "var(--local)",
      bg: "var(--local-subtle)",
      bd: "var(--provider-border)"
    },
    neutral: {
      fg: "var(--text-secondary)",
      bg: "var(--bg-elevated)",
      bd: "var(--border-default)"
    },
    info: {
      fg: "var(--info)",
      bg: "var(--info-bg)",
      bd: "rgba(91,141,239,0.34)"
    },
    warning: {
      fg: "var(--warning)",
      bg: "var(--warning-bg)",
      bd: "rgba(242,162,60,0.34)"
    },
    critical: {
      fg: "var(--critical)",
      bg: "var(--critical-bg)",
      bd: "rgba(240,85,106,0.34)"
    },
    success: {
      fg: "var(--success)",
      bg: "var(--success-bg)",
      bd: "var(--provider-border)"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "var(--radius-full)",
      background: t.fg,
      flex: "none",
      boxShadow: `0 0 6px ${t.fg}`
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * rflectr Button. The relay-gradient primary is the single brand action per
 * region (blue→purple). `provider` (green) and `tool` (violet) carry the two
 * sides of the relay; secondary / ghost / gold round it out.
 */
function Button({
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
    sm: {
      height: 32,
      padding: "0 12px",
      font: "var(--text-sm)",
      gap: 6
    },
    md: {
      height: 38,
      padding: "0 15px",
      font: "var(--text-sm)",
      gap: 8
    },
    lg: {
      height: 46,
      padding: "0 22px",
      font: "var(--text-base)",
      gap: 10
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--relay-gradient)",
      color: "var(--relay-on)",
      border: "1px solid transparent"
    },
    provider: {
      background: "var(--provider-subtle)",
      color: "var(--provider)",
      border: "1px solid var(--provider-border)"
    },
    tool: {
      background: "var(--tool-subtle)",
      color: "var(--tool)",
      border: "1px solid var(--tool-border)"
    },
    secondary: {
      background: "var(--bg-elevated)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-strong)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid transparent"
    },
    gold: {
      background: "transparent",
      color: "var(--gold)",
      border: "1px solid var(--gold-border)"
    },
    danger: {
      background: "var(--critical-bg)",
      color: "var(--critical)",
      border: "1px solid var(--critical)"
    }
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
    ...style
  };
  const onEnter = e => {
    if (disabled) return;
    if (variant === "primary") e.currentTarget.style.filter = "brightness(1.12)";else if (variant === "secondary") e.currentTarget.style.background = "var(--bg-subtle)";else if (variant === "ghost") e.currentTarget.style.background = "var(--bg-elevated)";else if (variant === "gold") e.currentTarget.style.background = "var(--gold-subtle)";else e.currentTarget.style.filter = "brightness(1.15)";
  };
  const onLeave = e => {
    if (!disabled) {
      e.currentTarget.style.filter = "none";
      e.currentTarget.style.background = v.background;
    }
  };
  const onDown = e => {
    if (!disabled) e.currentTarget.style.transform = "translateY(1px)";
  };
  const onUp = e => {
    if (!disabled) e.currentTarget.style.transform = "none";
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: base,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onMouseDown: onDown,
    onMouseUp: onUp
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * rflectr Card — the base surface. Defined by a 1px border on a surface fill,
 * 12px radius, NO drop shadow (border defines a card, not elevation). The one
 * expressive light is `glow` — "relay" / "gold" / "provider" — reserved for a
 * single focused element. `accent` paints a 2px edge on the left marking the
 * card's role (the route, a provider, a tool).
 */
function Card({
  children,
  glow,
  accent,
  padded = true,
  style,
  ...rest
}) {
  const glows = {
    relay: "var(--glow-relay)",
    gold: "var(--glow-gold)",
    provider: "var(--glow-provider)"
  };
  const accents = {
    relay: "var(--relay)",
    provider: "var(--provider)",
    tool: "var(--tool)",
    gold: "var(--gold)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      padding: padded ? "var(--space-5)" : 0,
      boxShadow: glow ? glows[glow] : "none",
      overflow: "hidden",
      ...style
    }
  }, rest), accent && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      background: accents[accent] || "var(--relay)"
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * rflectr Input — text field on an inset well. `mono` sets the value in the
 * values typeface (for ids, ports, paths, search). `accent` tints the focus
 * ring (relay / provider / tool). Supports a leading icon and an inline affix.
 */
function Input({
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
  const ring = {
    relay: "var(--relay)",
    provider: "var(--provider)",
    tool: "var(--tool)"
  }[accent] || "var(--relay)";
  const ringSubtle = {
    relay: "var(--relay-border)",
    provider: "var(--provider-border)",
    tool: "var(--tool-border)"
  }[accent] || "var(--relay-border)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
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
      ...style
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      color: "var(--text-tertiary)",
      flex: "none"
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minWidth: 0,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "var(--text-primary)",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontSize: mono ? "var(--text-sm)" : "var(--text-base)",
      letterSpacing: mono ? "0" : "-0.005em"
    }
  }, rest)), affix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--text-tertiary)",
      flex: "none"
    }
  }, affix));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/relay/ModelRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ModelRow — one model in the catalog. The id is mono (it's a real value you
 * copy/switch to). The format badge tells the truth about support: native,
 * SDK-translated, or unsupported. Star to favorite (up to 20 for mid-session
 * /model switching).
 */
function ModelRow({
  id,
  family,
  format = "translated",
  context,
  cost,
  backend,
  favorite = false,
  onToggleFavorite,
  onClick,
  style,
  ...rest
}) {
  const formats = {
    native: {
      tone: "provider",
      label: "native"
    },
    translated: {
      tone: "relay",
      label: "SDK-translated"
    },
    unsupported: {
      tone: "neutral",
      label: "unsupported"
    }
  };
  const f = formats[format] || formats.translated;
  const dim = format === "unsupported";
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
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
      ...style
    },
    onMouseEnter: e => {
      if (onClick) e.currentTarget.style.borderColor = "var(--border-strong)";
    },
    onMouseLeave: e => {
      if (onClick) e.currentTarget.style.borderColor = "var(--border-default)";
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onToggleFavorite && onToggleFavorite();
    },
    title: favorite ? "Unfavorite" : "Favorite",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 26,
      height: 26,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: favorite ? "var(--gold)" : "var(--text-disabled)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: favorite ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11.5 2.5 14.1 8l6 .9-4.3 4.2 1 6-5.3-2.8L6.2 19l1-6L3 8.8l6-.9z"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13.5,
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, id), family && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--text-tertiary)",
      marginTop: 1
    }
  }, family)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: f.tone,
    mono: true
  }, f.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-secondary)",
      textAlign: "right"
    }
  }, context || "—"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: dim ? "var(--text-tertiary)" : "var(--text-secondary)"
    }
  }, cost || "—"), backend && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      color: "var(--text-tertiary)"
    }
  }, backend)));
}
Object.assign(__ds_scope, { ModelRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/relay/ModelRow.jsx", error: String((e && e.message) || e) }); }

// components/relay/ProviderCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ProviderCard — a connected backend in the registry (Zen/Go, Groq, OpenAI,
 * Mistral, DeepSeek, Gemini, Ollama, OpenRouter, Vertex…). Shows the provider
 * monogram, its key status (keychain / missing / OAuth — the key is NEVER
 * shown), and how many models it exposes. The selected provider gets the
 * relay glow.
 */
function ProviderCard({
  name,
  monogram,
  brandColor = "var(--relay)",
  status = "connected",
  models,
  note,
  selected = false,
  onClick,
  style,
  ...rest
}) {
  const statusMap = {
    connected: {
      tone: "provider",
      dot: true,
      label: "keychain",
      key: "key stored in keychain"
    },
    missing: {
      tone: "warning",
      dot: true,
      label: "missing key",
      key: "no key — add to connect"
    },
    oauth: {
      tone: "relay",
      dot: true,
      label: "OAuth",
      key: "authorized via OAuth"
    },
    local: {
      tone: "local",
      dot: true,
      label: "local",
      key: "runs on your machine"
    }
  };
  const st = statusMap[status] || statusMap.connected;
  const mono = (monogram || name || "?").slice(0, 2);
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: onClick,
    style: {
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
      ...style
    },
    onMouseEnter: e => {
      if (onClick && !selected) e.currentTarget.style.borderColor = "var(--border-strong)";
    },
    onMouseLeave: e => {
      if (onClick && !selected) e.currentTarget.style.borderColor = "var(--border-default)";
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      flex: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--bg-inset)",
      border: "1px solid var(--border-default)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      fontWeight: 600,
      color: brandColor,
      textTransform: "lowercase"
    }
  }, mono), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, name), typeof models === "number" && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  }, models, " models")), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: st.tone,
    dot: st.dot
  }, st.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(KeyGlyph, null), note || st.key));
}
function KeyGlyph() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 2-9.6 9.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7.5",
    cy: "15.5",
    r: "5.5"
  }));
}
Object.assign(__ds_scope, { ProviderCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/relay/ProviderCard.jsx", error: String((e && e.message) || e) }); }

// components/relay/RelayMark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _uid = 0;

/**
 * RelayMark — the rflectr product glyph as an inline SVG so it can scale and
 * recolor. A hexagon comb-cell containing the routing relay (tool → worker →
 * model). `variant="gradient"` is the app/UI mark (blue→purple); `mono`
 * inherits currentColor for favicon/CLI/single-color contexts.
 */
function RelayMark({
  size = 28,
  variant = "gradient",
  style,
  title = "rflectr",
  ...rest
}) {
  const id = React.useMemo(() => "rfm" + ++_uid, []);
  const stroke = variant === "mono" ? "currentColor" : `url(#${id})`;
  const fill = variant === "mono" ? "currentColor" : `url(#${id})`;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    role: "img",
    "aria-label": title,
    style: {
      display: "block",
      flex: "none",
      ...style
    }
  }, rest), variant !== "mono" && /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: id,
    x1: "8",
    y1: "20",
    x2: "56",
    y2: "44",
    gradientUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "var(--relay-from)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "var(--relay-to)"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M32 3 L57 17.5 L57 46.5 L32 61 L7 46.5 L7 17.5 Z",
    stroke: stroke,
    strokeWidth: "2.5",
    strokeOpacity: "0.5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 23 L25.5 32 L15 41",
    stroke: stroke,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M34 23 L44.5 32 L34 41",
    stroke: stroke,
    strokeWidth: "5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M29.6 32 L32 28.4 L34.4 32 L32 35.6 Z",
    fill: fill
  }));
}
Object.assign(__ds_scope, { RelayMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/relay/RelayMark.jsx", error: String((e && e.message) || e) }); }

// components/relay/RouteFlow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inject the flow keyframes once (self-contained animation). */
function ensureFlowKeyframes() {
  if (typeof document === "undefined" || document.getElementById("rf-flow-kf")) return;
  const s = document.createElement("style");
  s.id = "rf-flow-kf";
  s.textContent = "@keyframes rfFlow{0%{left:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:100%;opacity:0}}" + "@media (prefers-reduced-motion: reduce){.rf-flow-dot{display:none!important}}";
  document.head.appendChild(s);
}

/**
 * RouteFlow — the jeweled relay, visualized: a TOOL on the left and a MODEL on
 * the right, with rflectr routing between them. Restrained flowing dots show a
 * request travelling tool → rflectr → model. The signature "what's connected
 * and what it runs on" object.
 */
function RouteFlow({
  tool,
  model,
  backend,
  status = "ok",
  latency,
  animated = true,
  style,
  ...rest
}) {
  React.useEffect(() => {
    ensureFlowKeyframes();
  }, []);
  const statusColor = {
    ok: "var(--provider)",
    retry: "var(--warning)",
    error: "var(--critical)"
  }[status] || "var(--provider)";
  const Connector = ({
    delay
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: 1,
      height: 2,
      background: "var(--border-strong)",
      borderRadius: 2,
      overflow: "hidden",
      minWidth: 28
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      margin: "auto",
      width: 14,
      height: 2,
      borderRadius: 2,
      background: "linear-gradient(90deg, transparent, var(--relay))",
      animation: animated ? `rfFlow var(--dur-flow) linear ${delay}s infinite` : "none",
      left: 0
    },
    className: "rf-flow-dot"
  }));
  const Node = ({
    label,
    sub,
    color,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 7,
      flex: "none",
      width: 116
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-lg)",
      background: "var(--bg-inset)",
      border: `1px solid ${color}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      maxWidth: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      color: "var(--text-tertiary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, sub)));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      padding: "18px 18px 16px",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-xl)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(Node, {
    label: tool?.name || "Tool",
    sub: tool?.sub,
    color: "var(--tool-border)"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 16,
      fontWeight: 600,
      color: "var(--tool)"
    }
  }, (tool?.monogram || tool?.name || "T").slice(0, 2).toLowerCase())), /*#__PURE__*/React.createElement(Connector, {
    delay: 0
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 7,
      flex: "none",
      width: 96
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "var(--radius-lg)",
      background: "var(--relay-subtle)",
      border: "1px solid var(--relay-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "var(--glow-relay)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.RelayMark, {
    size: 34
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 12.5,
      fontWeight: 700,
      letterSpacing: "-0.03em",
      color: "var(--text-primary)"
    }
  }, "rflectr")), /*#__PURE__*/React.createElement(Connector, {
    delay: 0.7
  }), /*#__PURE__*/React.createElement(Node, {
    label: model?.id || "model",
    sub: backend,
    color: "var(--provider-border)"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 16,
      fontWeight: 600,
      color: "var(--provider)"
    }
  }, (model?.monogram || model?.id || "M").slice(0, 2).toLowerCase())), (latency || status) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 4,
      marginLeft: 14,
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: statusColor
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: statusColor,
      boxShadow: `0 0 6px ${statusColor}`
    }
  }), status), latency && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-tertiary)"
    }
  }, latency)));
}
Object.assign(__ds_scope, { RouteFlow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/relay/RouteFlow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/chrome.jsx
try { (() => {
/* global React */
const {
  Button,
  Badge,
  RelayMark
} = window.RflectrDesignSystem_53c68e;

/* ---- Lucide icons (24×24, 1.6px stroke, geometric) ------------- */
const ICONS = {
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  server: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  panelLeft: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
};
function Icon({
  name,
  size = 18,
  color = "currentColor",
  strokeWidth = 1.6,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "none",
      display: "block",
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: ICONS[name] || ""
    }
  });
}

/* ---- Sidebar --------------------------------------------------- */
function Sidebar({
  route,
  setRoute,
  gateway,
  identity,
  collapsed
}) {
  const W = collapsed ? 64 : 230;
  const nav = [{
    id: "overview",
    label: "Overview",
    icon: "grid"
  }, {
    id: "providers",
    label: "Providers",
    icon: "server"
  }, {
    id: "models",
    label: "Models",
    icon: "box"
  }, {
    id: "activity",
    label: "Activity",
    icon: "activity"
  }, {
    id: "settings",
    label: "Settings",
    icon: "sliders"
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: W,
      flex: "none",
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      transition: "width var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 60,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: collapsed ? "0 0 0 18px" : "0 18px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(RelayMark, {
    size: 26
  }), !collapsed && /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: {
      fontSize: 21,
      color: "var(--text-primary)"
    }
  }, "rflectr")), /*#__PURE__*/React.createElement("nav", {
    style: {
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      flex: 1
    }
  }, nav.map(n => {
    const active = route === n.id;
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => setRoute(n.id),
      title: n.label,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        height: 38,
        padding: collapsed ? 0 : "0 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "var(--radius-md)",
        border: "1px solid " + (active ? "var(--relay-border)" : "transparent"),
        background: active ? "var(--relay-subtle)" : "transparent",
        color: active ? "var(--relay)" : "var(--text-secondary)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background var(--dur-fast), color var(--dur-fast)"
      },
      onMouseEnter: e => {
        if (!active) e.currentTarget.style.background = "var(--bg-elevated)";
      },
      onMouseLeave: e => {
        if (!active) e.currentTarget.style.background = "transparent";
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 18
    }), !collapsed && n.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderTop: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    title: "Gateway runs locally",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: collapsed ? 0 : "8px 10px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: "var(--radius-md)",
      background: "var(--local-subtle)",
      border: "1px solid var(--provider-border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "var(--provider)",
      boxShadow: "0 0 7px var(--provider)",
      flex: "none"
    }
  }), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--provider)"
    }
  }, gateway.host, ":", gateway.port)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: collapsed ? 0 : "2px 4px",
      justifyContent: collapsed ? "center" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      flex: "none",
      borderRadius: "var(--radius-full)",
      background: "var(--relay-subtle)",
      border: "1px solid var(--relay-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: "var(--relay)"
    }
  }, identity.user.initials), !collapsed && /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, identity.user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      color: "var(--text-tertiary)"
    }
  }, gateway.subscription, " plan")))));
}

/* ---- Top bar --------------------------------------------------- */
function TopBar({
  title,
  onToggle,
  onAdd,
  query,
  setQuery,
  theme,
  onToggleTheme
}) {
  const isLight = theme === "light";
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 60,
      flex: "none",
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "0 24px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "color-mix(in oklab, var(--bg-canvas) 86%, transparent)",
      backdropFilter: "blur(8px)",
      position: "sticky",
      top: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    title: "Toggle sidebar",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 34,
      height: 34,
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-default)",
      background: "transparent",
      color: "var(--text-secondary)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "panelLeft",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 600,
      letterSpacing: "-0.02em",
      color: "var(--text-primary)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: 36,
      padding: "0 12px",
      width: 230,
      background: "var(--bg-inset)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("input", {
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "Search models, providers",
    style: {
      flex: 1,
      minWidth: 0,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans)",
      fontSize: 13
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onToggleTheme,
    title: isLight ? "Switch to dark" : "Switch to light",
    "aria-label": "Toggle theme",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 34,
      height: 34,
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-default)",
      background: "transparent",
      color: "var(--text-secondary)",
      cursor: "pointer",
      transition: "color var(--dur-fast), border-color var(--dur-fast)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.color = "var(--text-primary)";
      e.currentTarget.style.borderColor = "var(--border-strong)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.color = "var(--text-secondary)";
      e.currentTarget.style.borderColor = "var(--border-default)";
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: isLight ? "moon" : "sun",
    size: 17
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16,
      color: "var(--relay-on)"
    }),
    onClick: onAdd
  }, "Add provider"));
}
Object.assign(window, {
  Icon,
  Sidebar,
  TopBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/data.js
try { (() => {
/* ============================================================
   rflectr — Dashboard sample data
   The GUI face of the local smart-router. window.RF_DATA holds the
   gateway status, the provider registry, the model catalog, the live
   request feed, and the active tool→model routes.
   ============================================================ */
window.RF_DATA = {
  gateway: {
    status: "running",
    host: "127.0.0.1",
    port: 17645,
    uptime: "4h 12m",
    version: "0.7.2",
    subscription: "go"
  },
  identity: {
    user: {
      name: "Mara Okafor",
      handle: "@mara",
      initials: "MO"
    }
  },
  stats: [{
    label: "requests today",
    value: "12,847",
    mono: true
  }, {
    label: "success rate",
    value: "99.2%",
    tone: "provider"
  }, {
    label: "active routes",
    value: "4",
    mono: true
  }, {
    label: "avg latency",
    value: "344ms",
    mono: true
  }],
  // Active routes: which tool runs on which model right now
  routes: [{
    tool: {
      name: "Claude Code",
      monogram: "cc"
    },
    model: {
      id: "claude-sonnet-4-6",
      monogram: "cs"
    },
    backend: "zen",
    status: "ok",
    latency: "412ms"
  }, {
    tool: {
      name: "Codex",
      monogram: "cx"
    },
    model: {
      id: "gpt-5-codex",
      monogram: "gp"
    },
    backend: "openai",
    status: "ok",
    latency: "1.2s"
  }, {
    tool: {
      name: "Cursor",
      monogram: "cu"
    },
    model: {
      id: "kimi-k2",
      monogram: "ki"
    },
    backend: "groq",
    status: "retry",
    latency: "880ms"
  }, {
    tool: {
      name: "Gemini CLI",
      monogram: "gc"
    },
    model: {
      id: "gemini-2.5-pro",
      monogram: "gm"
    },
    backend: "vertex",
    status: "ok",
    latency: "360ms"
  }],
  providers: [{
    name: "OpenCode Zen",
    monogram: "zn",
    status: "connected",
    models: 64,
    color: "var(--relay)"
  }, {
    name: "OpenCode Go",
    monogram: "go",
    status: "connected",
    models: 64,
    color: "var(--gold)"
  }, {
    name: "OpenAI",
    monogram: "oa",
    status: "connected",
    models: 32,
    color: "var(--provider)"
  }, {
    name: "Groq",
    monogram: "gq",
    status: "connected",
    models: 18,
    color: "var(--critical)"
  }, {
    name: "DeepSeek",
    monogram: "ds",
    status: "connected",
    models: 8,
    color: "var(--relay)"
  }, {
    name: "Mistral",
    monogram: "mi",
    status: "connected",
    models: 14,
    color: "var(--warning)"
  }, {
    name: "Gemini",
    monogram: "gm",
    status: "oauth",
    models: 21,
    color: "var(--info)"
  }, {
    name: "Ollama",
    monogram: "ol",
    status: "local",
    models: 11,
    color: "var(--provider)"
  }, {
    name: "OpenRouter",
    monogram: "or",
    status: "connected",
    models: 188,
    color: "var(--tool)"
  }, {
    name: "Vertex AI",
    monogram: "vx",
    status: "missing",
    models: 0,
    color: "var(--text-tertiary)"
  }],
  models: [{
    id: "claude-sonnet-4-6",
    family: "Anthropic",
    format: "native",
    context: "200k",
    cost: "$3 / $15",
    backend: "zen",
    favorite: true
  }, {
    id: "claude-opus-4-1",
    family: "Anthropic",
    format: "native",
    context: "200k",
    cost: "$15 / $75",
    backend: "zen",
    favorite: false
  }, {
    id: "gpt-5",
    family: "OpenAI",
    format: "translated",
    context: "256k",
    cost: "$5 / $15",
    backend: "openai",
    favorite: true
  }, {
    id: "gpt-5-codex",
    family: "OpenAI",
    format: "translated",
    context: "256k",
    cost: "$5 / $15",
    backend: "openai",
    favorite: false
  }, {
    id: "kimi-k2",
    family: "Moonshot",
    format: "translated",
    context: "128k",
    cost: "$0.60",
    backend: "groq",
    favorite: true
  }, {
    id: "deepseek-v3",
    family: "DeepSeek",
    format: "translated",
    context: "64k",
    cost: "$0.27",
    backend: "deepseek",
    favorite: true
  }, {
    id: "llama-3.3-70b",
    family: "Meta",
    format: "translated",
    context: "128k",
    cost: "$0.59",
    backend: "groq",
    favorite: false
  }, {
    id: "mistral-large-2",
    family: "Mistral",
    format: "translated",
    context: "128k",
    cost: "$2 / $6",
    backend: "mistral",
    favorite: false
  }, {
    id: "gemini-2.5-pro",
    family: "Google",
    format: "translated",
    context: "1M",
    cost: "$1.25 / $5",
    backend: "vertex",
    favorite: false
  }, {
    id: "qwen3-235b",
    family: "Alibaba",
    format: "translated",
    context: "256k",
    cost: "$0.40",
    backend: "openrouter",
    favorite: false
  }, {
    id: "glm-4.6",
    family: "Zhipu",
    format: "translated",
    context: "200k",
    cost: "$0.60",
    backend: "openrouter",
    favorite: false
  }, {
    id: "llama3.2:3b",
    family: "Meta · local",
    format: "native",
    context: "128k",
    cost: "free",
    backend: "ollama",
    favorite: false
  }, {
    id: "whisper-large-v3",
    family: "OpenAI",
    format: "unsupported",
    context: "—",
    cost: "—",
    backend: "groq",
    favorite: false
  }, {
    id: "text-embedding-3",
    family: "OpenAI",
    format: "unsupported",
    context: "—",
    cost: "—",
    backend: "openai",
    favorite: false
  }],
  activity: [{
    time: "14:02:51",
    tool: "cc",
    model: "claude-sonnet-4-6",
    backend: "zen",
    tokens: "1,284",
    latency: "412ms",
    status: 200
  }, {
    time: "14:02:38",
    tool: "cu",
    model: "kimi-k2",
    backend: "groq",
    tokens: "880",
    latency: "880ms",
    status: "retry"
  }, {
    time: "14:02:12",
    tool: "cx",
    model: "gpt-5-codex",
    backend: "openai",
    tokens: "2,210",
    latency: "1.2s",
    status: 200
  }, {
    time: "14:01:50",
    tool: "gc",
    model: "gemini-2.5-pro",
    backend: "vertex",
    tokens: "540",
    latency: "360ms",
    status: 200
  }, {
    time: "14:01:31",
    tool: "cc",
    model: "claude-sonnet-4-6",
    backend: "zen",
    tokens: "980",
    latency: "290ms",
    status: 200
  }, {
    time: "14:01:09",
    tool: "cu",
    model: "deepseek-v3",
    backend: "deepseek",
    tokens: "1,640",
    latency: "720ms",
    status: 200
  }, {
    time: "14:00:44",
    tool: "cx",
    model: "gpt-5",
    backend: "openai",
    tokens: "410",
    latency: "—",
    status: 429
  }, {
    time: "14:00:21",
    tool: "cc",
    model: "claude-opus-4-1",
    backend: "zen",
    tokens: "3,100",
    latency: "2.1s",
    status: 200
  }],
  // 24 buckets of request volume for the overview sparkline
  volume: [4, 6, 5, 9, 12, 8, 14, 11, 18, 22, 19, 26, 24, 31, 28, 22, 17, 21, 25, 30, 27, 33, 29, 24]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/data.js", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
const {
  Button,
  Badge,
  Card,
  Input,
  RelayMark,
  ProviderCard,
  ModelRow,
  RouteFlow
} = window.RflectrDesignSystem_53c68e;

/* ---- KPI tile -------------------------------------------------- */
function Kpi({
  label,
  value,
  tone
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      padding: "16px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 26,
      fontWeight: 600,
      color: tone === "provider" ? "var(--provider)" : "var(--text-primary)",
      letterSpacing: "-0.01em"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "var(--text-tertiary)",
      marginTop: 6
    }
  }, label));
}

/* ---- Sparkline ------------------------------------------------- */
function Sparkline({
  data,
  w = 260,
  h = 44
}) {
  const max = Math.max(...data),
    step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - v / max * (h - 4) - 2}`).join(" ");
  return /*#__PURE__*/React.createElement("svg", {
    width: w,
    height: h,
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "spk",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "var(--relay-from)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "var(--relay-to)"
  }))), /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: "url(#spk)",
    strokeWidth: "2",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }));
}

/* ---- Status pill for feed rows --------------------------------- */
function StatusPill({
  status
}) {
  if (status === "retry") return /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    dot: true,
    mono: true
  }, "retry");
  if (status === 200) return /*#__PURE__*/React.createElement(Badge, {
    tone: "provider",
    mono: true
  }, "200");
  return /*#__PURE__*/React.createElement(Badge, {
    tone: "critical",
    dot: true,
    mono: true
  }, status);
}

/* ---- Live request feed (shared) -------------------------------- */
function ActivityFeed({
  rows,
  compact
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "84px 40px 1fr 96px 76px 72px",
      gap: 12,
      padding: "0 14px 8px",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "time"), /*#__PURE__*/React.createElement("span", null, "tool"), /*#__PURE__*/React.createElement("span", null, "route"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "right"
    }
  }, "tokens"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "right"
    }
  }, "latency"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "right"
    }
  }, "status")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "feed-row",
    style: {
      display: "grid",
      gridTemplateColumns: "84px 40px 1fr 96px 76px 72px",
      gap: 12,
      alignItems: "center",
      padding: "9px 14px",
      borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-mono)",
      fontSize: 12.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)"
    }
  }, r.time), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--tool)"
    }
  }, r.tool), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, r.model, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)"
    }
  }, "\xB7 ", r.backend)), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "right",
      color: "var(--text-secondary)"
    }
  }, r.tokens), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "right",
      color: "var(--text-secondary)"
    }
  }, r.latency), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: r.status
  }))))));
}

/* ============================================================
   Overview
   ============================================================ */
function OverviewScreen({
  data
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 14
    }
  }, data.stats.map(s => /*#__PURE__*/React.createElement(Kpi, _extends({
    key: s.label
  }, s)))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "active routes"), /*#__PURE__*/React.createElement(Badge, {
    tone: "relay",
    mono: true
  }, data.routes.length)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-tertiary)"
    }
  }, "tool \u2192 rflectr \u2192 model")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    },
    className: "routes-grid"
  }, data.routes.map((r, i) => /*#__PURE__*/React.createElement(RouteFlow, _extends({
    key: i
  }, r))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "live requests"), /*#__PURE__*/React.createElement(Sparkline, {
    data: data.volume
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 4px 8px"
    }
  }, /*#__PURE__*/React.createElement(ActivityFeed, {
    rows: data.activity.slice(0, 6)
  })))));
}

/* ============================================================
   Providers
   ============================================================ */
function ProvidersScreen({
  data
}) {
  const [sel, setSel] = React.useState("OpenCode Zen");
  const connected = data.providers.filter(p => p.status !== "missing").length;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "registry"), /*#__PURE__*/React.createElement(Badge, {
    tone: "provider",
    dot: true
  }, connected, " connected")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "copy",
      size: 15
    })
  }, "Import from OpenCode")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
      gap: 14
    }
  }, data.providers.map(p => /*#__PURE__*/React.createElement(ProviderCard, {
    key: p.name,
    name: p.name,
    monogram: p.monogram,
    brandColor: p.color,
    status: p.status,
    models: p.models,
    selected: sel === p.name,
    onClick: () => setSel(p.name)
  }))));
}

/* ============================================================
   Models
   ============================================================ */
function ModelsScreen({
  data,
  query,
  setQuery
}) {
  const [filter, setFilter] = React.useState("all");
  const [favs, setFavs] = React.useState(() => new Set(data.models.filter(m => m.favorite).map(m => m.id)));
  const toggle = id => setFavs(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const q = (query || "").toLowerCase();
  const list = data.models.filter(m => {
    if (filter === "favorites" && !favs.has(m.id)) return false;
    if (filter !== "all" && filter !== "favorites" && m.format !== filter) return false;
    return !q || m.id.toLowerCase().includes(q) || (m.family || "").toLowerCase().includes(q);
  });
  const filters = [["all", "All"], ["native", "Native"], ["translated", "Translated"], ["favorites", "★ Favorites"]];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 280
    }
  }, /*#__PURE__*/React.createElement(Input, {
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 16,
      color: "var(--text-tertiary)"
    }),
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: `Search ${data.models.length} models…`
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, filters.map(([id, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setFilter(id),
    style: {
      height: 36,
      padding: "0 13px",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 500,
      border: "1px solid " + (filter === id ? "var(--relay-border)" : "var(--border-default)"),
      background: filter === id ? "var(--relay-subtle)" : "transparent",
      color: filter === id ? "var(--relay)" : "var(--text-secondary)"
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, list.length, " shown \xB7 ", favs.size, "/20 favorited")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, list.map(m => /*#__PURE__*/React.createElement(ModelRow, _extends({
    key: m.id
  }, m, {
    favorite: favs.has(m.id),
    onToggleFavorite: () => toggle(m.id),
    onClick: () => {}
  }))), list.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "48px 0",
      color: "var(--text-tertiary)",
      fontFamily: "var(--font-mono)",
      fontSize: 13
    }
  }, "No models match \u201C", query, "\u201D.")));
}
Object.assign(window, {
  Kpi,
  Sparkline,
  StatusPill,
  ActivityFeed,
  OverviewScreen,
  ProvidersScreen,
  ModelsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/screens2.jsx
try { (() => {
/* global React */
const {
  Button,
  Badge,
  Card,
  Input
} = window.RflectrDesignSystem_53c68e;

/* ============================================================
   Activity
   ============================================================ */
function ActivityScreen({
  data
}) {
  const [filter, setFilter] = React.useState("all");
  const rows = data.activity.filter(r => {
    if (filter === "errors") return typeof r.status === "number" && r.status >= 400;
    if (filter === "retries") return r.status === "retry";
    return true;
  });
  const counts = {
    ok: data.activity.filter(r => r.status === 200).length,
    retry: data.activity.filter(r => r.status === "retry").length,
    error: data.activity.filter(r => typeof r.status === "number" && r.status >= 400).length
  };
  const filters = [["all", "All"], ["retries", "Retries"], ["errors", "Errors"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(MiniStat, {
    label: "succeeded",
    value: counts.ok,
    color: "var(--provider)"
  }), /*#__PURE__*/React.createElement(MiniStat, {
    label: "retried \u2192 rerouted",
    value: counts.retry,
    color: "var(--warning)"
  }), /*#__PURE__*/React.createElement(MiniStat, {
    label: "errored",
    value: counts.error,
    color: "var(--critical)"
  })), /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, filters.map(([id, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setFilter(id),
    style: {
      height: 30,
      padding: "0 11px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      fontWeight: 500,
      border: "1px solid " + (filter === id ? "var(--relay-border)" : "transparent"),
      background: filter === id ? "var(--relay-subtle)" : "transparent",
      color: filter === id ? "var(--relay)" : "var(--text-secondary)"
    }
  }, label))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--provider)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--provider)",
      boxShadow: "0 0 6px var(--provider)"
    }
  }), "live")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 4px 8px"
    }
  }, /*#__PURE__*/React.createElement(window.ActivityFeed, {
    rows: rows
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 9,
      padding: "12px 14px",
      borderRadius: "var(--radius-md)",
      background: "var(--warning-bg)",
      border: "1px solid rgba(242,162,60,0.3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--warning)",
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17h.01"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-secondary)",
      lineHeight: 1.5
    }
  }, "Costs shown for non-Anthropic models are ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-primary)"
    }
  }, "estimates"), " \u2014 translated providers don't always report token accounting. Treat them as directional.")));
}
function MiniStat({
  label,
  value,
  color
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 24,
      fontWeight: 600,
      color
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "var(--text-tertiary)",
      marginTop: 5
    }
  }, label));
}

/* ============================================================
   Settings
   ============================================================ */
function SettingsScreen({
  data
}) {
  const [tier, setTier] = React.useState(data.gateway.subscription);
  const [tool, setTool] = React.useState("Claude Code");
  const [trace, setTrace] = React.useState(false);
  const [reroute, setReroute] = React.useState(true);
  const tools = ["Claude Code", "Codex", "Gemini CLI", "Cursor"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text-primary)",
      marginBottom: 4
    }
  }, "Subscription"), /*#__PURE__*/React.createElement("p", {
    className: "body-sm",
    style: {
      marginBottom: 14
    }
  }, "Which OpenCode plan rflectr routes through. ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--gold)"
    }
  }, "go"), " unlocks the full catalog."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["free", "zen", "go", "both"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTier(t),
    style: {
      flex: 1,
      height: 40,
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      fontWeight: 600,
      textTransform: "lowercase",
      border: "1px solid " + (tier === t ? "var(--relay-border)" : "var(--border-default)"),
      background: tier === t ? "var(--relay-subtle)" : "transparent",
      color: tier === t ? "var(--relay)" : "var(--text-secondary)"
    }
  }, t)))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text-primary)",
      marginBottom: 4
    }
  }, "Default tool"), /*#__PURE__*/React.createElement("p", {
    className: "body-sm",
    style: {
      marginBottom: 14
    }
  }, "The harness launched when you run ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--text-primary)"
    }
  }, "rflectr"), " with no argument."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, tools.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTool(t),
    style: {
      height: 36,
      padding: "0 14px",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 500,
      border: "1px solid " + (tool === t ? "var(--tool-border)" : "var(--border-default)"),
      background: tool === t ? "var(--tool-subtle)" : "transparent",
      color: tool === t ? "var(--tool)" : "var(--text-secondary)"
    }
  }, t)))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(Toggle, {
    label: "Auto-reroute on error",
    desc: "If a backend returns 5xx or rate-limits, retry the request on the next healthy provider.",
    on: reroute,
    set: setReroute
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-subtle)",
      margin: "14px 0"
    }
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Request tracing",
    desc: "Write full request/response traces to ~/.rflectr/trace. Off by default \u2014 nothing leaves your machine.",
    on: trace,
    set: setTrace
  })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text-primary)",
      marginBottom: 12
    }
  }, "Gateway"), /*#__PURE__*/React.createElement(Row, {
    label: "Address",
    value: `${data.gateway.host}:${data.gateway.port}`
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Version",
    value: `rflectr ${data.gateway.version}`
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Uptime",
    value: data.gateway.uptime
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "refresh",
      size: 15
    })
  }, "Restart gateway"), /*#__PURE__*/React.createElement(Badge, {
    tone: "local",
    dot: true,
    mono: true
  }, "runs on your machine"))));
}
function Toggle({
  label,
  desc,
  on,
  set
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: "var(--text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("p", {
    className: "body-sm",
    style: {
      marginTop: 4
    }
  }, desc)), /*#__PURE__*/React.createElement("button", {
    onClick: () => set(v => !v),
    "aria-pressed": on,
    style: {
      width: 46,
      height: 26,
      flex: "none",
      marginTop: 2,
      borderRadius: "var(--radius-full)",
      border: "1px solid " + (on ? "var(--relay-border)" : "var(--border-strong)"),
      background: on ? "var(--relay-subtle)" : "var(--bg-inset)",
      position: "relative",
      cursor: "pointer",
      transition: "all var(--dur-fast)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: on ? 22 : 2,
      width: 20,
      height: 20,
      borderRadius: "var(--radius-full)",
      background: on ? "var(--relay)" : "var(--text-tertiary)",
      transition: "left var(--dur-fast) var(--ease-out)"
    }
  })));
}
function Row({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-primary)"
    }
  }, value));
}
Object.assign(window, {
  ActivityScreen,
  SettingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/screens2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/sections.jsx
try { (() => {
/* global React */
const {
  Button,
  Badge,
  RelayMark,
  RouteFlow,
  ProviderCard
} = window.RflectrDesignSystem_53c68e;
function SIcon({
  d,
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "none"
    },
    dangerouslySetInnerHTML: {
      __html: d
    }
  });
}
const ARROW = '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>';
const CHECK = '<path d="M20 6 9 17l-5-5"/>';
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
const MOON = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
const COPY = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';

/* ---- Nav ------------------------------------------------------- */
function Nav({
  theme,
  onToggleTheme
}) {
  const link = {
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500
  };
  const isLight = theme === "light";
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "15px 32px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "color-mix(in oklab, var(--bg-void) 84%, transparent)",
      backdropFilter: "blur(10px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(RelayMark, {
    size: 26
  }), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: {
      fontSize: 21,
      color: "var(--text-primary)"
    }
  }, "rflectr")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 26,
      alignItems: "center"
    },
    className: "navlinks"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#how",
    style: link
  }, "How it works"), /*#__PURE__*/React.createElement("a", {
    href: "#providers",
    style: link
  }, "Providers"), /*#__PURE__*/React.createElement("a", {
    href: "#local",
    style: link
  }, "Local")), /*#__PURE__*/React.createElement("button", {
    onClick: onToggleTheme,
    title: isLight ? "Switch to dark" : "Switch to light",
    "aria-label": "Toggle theme",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-default)",
      background: "transparent",
      color: "var(--text-secondary)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(SIcon, {
    d: isLight ? MOON : SUN,
    size: 17
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    iconRight: /*#__PURE__*/React.createElement(SIcon, {
      d: ARROW,
      size: 15
    })
  }, "Get started"));
}

/* ---- Hero: the gold bees ---------------------------------------- */
function Hero() {
  return /*#__PURE__*/React.createElement("header", {
    className: "theme-dark",
    style: {
      position: "relative",
      background: "var(--bg-void)",
      overflow: "hidden",
      padding: "20px 24px 80px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "comb-field",
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0.55,
      maskImage: "radial-gradient(78% 70% at 50% 26%, #000 0%, transparent 70%)",
      WebkitMaskImage: "radial-gradient(78% 70% at 50% 26%, #000 0%, transparent 70%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 1040,
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "local",
    mono: true,
    dot: true
  }, "runs on 127.0.0.1 \xB7 keys in your keychain")), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/rflectr-lockup-sm.png",
    alt: "rflectr \u2014 two golden worker bees facing inward across the wordmark",
    style: {
      width: "100%",
      maxWidth: 820,
      height: "auto",
      display: "block",
      margin: "0 auto"
    }
  }), /*#__PURE__*/React.createElement("h1", {
    className: "display",
    style: {
      marginTop: 6,
      fontSize: 50,
      color: "var(--text-primary)"
    }
  }, "Point your agents at any model."), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 600,
      margin: "20px auto 0",
      fontSize: 18,
      lineHeight: 1.55,
      color: "var(--text-secondary)"
    }
  }, "rflectr is a local relay between your coding tools and every provider. Your agents keep talking to their native API \u2014 rflectr routes, translates, and retries against whatever backend you choose."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      marginTop: 30,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      height: 46,
      padding: "0 16px",
      background: "var(--bg-inset)",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)"
    }
  }, "$"), " npm i -g @legioncodeinc/rflectr", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)",
      marginLeft: 4,
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(SIcon, {
    d: COPY,
    size: 15
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "Read the docs"))));
}

/* ---- How it works: the relay ----------------------------------- */
function How() {
  const steps = [{
    n: "01",
    t: "Pick a model",
    d: "Choose a provider and model from the wizard — or star up to 20 favorites for mid-session switching."
  }, {
    n: "02",
    t: "Launch your tool",
    d: "Claude Code, Codex, Gemini CLI, Cursor — each thinks it's talking to its own native API."
  }, {
    n: "03",
    t: "rflectr routes it",
    d: "Requests are translated to the chosen backend, retried on failure, and rerouted if a provider is down."
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "how",
    style: {
      padding: "84px 24px",
      background: "var(--bg-canvas)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "how it works"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginTop: 12
    }
  }, "One relay, every model")), /*#__PURE__*/React.createElement(RouteFlow, {
    tool: {
      name: "Claude Code",
      monogram: "cc"
    },
    model: {
      id: "kimi-k2",
      monogram: "ki"
    },
    backend: "groq",
    status: "ok",
    latency: "412ms",
    style: {
      maxWidth: 680,
      margin: "0 auto 40px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 18
    },
    className: "how-grid"
  }, steps.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    style: {
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-xl)",
      padding: "24px 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--relay)",
      letterSpacing: "0.1em"
    }
  }, s.n), /*#__PURE__*/React.createElement("h4", {
    style: {
      marginTop: 12,
      marginBottom: 8,
      color: "var(--text-primary)"
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.55
    }
  }, s.d))))));
}

/* ---- Providers strip ------------------------------------------- */
function Providers() {
  const names = [["OpenCode Zen", "zn", "var(--relay)"], ["Groq", "gq", "var(--critical)"], ["OpenAI", "oa", "var(--provider)"], ["Mistral", "mi", "var(--warning)"], ["DeepSeek", "ds", "var(--relay)"], ["Gemini", "gm", "var(--info)"], ["Ollama", "ol", "var(--provider)"], ["OpenRouter", "or", "var(--tool)"], ["Vertex", "vx", "var(--text-secondary)"]];
  return /*#__PURE__*/React.createElement("section", {
    id: "providers",
    style: {
      padding: "84px 24px",
      background: "var(--bg-canvas)",
      borderTop: "1px solid var(--border-subtle)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 980,
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "providers"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginTop: 12,
      marginBottom: 8
    }
  }, "Bring your own backend"), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 540,
      margin: "0 auto 36px"
    }
  }, "Mix hosted and local. Keys stay in your OS keychain \u2014 rflectr never sees them in the clear."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      gap: 12
    }
  }, names.map(([name, mono, color]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "12px 14px",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      flex: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--bg-inset)",
      border: "1px solid var(--border-default)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 600,
      color
    }
  }, mono), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      fontWeight: 500,
      color: "var(--text-primary)"
    }
  }, name))))));
}

/* ---- Local / trust --------------------------------------------- */
function Local() {
  const feats = [{
    t: "Runs on your machine",
    d: "The gateway binds 127.0.0.1 — loopback only. Nothing is proxied through us.",
    tone: "var(--provider)"
  }, {
    t: "Keys in your keychain",
    d: "Credentials live in your OS keychain, never shown and never logged.",
    tone: "var(--provider)"
  }, {
    t: "Honest about support",
    d: "Every model is labelled native, SDK-translated, or unsupported. No surprises mid-session.",
    tone: "var(--relay)"
  }, {
    t: "Auto-reroute on failure",
    d: "A 5xx or rate-limit retries on the next healthy provider, automatically.",
    tone: "var(--relay)"
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "local",
    style: {
      padding: "84px 24px",
      background: "var(--bg-canvas)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "local & private"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginTop: 12
    }
  }, "Built to run on your machine")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    },
    className: "local-grid"
  }, feats.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.t,
    style: {
      display: "flex",
      gap: 14,
      padding: "22px 22px",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-xl)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      flex: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--bg-inset)",
      border: `1px solid ${f.tone}`,
      color: f.tone,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(SIcon, {
    d: CHECK,
    size: 17
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    style: {
      color: "var(--text-primary)",
      marginBottom: 6
    }
  }, f.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.5
    }
  }, f.d)))))));
}

/* ---- CTA + footer ---------------------------------------------- */
function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    className: "theme-dark",
    style: {
      position: "relative",
      padding: "88px 24px",
      background: "var(--bg-void)",
      overflow: "hidden",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "comb-field",
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0.5,
      maskImage: "radial-gradient(66% 90% at 50% 50%, #000, transparent 72%)",
      WebkitMaskImage: "radial-gradient(66% 90% at 50% 50%, #000, transparent 72%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 640,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(RelayMark, {
    size: 44,
    style: {
      margin: "0 auto 22px"
    }
  }), /*#__PURE__*/React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 42,
      color: "var(--text-primary)"
    }
  }, "Route once. Run anywhere."), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 16,
      fontSize: 17,
      color: "var(--text-secondary)"
    }
  }, "One install, and your agents speak to every model."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(SIcon, {
      d: ARROW,
      size: 16
    })
  }, "Install rflectr"))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "theme-dark",
    style: {
      padding: "30px 32px",
      background: "var(--bg-void)",
      borderTop: "1px solid var(--border-subtle)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(RelayMark, {
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: {
      fontSize: 17,
      color: "var(--text-secondary)"
    }
  }, "rflectr")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, "a legion code product \xB7 \xA9 2026"));
}
Object.assign(window, {
  Nav,
  Hero,
  How,
  Providers,
  Local,
  CTA,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.ModelRow = __ds_scope.ModelRow;

__ds_ns.ProviderCard = __ds_scope.ProviderCard;

__ds_ns.RelayMark = __ds_scope.RelayMark;

__ds_ns.RouteFlow = __ds_scope.RouteFlow;

})();
