import * as React from "react";

/**
 * The base surface. Border defines a card, not shadow. `glow` is the one
 * expressive light, reserved for a single focused element.
 */
export interface CardProps {
  children?: React.ReactNode;
  /** The reserved glow — use on at most one focused element per view. */
  glow?: "relay" | "gold" | "provider";
  /** Paint a left accent edge marking the card's role. */
  accent?: "relay" | "provider" | "tool" | "gold";
  /** Default true. Set false for media/flush content. */
  padded?: boolean;
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;
