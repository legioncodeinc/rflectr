import React from "react";

let _uid = 0;

/**
 * RelayMark — the rflectr product glyph as an inline SVG so it can scale and
 * recolor. A hexagon comb-cell containing the routing relay (tool → worker →
 * model). `variant="gradient"` is the app/UI mark (blue→purple); `mono`
 * inherits currentColor for favicon/CLI/single-color contexts.
 */
export function RelayMark({ size = 28, variant = "gradient", style, title = "rflectr", ...rest }) {
  const id = React.useMemo(() => "rfm" + (++_uid), []);
  const stroke = variant === "mono" ? "currentColor" : `url(#${id})`;
  const fill = variant === "mono" ? "currentColor" : `url(#${id})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label={title} style={{ display: "block", flex: "none", ...style }} {...rest}>
      {variant !== "mono" && (
        <defs>
          <linearGradient id={id} x1="8" y1="20" x2="56" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--relay-from)" />
            <stop offset="1" stopColor="var(--relay-to)" />
          </linearGradient>
        </defs>
      )}
      <path d="M32 3 L57 17.5 L57 46.5 L32 61 L7 46.5 L7 17.5 Z" stroke={stroke} strokeWidth="2.5" strokeOpacity="0.5" fill="none" />
      <path d="M15 23 L25.5 32 L15 41" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 23 L44.5 32 L34 41" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29.6 32 L32 28.4 L34.4 32 L32 35.6 Z" fill={fill} />
    </svg>
  );
}
