# PRD-015: Dashboard Overview

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Source model:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx`

---

## Overview

The Dashboard Overview is the first operational screen in the rflectr web UI. It summarizes gateway health through KPIs, active tool-to-model routes, and a live request feed with request-volume sparkline. It should give users immediate confidence that the local gateway is running and show where traffic is going.

---

## Goals

- Display gateway KPIs: requests today, success rate, active routes, and average latency.
- Show active route flows in the modeled `tool -> rflectr -> model` form.
- Surface recent live requests with token, latency, backend, and status.
- Provide a compact sparkline of recent request volume.

## Non-Goals

- Full activity history and filtering; owned by PRD-018.
- Route editing or manual reroute controls.
- Provider credential management.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-015a-dashboard-overview-kpis`](./prd-015a-dashboard-overview-kpis.md) | KPI tiles and aggregate health semantics. | Draft |
| [`prd-015b-dashboard-overview-route-flows`](./prd-015b-dashboard-overview-route-flows.md) | Active route flow cards and route status. | Draft |
| [`prd-015c-dashboard-overview-live-feed`](./prd-015c-dashboard-overview-live-feed.md) | Recent request table and status display. | Draft |
| [`prd-015d-dashboard-overview-volume-sparkline`](./prd-015d-dashboard-overview-volume-sparkline.md) | Request-volume buckets and sparkline rendering. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-015-1 | Given the dashboard has loaded gateway summary data, when Overview renders, then it shows four KPI tiles matching the latest server payload. |
| AC-015-2 | Given active routes exist, when Overview renders, then each route shows the tool, rflectr hop, model, backend, status, and latency. |
| AC-015-3 | Given recent activity exists, when Overview renders, then the six newest request rows appear in descending time order. |
| AC-015-4 | Given route or activity polling updates, when new data arrives, then Overview updates without changing the user's current route. |
| AC-015-5 | Given no traffic has occurred, when Overview renders, then empty states are honest and do not show fake requests. |

---

## Data Model Changes

None.

---

## API Changes

- Dashboard overview read endpoint or bootstrap payload section containing KPI stats, active routes, recent activity rows, and request-volume buckets.

---

## Open Questions

- [ ] Should "requests today" reset at local midnight or use a rolling 24-hour window?
- [ ] Should average latency include retried requests, final successful requests only, or both?

---

## Related

- `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx`
- `../prd-014-dashboard-shell/prd-014-dashboard-shell-index.md`
- `../prd-018-dashboard-activity/prd-018-dashboard-activity-index.md`
