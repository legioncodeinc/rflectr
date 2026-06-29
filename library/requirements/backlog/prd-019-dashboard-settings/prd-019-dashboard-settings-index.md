# PRD-019: Dashboard Settings

> **Status:** Backlog
> **Priority:** P2
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Source model:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx`

---

## Overview

The Settings dashboard surface gives users a visual way to inspect and update local rflectr preferences modeled in the UI kit: subscription tier, default tool, auto-reroute on error, request tracing, and gateway status/restart controls.

---

## Goals

- Show and update subscription tier preferences.
- Show and update the default tool launched by bare `rflectr`.
- Show and update auto-reroute and request tracing toggles.
- Display gateway address, version, uptime, and local-machine status.
- Provide a restart gateway action if implementation can safely support it.

## Non-Goals

- Editing raw config JSON.
- Managing OS credential store entries.
- Turning `rflectr server` into a background daemon.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-019a-dashboard-settings-subscription-tool`](./prd-019a-dashboard-settings-subscription-tool.md) | Subscription tier and default tool selectors. | Draft |
| [`prd-019b-dashboard-settings-routing-tracing`](./prd-019b-dashboard-settings-routing-tracing.md) | Auto-reroute and request tracing toggles. | Draft |
| [`prd-019c-dashboard-settings-gateway-card`](./prd-019c-dashboard-settings-gateway-card.md) | Gateway address/version/uptime card and local status. | Draft |
| [`prd-019d-dashboard-settings-restart`](./prd-019d-dashboard-settings-restart.md) | Restart gateway command feasibility and UX. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-019-1 | Given settings data loads, when Settings renders, then subscription tier, default tool, routing/tracing toggles, and gateway details reflect server state. |
| AC-019-2 | Given the user updates a preference, when save succeeds, then the server persists it and the UI reflects the saved value. |
| AC-019-3 | Given saving fails, when the server returns an error, then the UI restores or marks the unsaved state clearly. |
| AC-019-4 | Given tracing is off by default, when Settings renders, then the toggle accurately shows off unless persisted otherwise. |
| AC-019-5 | Given restart is unsupported in the current process model, when Settings renders, then the restart control is hidden or disabled with honest copy. |

---

## Data Model Changes

None expected. Settings should reuse existing preferences and server runtime state.

---

## API Changes

- Settings read endpoint for persisted preferences and runtime gateway details.
- Settings mutation endpoint for safe preference updates.
- Optional restart endpoint if a safe restart design is approved.

---

## Open Questions

- [ ] Where should default tool be persisted, since existing docs list `lastProvider`, `lastModel`, and related preferences but not a definitive dashboard default-tool key?
- [ ] Is gateway restart feasible from within the foreground `rflectr server` process without daemon support?
- [ ] Should request tracing toggle map to persistent config, current process only, or both?

---

## Related

- `library/requirements/completed/prd-008-preferences-tiers-favorites/prd-008-preferences-tiers-favorites-index.md`
- `library/requirements/completed/prd-012-server-gateway/prd-012-server-gateway-index.md`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx`
