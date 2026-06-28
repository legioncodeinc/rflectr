import * as React from "react";

/**
 * One model in the catalog. The id is mono (a real value you switch to); the
 * format badge tells the truth about support; star to favorite.
 */
export interface ModelRowProps {
  /** The model id, e.g. "claude-sonnet-4-6". Rendered mono. */
  id: string;
  /** Family / maker, e.g. "Anthropic". */
  family?: string;
  format?: "native" | "translated" | "unsupported";
  /** Context window, e.g. "200k". */
  context?: string;
  /** Cost label, e.g. "$3 / $15". */
  cost?: string;
  /** Source backend, e.g. "groq". */
  backend?: string;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ModelRow(props: ModelRowProps): JSX.Element;
