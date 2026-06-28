import * as React from "react";

/**
 * A connected backend in the registry. Shows the provider monogram, its key
 * status (keychain / missing / OAuth — the key is never shown), and model count.
 */
export interface ProviderCardProps {
  name: string;
  /** 1–2 char monogram; falls back to the first letters of `name`. */
  monogram?: string;
  /** Accent color for the monogram (provider brand hint). */
  brandColor?: string;
  status?: "connected" | "missing" | "oauth" | "local";
  models?: number;
  /** Override the key affordance line. */
  note?: string;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ProviderCard(props: ProviderCardProps): JSX.Element;
