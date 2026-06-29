import * as React from "react";

interface RouteEndpoint {
  /** Tool name (e.g. "Claude Code") or model id (e.g. "kimi-k2"). */
  name?: string;
  id?: string;
  monogram?: string;
  sub?: string;
}

/**
 * The jeweled relay, visualized: a tool on the left, a model on the right, and
 * rflectr routing between them, with a restrained flowing-request animation.
 *
 * @startingPoint section="Relay" subtitle="Tool → rflectr → model route" viewport="700x150"
 */
export interface RouteFlowProps {
  tool?: RouteEndpoint;
  model?: RouteEndpoint;
  /** Backend serving the model, e.g. "groq". Shown under the model node. */
  backend?: string;
  status?: "ok" | "retry" | "error";
  /** Latency label, e.g. "412ms". */
  latency?: string;
  /** Animate the flowing dots. Default true; respects reduced-motion. */
  animated?: boolean;
  style?: React.CSSProperties;
}

export function RouteFlow(props: RouteFlowProps): JSX.Element;
