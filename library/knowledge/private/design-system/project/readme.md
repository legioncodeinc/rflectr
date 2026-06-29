# rflectr — Design System

The brand, tokens, components, and UI for **rflectr** (`@legioncodeinc/rflectr`) — a **local smart-router and gateway** for AI coding agents.

> **rflectr — point your coding agents at any model.**

You pick a provider + model from a wizard; rflectr launches Claude Code / Codex / Gemini CLI / Cursor believing they're talking to their native API, while requests are **routed, translated, and retried** against whatever backend you chose (OpenCode Zen/Go, Groq, OpenAI, Mistral, DeepSeek, Gemini, Ollama, Vertex, OpenRouter…). It runs locally; keys live in your OS keychain.

The brand idea: **a jeweled relay.** Many tools on the left, many models on the right, and in the middle one crafted golden worker that makes them understand each other. Three words: **crafted · connective · trustworthy.** A Legion Code product (the "Bee Army" lineage).

---

## Sources

- **Brand imagery** — two ornate, filigreed **golden honeybees facing inward** across a gold **honeycomb**, with the lowercase white wordmark **rflectr** between them, on deep black. The mirrored bee pair = the relay (tool ↔ model). Originals in `uploads/`; processed crops + lockups in `assets/`.
- **Product / accent system** — the project creative brief (router concept, the blue→purple relay glyph, the §5 accent palette, the dashboard IA). Codified in `tokens/` and the dashboard kit.
- **Lineage** — Legion Code's parent brand (dark-native, geometric sans + JetBrains Mono, 4px spacing). A sibling *Honeycomb* design system (mounted at `brand_kit/`) set the file conventions.

> **Two-mark system (the core reconciliation):** the **gradient relay glyph** (`assets/rflectr-mark.svg`) is the **product / app / UI mark** — clean, scalable, survives 16px monochrome (`assets/rflectr-mark-mono.svg`, favicon `assets/rflectr-favicon.svg`). The **ornate gold bees** (`assets/rflectr-lockup*.png`, `assets/bee-left.png`, `assets/bee-right.png`) are the **brand / marketing mark** — hero images, OG cards, launch art. Clean glyph in the dashboard; rich bees for hero moments.

---

## What it is — product context

rflectr is a CLI today; the **dashboard** is its visual companion — a local web UI (served by `rflectr server`) for managing the registry and watching the gateway. Primary user job: *"See what's connected, switch what my agents run on, and watch traffic flow — without memorizing CLI flags."*

The dashboard (recreated in `ui_kits/dashboard/`) has five surfaces: **Overview** (gateway status, active routes, live feed), **Providers** (the registry + key status), **Models** (searchable catalog + favorites), **Activity** (request timeline, retries/errors), **Settings** (tier, default tool, tracing). The gateway binds `127.0.0.1:17645` — local is a brand value.

---

## Content fundamentals

How rflectr writes. The voice is **technical-premium** — confident, precise, a little ornate. Not playful-startup, not enterprise-sterile. "Artisan tooling."

- **Voice:** plain, declarative, exact. It states real values, not vibes. "Point your coding agents at any model." "Runs on your machine." "Keys stay in your keychain."
- **Person:** address the user as **you** ("your agents", "what your tools run on"); the product is **rflectr** (always lowercase) or **the gateway / the relay**.
- **Casing:** sentence case everywhere — headings, buttons, labels. The wordmark **rflectr** is always lowercase; **never capitalize, never add the missing "e"** ("reflectr" is wrong).
- **Real values in mono.** Model ids, ports, tokens, latencies, status codes, hashes, paths are JetBrains Mono — they're things you copy, switch to, or search. `claude-sonnet-4-6`, `127.0.0.1:17645`, `412ms`, `200`, `$3 / $15`.
- **Honest about state.** Surface the real product states: a provider with a **missing key**, an **unsupported** model format, a **retry → reroute**, a **mid-session** model switch, the **cost-estimate caveat** for non-Anthropic models. Don't imply perfection.
- **Never show keys.** "Stored in your OS keychain" is the selling point; mockups show the affordance, never the secret.
- **Signature vocabulary:** *route, relay, gateway, provider, model, backend, harness/tool, translate, reroute, retry, favorite, registry, keychain, local, native / SDK-translated / unsupported, subscription (free / zen / go / both).*
- **Emoji:** none in product UI. Status is color + a small dot/glyph. The brand glyphs are the **relay mark** and the **hexagon**.

**Examples:** "point your coding agents at any model." · "key stored in keychain" / "no key — add to connect" · "503 → reroute · deepseek-v3 · 880ms · 200" · "go unlocks the full catalog."

---

## Visual foundations

**Palette — gold on black, with a blue→purple relay core.** The ground is deep neutral black (`--bg-canvas #08080A`, `--bg-void #000`); gold and relay-violet only ever sit on dark. Five surfaces, four text levels, three borders. The formalized accent system:
- **`--relay`** blue→purple (`#5B8DEF → #8B5CF6`) — rflectr core, primary actions, the route. The product's signature; used as a **gradient**, not a flat fill, on primary buttons / the mark / the active route.
- **`--provider`** green (`#34D399`) — providers, connected, success, healthy, the local badge.
- **`--tool`** violet (`#A78BFA`) — tools / agents (Claude Code, Codex…).
- **`--gold`** honey (`#E3B23C`) — brand / premium highlights / the honeycomb texture. Used **sparingly** as the "premium" accent, never as flat UI fill.
- **`--danger`** amber→red (`#F2A23C → #F0556A`) — errors, missing key, retries.

