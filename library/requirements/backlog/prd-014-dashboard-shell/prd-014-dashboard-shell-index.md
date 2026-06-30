# PRD-014: Dashboard Shell

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Source model:** `library/knowledge/private/design-system/project/ui_kits/dashboard/`

---

## Overview

The Dashboard Shell establishes the local web UI frame for rflectr: a dark-first, responsive application served by `rflectr server`, with persistent navigation, top-bar actions, shared data loading, theme state, and privacy-forward gateway identity. This PRD owns the dashboard application container only. The individual dashboard surfaces are separate feature PRDs that mount inside this shell.

---

## Goals

- Serve a dashboard application from `rflectr server` without requiring a separate hosted service.
- Provide stable navigation across Overview, Providers, Models, Activity, and Settings.
- Keep the local gateway address visible so users understand the UI is operating against their local process.
- Provide shared client data loading, error, loading, and refresh behavior for all dashboard surfaces.
- Preserve the modeled dark-first visual system while supporting the modeled light-theme toggle.

## Non-Goals

- Implementing the feature logic for Overview, Providers, Models, Activity, or Settings.
- Replacing the CLI wizard flows.
- Adding hosted accounts, remote sync, telemetry, or cloud persistence.
- Displaying raw API keys or secret values anywhere in the UI.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-014a-dashboard-shell-server-route`](./prd-014a-dashboard-shell-server-route.md) | Static asset serving, app route, and dashboard entrypoint in `rflectr server`. | Draft |
| [`prd-014b-dashboard-shell-navigation`](./prd-014b-dashboard-shell-navigation.md) | Sidebar, top bar, route state, collapsed state, and Add Provider routing. | Draft |
| [`prd-014c-dashboard-shell-data-client`](./prd-014c-dashboard-shell-data-client.md) | Shared API client, polling, loading states, and cross-screen refresh semantics. | Draft |
| [`prd-014d-dashboard-shell-theme-responsive`](./prd-014d-dashboard-shell-theme-responsive.md) | Dark/light theme persistence, responsive layout, and accessibility baseline. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-014-1 | Given `rflectr server` is running, when the user opens the dashboard URL, then the dashboard shell loads from the local gateway without a separate dev server. |
| AC-014-2 | Given the shell is loaded, when the user selects any primary navigation item, then the active screen changes without a full page reload and the top-bar title updates. |
| AC-014-3 | Given the gateway is running locally, when the sidebar is visible, then the gateway host and port are displayed as local status and no API key material is shown. |
| AC-014-4 | Given the user toggles the sidebar or theme, when they reload the dashboard, then the chosen shell preference is restored where local storage is available. |
| AC-014-5 | Given a dashboard API call fails, when a surface depends on that data, then the shell exposes a clear retry path and does not render misleading stale success states. |

---

## Data Model Changes

None.

---

## API Changes

- Add a dashboard static route under `rflectr server`, exact path to be finalized during implementation.
- Add shared JSON endpoints consumed by the feature PRDs. This shell PRD owns the fetch client and error handling, not the endpoint payloads themselves.

---

## Open Questions

- [ ] Should the dashboard root be `/dashboard`, `/ui`, or the server root `/`?
- [ ] Should shell preferences stay browser-local only, or should future settings persistence reuse `~/.rflectr/config.json`?
- [ ] Should `rflectr server` print the dashboard URL on startup by default?

---

## Related

- `library/knowledge/private/design-system/project/ui_kits/dashboard/README.md`
- `library/requirements/completed/prd-012-server-gateway/prd-012-server-gateway-index.md`
- `../prd-015-dashboard-overview/prd-015-dashboard-overview-index.md`
- `../prd-016-dashboard-providers/prd-016-dashboard-providers-index.md`
- `../prd-017-dashboard-models/prd-017-dashboard-models-index.md`
- `../prd-018-dashboard-activity/prd-018-dashboard-activity-index.md`
- `../prd-019-dashboard-settings/prd-019-dashboard-settings-index.md`
