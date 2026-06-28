import * as React from "react";

/** A small status / label chip. Tones carry meaning, not decoration. */
export interface BadgeProps {
  children?: React.ReactNode;
  /** `relay` core · `provider` connected · `tool` agent · `gold` premium · `local` runs-local · severities. */
  tone?: "relay" | "provider" | "tool" | "gold" | "local" | "neutral" | "info" | "warning" | "critical" | "success";
  /** Show a leading glowing status dot. */
  dot?: boolean;
  /** Set the label in the values typeface (ids, ports, counts). */
  mono?: boolean;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
