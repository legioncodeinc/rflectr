/* global React */
const { Button, Badge, RelayMark, RouteFlow, ProviderCard } = window.RflectrDesignSystem_53c68e;

function SIcon({ d, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} dangerouslySetInnerHTML={{ __html: d }} />;
}
const ARROW = '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>';
const CHECK = '<path d="M20 6 9 17l-5-5"/>';
const COPY = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';

/* ---- Nav ------------------------------------------------------- */
function Nav() {
  const link = { color: "var(--text-secondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 };
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 18, padding: "15px 32px", borderBottom: "1px solid var(--border-subtle)", background: "color-mix(in oklab, var(--bg-void) 84%, transparent)", backdropFilter: "blur(10px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <RelayMark size={26} />
        <span className="wordmark" style={{ fontSize: 21, color: "var(--text-primary)" }}>rflectr</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 26, alignItems: "center" }} className="navlinks">
        <a href="#how" style={link}>How it works</a>
        <a href="#providers" style={link}>Providers</a>
        <a href="#local" style={link}>Local</a>
      </div>
      <Button variant="primary" size="md" iconRight={<SIcon d={ARROW} size={15} />}>Get started</Button>
    </nav>
  );
}

/* ---- Hero: the gold bees ---------------------------------------- */
function Hero() {
  return (
    <header style={{ position: "relative", background: "var(--bg-void)", overflow: "hidden", padding: "20px 24px 80px" }}>
      <div className="comb-field" style={{ position: "absolute", inset: 0, opacity: 0.55, maskImage: "radial-gradient(78% 70% at 50% 26%, #000 0%, transparent 70%)", WebkitMaskImage: "radial-gradient(78% 70% at 50% 26%, #000 0%, transparent 70%)" }} />
      <div style={{ position: "relative", maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", marginBottom: 18 }}>
          <Badge tone="local" mono dot>runs on 127.0.0.1 · keys in your keychain</Badge>
        </div>
        <img src="../../assets/rflectr-lockup-sm.png" alt="rflectr — two golden worker bees facing inward across the wordmark" style={{ width: "100%", maxWidth: 820, height: "auto", display: "block", margin: "0 auto" }} />
        <h1 className="display" style={{ marginTop: 6, fontSize: 50, color: "var(--text-primary)" }}>Point your agents at any model.</h1>
        <p style={{ maxWidth: 600, margin: "20px auto 0", fontSize: 18, lineHeight: 1.55, color: "var(--text-secondary)" }}>
          rflectr is a local relay between your coding tools and every provider. Your agents keep talking to their native API — rflectr routes, translates, and retries against whatever backend you choose.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 46, padding: "0 16px", background: "var(--bg-inset)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>
            <span style={{ color: "var(--text-tertiary)" }}>$</span> npm i -g @legioncodeinc/rflectr
            <span style={{ color: "var(--text-tertiary)", marginLeft: 4, display: "flex" }}><SIcon d={COPY} size={15} /></span>
          </div>
          <Button variant="secondary" size="lg">Read the docs</Button>
        </div>
      </div>
    </header>
  );
}

/* ---- How it works: the relay ----------------------------------- */
function How() {
  const steps = [
    { n: "01", t: "Pick a model", d: "Choose a provider and model from the wizard — or star up to 20 favorites for mid-session switching." },
    { n: "02", t: "Launch your tool", d: "Claude Code, Codex, Gemini CLI, Cursor — each thinks it's talking to its own native API." },
    { n: "03", t: "rflectr routes it", d: "Requests are translated to the chosen backend, retried on failure, and rerouted if a provider is down." },
  ];
  return (
    <section id="how" style={{ padding: "84px 24px", background: "var(--bg-canvas)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span className="eyebrow">how it works</span>
          <h2 style={{ marginTop: 12 }}>One relay, every model</h2>
        </div>
        <RouteFlow tool={{ name: "Claude Code", monogram: "cc" }} model={{ id: "kimi-k2", monogram: "ki" }} backend="groq" status="ok" latency="412ms" style={{ maxWidth: 680, margin: "0 auto 40px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="how-grid">
          {steps.map((s) => (
            <div key={s.n} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "24px 22px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--relay)", letterSpacing: "0.1em" }}>{s.n}</div>
              <h4 style={{ marginTop: 12, marginBottom: 8, color: "var(--text-primary)" }}>{s.t}</h4>
              <p style={{ fontSize: 14.5, lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Providers strip ------------------------------------------- */
function Providers() {
  const names = [
    ["OpenCode Zen", "zn", "var(--relay)"], ["Groq", "gq", "var(--critical)"], ["OpenAI", "oa", "var(--provider)"],
    ["Mistral", "mi", "var(--warning)"], ["DeepSeek", "ds", "var(--relay)"], ["Gemini", "gm", "var(--info)"],
    ["Ollama", "ol", "var(--provider)"], ["OpenRouter", "or", "var(--tool)"], ["Vertex", "vx", "var(--text-secondary)"],
  ];
  return (
    <section id="providers" style={{ padding: "84px 24px", background: "var(--bg-void)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <span className="eyebrow">providers</span>
        <h2 style={{ marginTop: 12, marginBottom: 8 }}>Bring your own backend</h2>
        <p style={{ maxWidth: 540, margin: "0 auto 36px" }}>Mix hosted and local. Keys stay in your OS keychain — rflectr never sees them in the clear.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {names.map(([name, mono, color]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)" }}>
              <span style={{ width: 30, height: 30, flex: "none", borderRadius: "var(--radius-md)", background: "var(--bg-inset)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color }}>{mono}</span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-primary)" }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Local / trust --------------------------------------------- */
function Local() {
  const feats = [
    { t: "Runs on your machine", d: "The gateway binds 127.0.0.1 — loopback only. Nothing is proxied through us.", tone: "var(--provider)" },
    { t: "Keys in your keychain", d: "Credentials live in your OS keychain, never shown and never logged.", tone: "var(--provider)" },
    { t: "Honest about support", d: "Every model is labelled native, SDK-translated, or unsupported. No surprises mid-session.", tone: "var(--relay)" },
    { t: "Auto-reroute on failure", d: "A 5xx or rate-limit retries on the next healthy provider, automatically.", tone: "var(--relay)" },
  ];
  return (
    <section id="local" style={{ padding: "84px 24px", background: "var(--bg-canvas)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span className="eyebrow">local &amp; private</span>
          <h2 style={{ marginTop: 12 }}>Built to run on your machine</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="local-grid">
          {feats.map((f) => (
            <div key={f.t} style={{ display: "flex", gap: 14, padding: "22px 22px", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)" }}>
              <span style={{ width: 32, height: 32, flex: "none", borderRadius: "var(--radius-md)", background: "var(--bg-inset)", border: `1px solid ${f.tone}`, color: f.tone, display: "flex", alignItems: "center", justifyContent: "center" }}><SIcon d={CHECK} size={17} /></span>
              <div>
                <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>{f.t}</h4>
                <p style={{ fontSize: 14, lineHeight: 1.5 }}>{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- CTA + footer ---------------------------------------------- */
function CTA() {
  return (
    <section style={{ position: "relative", padding: "88px 24px", background: "var(--bg-void)", overflow: "hidden", textAlign: "center" }}>
      <div className="comb-field" style={{ position: "absolute", inset: 0, opacity: 0.5, maskImage: "radial-gradient(66% 90% at 50% 50%, #000, transparent 72%)", WebkitMaskImage: "radial-gradient(66% 90% at 50% 50%, #000, transparent 72%)" }} />
      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <RelayMark size={44} style={{ margin: "0 auto 22px" }} />
        <h2 className="display" style={{ fontSize: 42, color: "var(--text-primary)" }}>Route once. Run anywhere.</h2>
        <p style={{ marginTop: 16, fontSize: 17, color: "var(--text-secondary)" }}>One install, and your agents speak to every model.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
          <Button variant="primary" size="lg" iconRight={<SIcon d={ARROW} size={16} />}>Install rflectr</Button>
        </div>
      </div>
    </section>
  );
}
function Footer() {
  return (
    <footer style={{ padding: "30px 32px", background: "var(--bg-void)", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <RelayMark size={20} />
        <span className="wordmark" style={{ fontSize: 17, color: "var(--text-secondary)" }}>rflectr</span>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>a legion code product · © 2026</span>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, How, Providers, Local, CTA, Footer });
