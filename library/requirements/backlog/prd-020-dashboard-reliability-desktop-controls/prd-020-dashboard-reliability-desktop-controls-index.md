# PRD-020: Dashboard Reliability and Desktop Controls

> **Status:** Backlog
> **Priority:** P0
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Source model:** `library/knowledge/private/design-system/project/ui_kits/dashboard/`

---

## Overview

This PRD hardens the production dashboard behavior around Desktop Apps, provider/model routing, polling, test actions, and local app configuration safety. The work extends the modeled dashboard surfaces from the UI kit, especially the shell, Models, Providers, Overview route state, and Settings gateway controls, while adding a dedicated Desktop Apps tab for Codex and Claude app setup, stop, and revert actions.

The password-protected dashboard auth issue is intentionally deferred from this PRD per product direction.

---

## Goals

- Make dashboard-triggered Codex Desktop setup safe across server restarts, proxy replacement, process shutdown, and failed setup attempts.
- Prevent model/provider identity collisions in dashboard tests, model tables, Codex proxy routing, and cached route lookup.
- Stabilize dashboard polling and client route state so refreshes cannot overwrite newer user actions or crash the dashboard.
- Preserve provider routing metadata, including custom headers, through direct OpenAI-compatible routes and dashboard model tests.
- Add Desktop Apps controls that let users stop dashboard-managed local servers/proxies and revert Codex and Claude app configuration changes.
- Keep all UI behavior aligned with the dashboard UI kit: local-first, privacy-forward, card/table-based, honest status, and no raw secret display.

## Non-Goals

- Fixing password-protected dashboard auth in this PRD.
- Replacing CLI-first launch flows for `rflectr codex`, `rflectr codex-app`, `rflectr Claude`, or `rflectr claude-app`.
- Daemonizing `rflectr server` or installing a system service.
- Killing third-party desktop app processes unless a user explicitly chooses a future app-quit action outside this PRD.
- Showing raw API keys, bearer tokens, config secrets, prompts, completions, or hidden request bodies in the dashboard.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-020a-dashboard-reliability-desktop-controls-codex-lifecycle`](./prd-020a-dashboard-reliability-desktop-controls-codex-lifecycle.md) | Codex Desktop proxy/config lifecycle cleanup and restore behavior. | Draft |
| [`prd-020b-dashboard-reliability-desktop-controls-atomic-codex-setup`](./prd-020b-dashboard-reliability-desktop-controls-atomic-codex-setup.md) | Atomic Codex Desktop setup and replacement semantics. | Draft |
| [`prd-020c-dashboard-reliability-desktop-controls-provider-qualified-routing`](./prd-020c-dashboard-reliability-desktop-controls-provider-qualified-routing.md) | Provider-qualified model identity across dashboard tests and Codex proxy routing. | Draft |
| [`prd-020d-dashboard-reliability-desktop-controls-dashboard-state-polling`](./prd-020d-dashboard-reliability-desktop-controls-dashboard-state-polling.md) | Polling, mutation races, route fallback, and dashboard error rendering. | Draft |
| [`prd-020e-dashboard-reliability-desktop-controls-provider-headers`](./prd-020e-dashboard-reliability-desktop-controls-provider-headers.md) | Provider routing headers through direct routes and dashboard model tests. | Draft |
| [`prd-020f-dashboard-reliability-desktop-controls-app-kill-revert-controls`](./prd-020f-dashboard-reliability-desktop-controls-app-kill-revert-controls.md) | Desktop Apps tab stop/revert controls for Codex and Claude app integrations. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-020-1 | Given the dashboard is served by `rflectr server`, when the user opens the app, then the UI remains faithful to `library/knowledge/private/design-system/project/ui_kits/dashboard/` for shell navigation, card density, status badges, model rows, and local gateway identity. |
| AC-020-2 | Given the user configures Codex Desktop from the dashboard, when the server later exits, restarts, or replaces the proxy, then the user is never left with a silently dead `~/.codex/config.toml` route. |
| AC-020-3 | Given an existing Codex Desktop proxy is working, when a new setup attempt fails, then the existing proxy and app configuration remain active. |
| AC-020-4 | Given two providers expose the same model id, when the dashboard tests, launches, lists, favorites, or routes a model, then the selected provider is preserved end to end. |
| AC-020-5 | Given polling and user mutations happen close together, when responses resolve out of order, then stale polling data cannot overwrite newer mutation results or test status. |
| AC-020-6 | Given a provider requires routing headers, when traffic uses direct OpenAI-compatible forwarding or dashboard model testing, then the provider headers are included without leaking them to the UI. |
| AC-020-7 | Given Codex or Claude app configuration was changed by the dashboard, when the user selects Revert in Desktop Apps, then rflectr restores the previous owned state or reports that no owned state is available. |
| AC-020-8 | Given a dashboard-managed proxy/server is running, when the user selects the corresponding kill/stop control and confirms, then rflectr closes only the dashboard-owned runtime and reports the resulting state. |
| AC-020-9 | Given an action fails, when the dashboard renders the failure, then it shows parsed, actionable error text rather than raw nested JSON. |
| AC-020-10 | Given password-protected dashboard auth is still unfixed, when this PRD is implemented, then that auth issue remains documented as deferred and no acceptance criterion depends on it. |

---

## Data Model Changes

None expected. Any new state should be runtime state, existing restore-state files, or existing dashboard DTO fields. If implementation discovers a need for persisted ownership metadata, it must be additive and documented in the owning sub-PRD before implementation.

---

## API Changes

- Add or extend dashboard endpoints for Codex Desktop setup status, proxy stop, and config revert.
- Add or extend dashboard endpoints for Claude Desktop/Claude Code app setup status, bridge stop where applicable, and config revert.
- Add provider-qualified identifiers to model test, model status, and route DTOs.
- Add explicit mutation sequencing/error payloads where needed for dashboard state stability.

---

## Deferred

- Password-protected dashboard auth and token attachment for network-mode dashboard API calls. This remains a known issue outside PRD-020.

---

## Related

- `library/knowledge/private/design-system/project/ui_kits/dashboard/README.md`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/chrome.jsx`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/data.js`
- `../prd-014-dashboard-shell/prd-014-dashboard-shell-index.md`
- `../prd-016-dashboard-providers/prd-016-dashboard-providers-index.md`
- `../prd-017-dashboard-models/prd-017-dashboard-models-index.md`
- `../prd-019-dashboard-settings/prd-019-dashboard-settings-index.md`
- `../../completed/prd-009-codex-integration/prd-009-codex-integration-index.md`
- `../../completed/prd-011-claude-desktop-integration/prd-011-claude-desktop-integration-index.md`
- `../../completed/prd-012-server-gateway/prd-012-server-gateway-index.md`
