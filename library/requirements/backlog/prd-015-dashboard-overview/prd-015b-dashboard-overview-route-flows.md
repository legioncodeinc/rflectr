# PRD-015b: Dashboard Overview - Route Flows

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`RouteFlow`, `OverviewScreen`)

---

## Overview

Show active gateway routes as `tool -> rflectr -> model` cards, matching the modeled `RouteFlow` grid. Each route communicates which tool is currently pointed at which backend/model and whether the route is healthy, retrying, or degraded.

## Goals

- Display one card per active route.
- Show tool identity, model identity, backend, route status, and observed latency.
- Stack route cards on narrower screens.

## Non-Goals

- Editing route assignments.
- Showing inactive historical routes.
- Implementing auto-reroute policy; owned by Settings and server behavior.

## User Stories

- As a user, I want to know which models my tools are currently using.
- As a user, I want to see retry or degraded route status before investigating logs.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-015b-1 | Given active routes exist, when Overview renders, then each route appears as a flow card. |
| AC-015b-2 | Given a route is retrying, when the card renders, then status is visually distinct from healthy status. |
| AC-015b-3 | Given there are no active routes, when Overview renders, then the route section shows an empty state with no fake rows. |
| AC-015b-4 | Given the viewport is below the breakpoint, when the route grid renders, then cards stack in one column. |

## API Expectations

Each route payload should include:

- Tool display name and short monogram.
- Model display id and short monogram.
- Backend/provider id.
- Status: `ok`, `retry`, `error`, or equivalent mapped state.
- Latest latency where available.

## Test Plan

- Component-test healthy, retrying, and empty route states.
- Verify route ordering is stable across polling updates.

## Open Questions

- [ ] Should routes be sorted by tool name, last activity, or configured launch order?
