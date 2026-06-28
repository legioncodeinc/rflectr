# Dashboard — UI kit

The GUI face of rflectr — a local web UI (served by `rflectr server`) for managing the registry and watching the gateway. Dark-first, dev-premium, with the gold/honeycomb signature. North stars: Vercel, Linear, Raycast.

## Surfaces
- **Overview** — gateway KPIs, the **active routes** (each a `RouteFlow`: tool → rflectr → model), and a live request feed with a sparkline.
- **Providers** — the registry as a `ProviderCard` grid. Key status (keychain / missing / OAuth / local) — the key itself is never shown. Import from OpenCode.
- **Models** — searchable, filterable catalog of `ModelRow`s; honest format badges (native / SDK-translated / unsupported); favorites (up to 20).
- **Activity** — the full request feed with retry/error surfacing, success/retry/error counts, and the honest cost-estimate caveat for non-Anthropic models.
- **Settings** — subscription tier, default tool, auto-reroute, request tracing, and the local gateway card.

## Files
- `index.html` — app shell + routing. Tagged `@dsCard group="Dashboard"`. Favicon = `assets/rflectr-favicon.svg`.
- `data.js` — `window.RF_DATA`: gateway, stats, routes, providers, models, activity, volume.
- `chrome.jsx` — `Icon` (inline Lucide), `Sidebar` (with the relay mark + local `127.0.0.1` badge), `TopBar`.
- `screens.jsx` — `OverviewScreen`, `ProvidersScreen`, `ModelsScreen` (+ `Kpi`, `Sparkline`, `StatusPill`, `ActivityFeed`).
- `screens2.jsx` — `ActivityScreen`, `SettingsScreen`.

## Components used
From `window.RflectrDesignSystem_53c68e`: `Button`, `Badge`, `Card`, `Input`, `RelayMark`, `ProviderCard`, `ModelRow`, `RouteFlow`. Icons are inline Lucide (24×24, 1.6px stroke).

> Recreation, not production code — interactions are faked client-side and data is static. Privacy is a brand value: no API keys are ever shown; the local `127.0.0.1:17645` badge is always visible.
