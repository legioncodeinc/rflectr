---
name: rflectr-design
description: Use this skill to generate well-branded interfaces and assets for rflectr (@legioncodeinc/rflectr — a local smart-router/gateway that points coding agents at any model), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## What rflectr is
A local smart-router and gateway: pick a provider + model from a wizard, and your coding agents (Claude Code, Codex, Gemini CLI, Cursor) keep talking to their native API while rflectr routes, translates, and retries against any backend (Zen/Go, Groq, OpenAI, Mistral, DeepSeek, Gemini, Ollama, Vertex, OpenRouter…). Runs locally; keys in the OS keychain. The brand idea: **a jeweled relay** — many tools, many models, one crafted golden worker between them.

## Where things are
- `styles.css` — the one stylesheet to link; `@import`s everything in `tokens/`.
- `tokens/` — colors (the relay gradient core + provider/tool/gold accents + black ground), type (Space Grotesk / Hanken Grotesk / JetBrains Mono), spacing/radii/glows/motion, `@font-face`, the `.comb-field` texture.
- `components/` — React primitives: `core/` (Button, Badge, Card, Input) and `relay/` (RelayMark, ProviderCard, ModelRow, RouteFlow). Each has a `.prompt.md`.
- `ui_kits/dashboard/` — the five-surface local dashboard (Overview, Providers, Models, Activity, Settings). The reference for any rflectr app surface.
- `guidelines/cards/` — small specimen cards for every foundation.
- `assets/` — the relay mark (svg + mono + favicon), the gold-bee lockup, the two bee crops, fonts.

## Non-negotiables
- **Two marks.** The blue→purple **relay glyph** (`RelayMark` / `assets/rflectr-mark.svg`) is the product/app/UI mark (clean, survives 16px mono). The **ornate gold bees** are the brand/marketing mark (hero, OG, launch) — never the small-scale UI logo.
- **Name is always lowercase `rflectr`** — never capitalized, never "reflectr", never add the missing "e".
- Gold and relay-violet **only on dark**. Ground is deep black. The **relay gradient** (`#5B8DEF→#8B5CF6`) is the one brand action / the route — used as a gradient, never a flat page wash. `--provider` green = connected · `--tool` violet = agents · `--gold` = premium/honeycomb (sparing).
- **Type:** Space Grotesk (display/wordmark), Hanken Grotesk (body/UI), **JetBrains Mono for every real value** (model ids, ports, tokens, latencies, status codes). Sentence case.
- **Hexagon is the atomic shape** — status dots, the mark, the `.comb-field` texture. One or two hex/comb touches per screen, never loud.
- Cards = 1px border on a surface fill, no shadow; an `accent` left edge marks role; the one expressive light is the **glow** on a single focused element. Radii 4/8/12/16/22/full.
- **Local + private are brand values.** Always show the `127.0.0.1:17645` badge. **Never show or imply an exposed API key** — "stored in your OS keychain" is the affordance. Honor real states: missing key, unsupported format, retry→reroute, mid-session switch, cost-estimate caveat.
- No emoji in product UI. Icons = Lucide (1.6px stroke, geometric, currentColor).
