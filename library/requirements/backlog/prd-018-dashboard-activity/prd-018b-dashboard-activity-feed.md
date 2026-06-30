# PRD-018b: Dashboard Activity - Feed

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ActivityFeed`, `StatusPill`), `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`ActivityScreen`)

---

## Overview

Render the full Activity feed table modeled in `screens2.jsx`, using the shared `ActivityFeed` row structure with time, tool, route, tokens, latency, and status.

## Goals

- Show recent activity rows in descending order.
- Keep route/model values readable with truncation for long ids.
- Show live status while the feed is polling.

## Non-Goals

- Infinite scroll or export in the first release.
- Request detail drawers.

## User Stories

- As a user, I want to scan recent requests and see which models handled them.
- As a user, I want to know whether the feed is live.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-018b-1 | Given rows exist, when Activity renders, then rows appear newest first. |
| AC-018b-2 | Given long model ids exist, when rows render, then they truncate without breaking the table. |
| AC-018b-3 | Given polling is active, when Activity renders, then a live indicator is visible. |
| AC-018b-4 | Given no rows exist, when Activity renders, then an empty state explains that no requests have been observed. |

## Implementation Notes

- Reuse row rendering with Overview where practical.
- Keep all event text single-line for dense scanning.

## Test Plan

- Component-test row ordering and empty state.
- Visual test long model id truncation.
- Polling test that new rows appear without duplicate keys.

## Open Questions

- [ ] Should Activity support pause/resume live updates?
