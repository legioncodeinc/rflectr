/* global React */
const { Button, Badge, Card, Input, RelayMark, ProviderCard, ModelRow, RouteFlow } = window.RflectrDesignSystem_53c68e;

/* ---- KPI tile -------------------------------------------------- */
function Kpi({ label, value, tone }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "16px 18px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 600, color: tone === "provider" ? "var(--provider)" : "var(--text-primary)", letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)", marginTop: 6 }}>{label}</div>
    </div>
  );
}

/* ---- Sparkline ------------------------------------------------- */
function Sparkline({ data, w = 260, h = 44 }) {
  const max = Math.max(...data), step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--relay-from)" /><stop offset="1" stopColor="var(--relay-to)" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="url(#spk)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---- Status pill for feed rows --------------------------------- */
function StatusPill({ status }) {
  if (status === "retry") return <Badge tone="warning" dot mono>retry</Badge>;
  if (status === 200) return <Badge tone="provider" mono>200</Badge>;
  return <Badge tone="critical" dot mono>{status}</Badge>;
}

/* ---- Live request feed (shared) -------------------------------- */
function ActivityFeed({ rows, compact }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: "84px 40px 1fr 96px 76px 72px", gap: 12, padding: "0 14px 8px", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
        <span>time</span><span>tool</span><span>route</span><span style={{ textAlign: "right" }}>tokens</span><span style={{ textAlign: "right" }}>latency</span><span style={{ textAlign: "right" }}>status</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((r, i) => (
          <div key={i} className="feed-row" style={{ display: "grid", gridTemplateColumns: "84px 40px 1fr 96px 76px 72px", gap: 12, alignItems: "center", padding: "9px 14px", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
            <span style={{ color: "var(--text-tertiary)" }}>{r.time}</span>
            <span style={{ color: "var(--tool)" }}>{r.tool}</span>
            <span style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.model} <span style={{ color: "var(--text-tertiary)" }}>· {r.backend}</span></span>
            <span style={{ textAlign: "right", color: "var(--text-secondary)" }}>{r.tokens}</span>
            <span style={{ textAlign: "right", color: "var(--text-secondary)" }}>{r.latency}</span>
            <span style={{ display: "flex", justifyContent: "flex-end" }}><StatusPill status={r.status} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Overview
   ============================================================ */
function OverviewScreen({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {data.stats.map((s) => <Kpi key={s.label} {...s} />)}
      </div>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="eyebrow">active routes</span>
            <Badge tone="relay" mono>{data.routes.length}</Badge>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>tool → rflectr → model</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="routes-grid">
          {data.routes.map((r, i) => <RouteFlow key={i} {...r} />)}
        </div>
      </section>

      <section>
        <Card padded={false}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="eyebrow">live requests</span>
            <Sparkline data={data.volume} />
          </div>
          <div style={{ padding: "14px 4px 8px" }}>
            <ActivityFeed rows={data.activity.slice(0, 6)} />
          </div>
        </Card>
      </section>
    </div>
  );
}

/* ============================================================
   Providers
   ============================================================ */
function ProvidersScreen({ data }) {
  const [sel, setSel] = React.useState("OpenCode Zen");
  const connected = data.providers.filter((p) => p.status !== "missing").length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="eyebrow">registry</span>
          <Badge tone="provider" dot>{connected} connected</Badge>
        </div>
        <Button variant="secondary" size="sm" iconLeft={<Icon name="copy" size={15} />}>Import from OpenCode</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))", gap: 14 }}>
        {data.providers.map((p) => (
          <ProviderCard key={p.name} name={p.name} monogram={p.monogram} brandColor={p.color}
            status={p.status} models={p.models} selected={sel === p.name} onClick={() => setSel(p.name)} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Models
   ============================================================ */
function ModelsScreen({ data, query, setQuery }) {
  const [filter, setFilter] = React.useState("all");
  const [favs, setFavs] = React.useState(() => new Set(data.models.filter((m) => m.favorite).map((m) => m.id)));
  const toggle = (id) => setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const q = (query || "").toLowerCase();
  const list = data.models.filter((m) => {
    if (filter === "favorites" && !favs.has(m.id)) return false;
    if (filter !== "all" && filter !== "favorites" && m.format !== filter) return false;
    return !q || m.id.toLowerCase().includes(q) || (m.family || "").toLowerCase().includes(q);
  });
  const filters = [["all", "All"], ["native", "Native"], ["translated", "Translated"], ["favorites", "★ Favorites"]];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ width: 280 }}>
          <Input iconLeft={<Icon name="search" size={16} color="var(--text-tertiary)" />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${data.models.length} models…`} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ height: 36, padding: "0 13px", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
                border: "1px solid " + (filter === id ? "var(--relay-border)" : "var(--border-default)"),
                background: filter === id ? "var(--relay-subtle)" : "transparent",
                color: filter === id ? "var(--relay)" : "var(--text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>{list.length} shown · {favs.size}/20 favorited</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((m) => <ModelRow key={m.id} {...m} favorite={favs.has(m.id)} onToggleFavorite={() => toggle(m.id)} onClick={() => {}} />)}
        {list.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>No models match “{query}”.</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Kpi, Sparkline, StatusPill, ActivityFeed, OverviewScreen, ProvidersScreen, ModelsScreen });
