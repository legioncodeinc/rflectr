# Marketing site — UI kit

The rflectr landing page — the brand at full expression on the black ground, leading with the **ornate gold bees** (the marketing mark) and the clean **relay** story.

## Sections
- **Nav** — relay mark + wordmark + links + primary CTA.
- **Hero** — the gold-bee lockup over a faint comb field, the local/keychain badge, the "Point your agents at any model." display line, and the `npm i -g` install command.
- **How it works** — a live `RouteFlow` (tool → rflectr → model) plus three steps.
- **Providers** — the bring-your-own-backend strip.
- **Local & private** — the four trust pillars (runs local, keychain, honest support, auto-reroute).
- **CTA + Footer**.

## Files
- `index.html` — page shell. Tagged `@dsCard group="Marketing site"`. Favicon = the relay glyph.
- `sections.jsx` — `Nav`, `Hero`, `How`, `Providers`, `Local`, `CTA`, `Footer`.

## Components used
From `window.RflectrDesignSystem_53c68e`: `Button`, `Badge`, `RelayMark`, `RouteFlow`. Hero art is `assets/rflectr-lockup-sm.png` (the gold bees). Demonstrates the **two-mark rule**: gold bees for the hero, the relay glyph everywhere else.