**Typography.** **Space Grotesk** — display (the wordmark, headings, big numerals); geometric, precise, matches the wordmark. **Hanken Grotesk** — body/UI; clean and legible. **JetBrains Mono** — every real value. Modular 1.25 scale, 16px base. Mono eyebrows are uppercase at `0.10em`.

**Shape language — the hexagon is the atomic brand shape.** Status dots, the relay mark's containment, provider-tile hints, empty states, the `.comb-field` honeycomb texture. **Don't overuse — one or two hex/comb touches per screen.**

**Spacing & layout.** 4px base. Density is information-dense but breathable — a control panel (Vercel/Linear/Raycast), not a marketing page. Cards, tables, sparklines, status pills. Dashboard content is a centered ~1200px column.

**Backgrounds.** Flat black surfaces. **No gradient washes** (the relay gradient is reserved for the mark / primary action / the route, never a page background). The comb is the one texture — quiet, masked with a radial fade.

**Corners & cards.** Radii 4 (chips) · 8 (buttons/inputs) · 12 (cards) · 16 (panels) · 22 (hero) · full (dots/pills). **Cards are a 1px border on a surface fill, no drop shadow.** An `accent` left edge (relay/provider/tool/gold) marks a card's role. The one expressive light is the **glow** (`--glow-relay` / `--glow-gold` / `--glow-provider`) on a single focused element (the active route, the selected provider).

**Motion — subtle.** Default easing `cubic-bezier(0.2,0.8,0.2,1)`; 120/220/420ms. The signature motion is the **route flow**: restrained dots travelling tool → rflectr → provider (`--dur-flow` 1400ms), reinforcing the relay story. Screens rise-in on route change. `prefers-reduced-motion` disables all of it (and reveals the rest-state).

**Hover / press.** Hover lightens a fill one step or brightens a border to `strong`; the primary button brightens its gradient. Press nudges `translateY(1px)`. Focus shows a 2px relay outline at 2px offset; inputs get a 3px subtle relay ring.

**Imagery vibe.** Two registers: the **clean relay glyph** (blue→purple, in-product) and the **ornate gold bees** (warm, jewel-like, chiaroscuro — hero/marketing only). Gold always on dark.

---

## Iconography

- **System:** **[Lucide](https://lucide.dev)** — 24×24, **1.6px stroke, stroked, geometric**, `currentColor`. Inlined as SVG paths in the dashboard (`ui_kits/dashboard/chrome.jsx` `ICONS`); in a build use `lucide-react`. No mascots, no metaphors.
- **Brand glyphs (bespoke geometry):** the **relay mark** (`RelayMark` component / `assets/rflectr-mark.svg`) — a hexagon comb-cell holding the routing relay; and the **hexagon** itself (`clip-path` polygons, the `.comb-field`). These are the only hand-built marks.
- **Status is color + dot**, never emoji. Small filled (softly glowing) circles in the semantic/accent color; the favorite **star** (gold) is the one filled glyph.
- No hand-drawn illustration beyond the relay mark and the comb — pull the closest Lucide glyph.

> No rflectr icon set ships as binaries; Lucide is the documented substitute, the clean-geometry counterpoint to the ornate gold imagery. Flagged as a substitution. **Type note:** Space Grotesk + Hanken Grotesk are the documented geometric-sans substitutes for the wordmark family — flag if the real brand font is supplied.

---

## Index — what's in this system

**Foundations** (`styles.css` → `tokens/`)
- `tokens/colors.css` — surfaces, text, borders, the **relay** gradient core, **provider** / **tool** / **gold** accents, gold scale, severity, the **local** accent (+ light theme)
- `tokens/typography.css` — Space Grotesk / Hanken Grotesk / JetBrains Mono, 1.25 scale
- `tokens/spacing.css` — 4px spacing, radii, elevation + **glows**, relay focus ring, motion (incl. `--dur-flow`)
- `tokens/fonts.css` — the three families; JetBrains Mono `@font-face` (binaries in `assets/fonts/`)
- `tokens/base.css` — element + semantic base styles, the `.comb-field` texture

**Components** (`components/`) — React primitives, `window.RflectrDesignSystem_53c68e`
- `core/` — `Button`, `Badge`, `Card`, `Input`
- `relay/` — `RelayMark` (the product glyph), `ProviderCard` (registry tile + key status), `ModelRow` (catalog row + format badge + favorite), `RouteFlow` (the signature tool→rflectr→model flow)

**UI kit** (`ui_kits/`)
- `dashboard/` — the five-surface local dashboard (Overview, Providers, Models, Activity, Settings)

**Specimen cards** (`guidelines/cards/`) — the Design System tab: Brand (3, incl. the mark), Colors (5), Type (5), Spacing (3); plus Components (2) and the Dashboard frame.

**Assets** (`assets/`) — `rflectr-mark.svg` / `-mono.svg` / `rflectr-favicon.svg`, `rflectr-lockup*.png`, `bee-left.png`, `bee-right.png`, `rflectr-hero.jpg`, `fonts/`.

**Skill** — `SKILL.md` makes this directory usable as an Agent Skill in Claude Code.
