import * as React from "react";

/**
 * The rflectr product glyph, inline so it scales and recolors. A hexagon
 * comb-cell containing the routing relay.
 */
export interface RelayMarkProps {
  size?: number;
  /** `gradient` = the app/UI mark (blue→purple); `mono` inherits currentColor. */
  variant?: "gradient" | "mono";
  title?: string;
  style?: React.CSSProperties;
}

export function RelayMark(props: RelayMarkProps): JSX.Element;
