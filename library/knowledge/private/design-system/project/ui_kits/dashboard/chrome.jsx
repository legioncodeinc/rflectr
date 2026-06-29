/* global React */
const { Button, Badge, RelayMark } = window.RflectrDesignSystem_53c68e;

/* ---- Lucide icons (24×24, 1.6px stroke, geometric) ------------- */
const ICONS = {
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  server: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  panelLeft: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};
function Icon({ name, size = 18, color = "currentColor", strokeWidth = 1.6, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: "none", display: "block", ...style }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }} />
  );
}

/* ---- Sidebar --------------------------------------------------- */
function Sidebar({ route, setRoute, gateway, identity, collapsed }) {
  const W = collapsed ? 64 : 230;
  const nav = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "providers", label: "Providers", icon: "server" },
    { id: "models", label: "Models", icon: "box" },
    { id: "activity", label: "Activity", icon: "activity" },
    { id: "settings", label: "Settings", icon: "sliders" },
  ];
  return (
    <aside style={{ width: W, flex: "none", background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", transition: "width var(--dur-base) var(--ease-out)" }}>
      <div style={{ height: 60, display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "0 0 0 18px" : "0 18px", borderBottom: "1px solid var(--border-subtle)" }}>
        <RelayMark size={26} />
        {!collapsed && <span className="wordmark" style={{ fontSize: 21, color: "var(--text-primary)" }}>rflectr</span>}
      </div>

      <nav style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {nav.map((n) => {
          const active = route === n.id;
          return (
            <button key={n.id} onClick={() => setRoute(n.id)} title={n.label}
              style={{
                display: "flex", alignItems: "center", gap: 11, height: 38, padding: collapsed ? 0 : "0 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--radius-md)", border: "1px solid " + (active ? "var(--relay-border)" : "transparent"),
                background: active ? "var(--relay-subtle)" : "transparent",
                color: active ? "var(--relay)" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                transition: "background var(--dur-fast), color var(--dur-fast)",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-elevated)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <Icon name={n.icon} size={18} />
              {!collapsed && n.label}
            </button>
          );
        })}
      </nav>

      {/* local gateway badge */}
      <div style={{ padding: 12, borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div title="Gateway runs locally" style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? 0 : "8px 10px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: "var(--radius-md)", background: "var(--local-subtle)", border: "1px solid var(--provider-border)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--provider)", boxShadow: "0 0 7px var(--provider)", flex: "none" }} />
          {!collapsed && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--provider)" }}>{gateway.host}:{gateway.port}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? 0 : "2px 4px", justifyContent: collapsed ? "center" : "flex-start" }}>
          <div style={{ width: 28, height: 28, flex: "none", borderRadius: "var(--radius-full)", background: "var(--relay-subtle)", border: "1px solid var(--relay-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--relay)" }}>{identity.user.initials}</div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{identity.user.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-tertiary)" }}>{gateway.subscription} plan</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ---- Top bar --------------------------------------------------- */
function TopBar({ title, onToggle, onAdd, query, setQuery, theme, onToggleTheme }) {
  const isLight = theme === "light";
  return (
    <header style={{ height: 60, flex: "none", display: "flex", alignItems: "center", gap: 16, padding: "0 24px", borderBottom: "1px solid var(--border-subtle)", background: "color-mix(in oklab, var(--bg-canvas) 86%, transparent)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10 }}>
      <button onClick={onToggle} title="Toggle sidebar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
        <Icon name="panelLeft" size={17} />
      </button>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{title}</div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px", width: 230, background: "var(--bg-inset)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}>
        <Icon name="search" size={16} color="var(--text-tertiary)" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models, providers"
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: 13 }} />
      </div>
      <button onClick={onToggleTheme} title={isLight ? "Switch to dark" : "Switch to light"} aria-label="Toggle theme"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", transition: "color var(--dur-fast), border-color var(--dur-fast)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}>
        <Icon name={isLight ? "moon" : "sun"} size={17} />
      </button>
      <Button variant="primary" size="md" iconLeft={<Icon name="plus" size={16} color="var(--relay-on)" />} onClick={onAdd}>Add provider</Button>
    </header>
  );
}

Object.assign(window, { Icon, Sidebar, TopBar });
