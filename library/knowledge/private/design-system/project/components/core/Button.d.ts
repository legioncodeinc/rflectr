import * as React from "react";

/**
 * The rflectr button. The relay-gradient primary is the single brand action
 * per view; `provider` (green) and `tool` (violet) mark the two sides of the relay.
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** `primary` = relay gradient (the one brand action). `provider` green · `tool` violet. */
  variant?: "primary" | "provider" | "tool" | "secondary" | "ghost" | "gold" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
