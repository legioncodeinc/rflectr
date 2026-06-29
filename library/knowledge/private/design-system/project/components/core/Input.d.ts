import * as React from "react";

/** Text field on an inset well, with a relay/provider/tool focus ring. */
export interface InputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  /** Set the value in the values typeface — ids, ports, paths, search. */
  mono?: boolean;
  /** Tint the focus ring. Default "relay". */
  accent?: "relay" | "provider" | "tool";
  iconLeft?: React.ReactNode;
  /** Inline trailing affix (unit, count, ⏎). */
  affix?: React.ReactNode;
  disabled?: boolean;
  type?: string;
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
