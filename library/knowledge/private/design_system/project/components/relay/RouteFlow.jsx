import React from "react";
import { RelayMark } from "./RelayMark.jsx";

/* Inject the flow keyframes once (self-contained animation). */
function ensureFlowKeyframes() {
  if (typeof document === "undefined" || document.getElementById("rf-flow-kf")) return;
  const s = document.createElement("style");
  s.id = "rf-flow-kf";
  s.textContent =
    "@keyframes rfFlow{0%{left:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:100%;opacity:0}}" +
    "@media (prefers-reduced-motion: reduce){.rf-flow-dot{display:none!important}}";
  document.head.appendChild(s);
}

/**
 * RouteFlow — the jeweled relay, visualized: a TOOL on the left and a MODEL on
 * the right, with rflectr routing between them. Restrained flowing dots show a
 * request travelling tool → rflectr → model. The signature "what's connected
 * and what it runs on" object.
 */
export function RouteFlow({ tool, model, backend, status = "ok", latency, animated = true, style, ...rest }) {
  React.useEffect(() => { ensureFlowKeyframes(); }, []);

  const statusColor = { ok: "var(--provider)", retry: "var(--warning)", error: "var(--critical)" }[status] || "var(--provider)";
  const Connector = ({ delay }) => (
    <div style={{ position: "relative", flex: 1, height: 2, background: "var(--border-strong)", borderRadius: 2, overflow: "hidden", minWidth: 28 }}>
      <span style={{ position: "absolute", top: 0, bottom: 0, margin: "auto", width: 14, height: 2, borderRadius: 2, background: "linear-gradient(90deg, transparent, var(--relay))", animation: animated ? `rfFlow var(--dur-flow) linear ${delay}s infinite` : "none", left: 0 }} className="rf-flow-dot" />
    </div>
  );

  const Node = ({ label, sub, color, children }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: "none", width: 116 }}>
      <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--bg-inset)", border: `1px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
      <div style={{ textAlign: "center", maxWidth: "100%" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "18px 18px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", ...style }} {...rest}>
      <Node label={tool?.name || "Tool"} sub={tool?.sub} color="var(--tool-border)">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--tool)" }}>{(tool?.monogram || tool?.name || "T").slice(0, 2).toLowerCase()}</span>
      </Node>

      <Connector delay={0} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: "none", width: 96 }}>
        <div style={{ width: 56, height: 56, borderRadius: "var(--radius-lg)", background: "var(--relay-subtle)", border: "1px solid var(--relay-border)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--glow-relay)" }}>
          <RelayMark size={34} />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>rflectr</div>
      </div>

      <Connector delay={0.7} />

      <Node label={model?.id || "model"} sub={backend} color="var(--provider-border)">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--provider)" }}>{(model?.monogram || model?.id || "M").slice(0, 2).toLowerCase()}</span>
      </Node>

      {(latency || status) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 14, flex: "none" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: statusColor }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            {status}
          </span>
          {latency && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>{latency}</span>}
        </div>
      )}
    </div>
  );
}
