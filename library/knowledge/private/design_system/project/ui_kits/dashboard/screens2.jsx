/* global React */
const { Button, Badge, Card, Input } = window.RflectrDesignSystem_53c68e;

/* ============================================================
   Activity
   ============================================================ */
function ActivityScreen({ data }) {
  const [filter, setFilter] = React.useState("all");
  const rows = data.activity.filter((r) => {
    if (filter === "errors") return typeof r.status === "number" && r.status >= 400;
    if (filter === "retries") return r.status === "retry";
    return true;
  });
  const counts = {
    ok: data.activity.filter((r) => r.status === 200).length,
    retry: data.activity.filter((r) => r.status === "retry").length,
    error: data.activity.filter((r) => typeof r.status === "number" && r.status >= 400).length,
  };
  const filters = [["all", "All"], ["retries", "Retries"], ["errors", "Errors"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <MiniStat label="succeeded" value={counts.ok} color="var(--provider)" />
        <MiniStat label="retried → rerouted" value={counts.retry} color="var(--warning)" />
        <MiniStat label="errored" value={counts.error} color="var(--critical)" />
      </div>

      <Card padded={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {filters.map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                style={{ height: 30, padding: "0 11px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500,
                  border: "1px solid " + (filter === id ? "var(--relay-border)" : "transparent"),
                  background: filter === id ? "var(--relay-subtle)" : "transparent",
                  color: filter === id ? "var(--relay)" : "var(--text-secondary)" }}>{label}</button>
            ))}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--provider)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--provider)", boxShadow: "0 0 6px var(--provider)" }} />live
          </span>
        </div>
        <div style={{ padding: "14px 4px 8px" }}>
          <window.ActivityFeed rows={rows} />
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--warning-bg)", border: "1px solid rgba(242,162,60,0.3)" }}>
        <span style={{ color: "var(--warning)", marginTop: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Costs shown for non-Anthropic models are <span style={{ color: "var(--text-primary)" }}>estimates</span> — translated providers don't always report token accounting. Treat them as directional.
        </span>
      </div>
    </div>
  );
}
function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)", marginTop: 5 }}>{label}</div>
    </div>
  );
}

/* ============================================================
   Settings
   ============================================================ */
function SettingsScreen({ data }) {
  const [tier, setTier] = React.useState(data.gateway.subscription);
  const [tool, setTool] = React.useState("Claude Code");
  const [trace, setTrace] = React.useState(false);
  const [reroute, setReroute] = React.useState(true);
  const tools = ["Claude Code", "Codex", "Gemini CLI", "Cursor"];

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Subscription</div>
        <p className="body-sm" style={{ marginBottom: 14 }}>Which OpenCode plan rflectr routes through. <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>go</span> unlocks the full catalog.</p>
        <div style={{ display: "flex", gap: 8 }}>
          {["free", "zen", "go", "both"].map((t) => (
            <button key={t} onClick={() => setTier(t)}
              style={{ flex: 1, height: 40, borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, textTransform: "lowercase",
                border: "1px solid " + (tier === t ? "var(--relay-border)" : "var(--border-default)"),
                background: tier === t ? "var(--relay-subtle)" : "transparent",
                color: tier === t ? "var(--relay)" : "var(--text-secondary)" }}>{t}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Default tool</div>
        <p className="body-sm" style={{ marginBottom: 14 }}>The harness launched when you run <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>rflectr</span> with no argument.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tools.map((t) => (
            <button key={t} onClick={() => setTool(t)}
              style={{ height: 36, padding: "0 14px", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
                border: "1px solid " + (tool === t ? "var(--tool-border)" : "var(--border-default)"),
                background: tool === t ? "var(--tool-subtle)" : "transparent",
                color: tool === t ? "var(--tool)" : "var(--text-secondary)" }}>{t}</button>
          ))}
        </div>
      </Card>

      <Card>
        <Toggle label="Auto-reroute on error" desc="If a backend returns 5xx or rate-limits, retry the request on the next healthy provider." on={reroute} set={setReroute} />
        <div style={{ height: 1, background: "var(--border-subtle)", margin: "14px 0" }} />
        <Toggle label="Request tracing" desc="Write full request/response traces to ~/.rflectr/trace. Off by default — nothing leaves your machine." on={trace} set={setTrace} />
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Gateway</div>
        <Row label="Address" value={`${data.gateway.host}:${data.gateway.port}`} />
        <Row label="Version" value={`rflectr ${data.gateway.version}`} />
        <Row label="Uptime" value={data.gateway.uptime} />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Button variant="secondary" size="sm" iconLeft={<Icon name="refresh" size={15} />}>Restart gateway</Button>
          <Badge tone="local" dot mono>runs on your machine</Badge>
        </div>
      </Card>
    </div>
  );
}
function Toggle({ label, desc, on, set }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        <p className="body-sm" style={{ marginTop: 4 }}>{desc}</p>
      </div>
      <button onClick={() => set((v) => !v)} aria-pressed={on}
        style={{ width: 46, height: 26, flex: "none", marginTop: 2, borderRadius: "var(--radius-full)", border: "1px solid " + (on ? "var(--relay-border)" : "var(--border-strong)"), background: on ? "var(--relay-subtle)" : "var(--bg-inset)", position: "relative", cursor: "pointer", transition: "all var(--dur-fast)" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: "var(--radius-full)", background: on ? "var(--relay)" : "var(--text-tertiary)", transition: "left var(--dur-fast) var(--ease-out)" }} />
      </button>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

Object.assign(window, { ActivityScreen, SettingsScreen });
