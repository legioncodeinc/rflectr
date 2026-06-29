# PRD-020d: Dashboard Reliability and Desktop Controls - Dashboard State and Polling

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/index.html`, `chrome.jsx`, `screens.jsx`, and `screens2.jsx`

---

## Overview

The dashboard client must avoid self-inflicted state corruption. Periodic polling, manual refresh, provider mutations, model tests, route changes, and app setup actions all touch overlapping state. The client needs request sequencing, mutation-aware refresh behavior, safe route fallback, and parsed error messages so the UI does not bounce, crash, or show stale success after a failed action.

## Goals

- Prevent overlapping polls from overwriting newer state.
- Pause or sequence polling around mutations and model tests.
- Make client route state resilient to stale localStorage values.
- Render actionable errors from structured API responses.
- Preserve the modeled shell behavior from `index.html` while making it production-safe.

## Non-Goals

- Adding a full client state management framework unless the current implementation cannot be made safe.
- Persisting dashboard UI state server-side.
- Solving password-protected dashboard auth in this PRD.

## User Stories

- As a user adding or deleting a provider, I want the dashboard to refresh once with the final server state instead of flickering through stale states.
- As a user testing a model, I want the test result to stay attached to the row I tested.
- As a user returning to the dashboard with an old route in localStorage, I want the dashboard to open safely.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-020d-1 | Given a poll is already in flight, when the next interval fires, then the dashboard does not start an overlapping poll for the same data scope. |
| AC-020d-2 | Given a later request finishes before an earlier request, when both responses resolve, then only the latest applicable response updates visible state. |
| AC-020d-3 | Given a mutation is in progress, when polling would refresh the same data, then polling is paused, aborted, or sequence-guarded until the mutation completes. |
| AC-020d-4 | Given a mutation succeeds, when the dashboard refreshes, then it performs one authoritative reload and clears transient optimistic status only after the reload succeeds. |
| AC-020d-5 | Given a mutation fails, when the error is rendered, then the UI keeps the user on the same screen with the same form/action context. |
| AC-020d-6 | Given a model test is running, when catalog polling refreshes rows, then the in-flight test indicator and final result remain attached to the provider-qualified row. |
| AC-020d-7 | Given the dashboard has a stale route value in localStorage, when the app boots, then it falls back to Overview or another valid route without throwing. |
| AC-020d-8 | Given a route value is not in the allowed route table, when navigation resolves it, then localStorage is repaired to a valid route. |
| AC-020d-9 | Given the new Desktop Apps tab is added, when titles and navigation render, then the title map, route component map, sidebar active state, and fallback behavior all include it. |
| AC-020d-10 | Given an API error body is `{ "error": { "message": "...", "hint": "..." } }`, when displayed, then the message and hint are parsed into readable text instead of raw JSON. |
| AC-020d-11 | Given an API error body is malformed or empty, when displayed, then the dashboard shows HTTP status and a generic fallback without crashing. |
| AC-020d-12 | Given invalid JSON is submitted to a dashboard mutation endpoint, when the server rejects it, then the action has no side effects and the UI shows a validation error. |
| AC-020d-13 | Given the server disappears during a stop/restart/kill action, when polling detects connection failure, then the dashboard shows reconnecting or stopped state rather than repeated unhandled errors. |
| AC-020d-14 | Given the viewport is narrow, when route changes and error banners render, then controls remain usable and no text overlaps within the modeled dashboard layout. |

## Implementation Notes

- Primary areas: `src/server/dashboard.ts`, browser script/client code served by `src/server/router.ts`, and dashboard route rendering tied to the UI kit.
- Use request ids, `AbortController`, or an equivalent sequence guard for client fetches.
- Keep route ids centralized so sidebar, title map, and render map cannot drift.

## Test Plan

- Component or browser-level tests for stale route fallback and route table coverage.
- Unit tests for error parsing and malformed response fallback.
- Integration tests for mutation plus overlapping poll ordering.
- Manual test with a slow endpoint/dev throttle to verify older responses cannot overwrite newer state.

## Open Questions

- [ ] Should all dashboard data remain one `/api/dashboard` payload, or should mutation-heavy areas have separate scoped refresh endpoints?
- [ ] What polling interval should Desktop Apps status use once it includes proxy liveness checks?

## Related

- `../prd-014-dashboard-shell/prd-014-dashboard-shell-index.md`
- `../prd-016-dashboard-providers/prd-016-dashboard-providers-index.md`
- `../prd-017-dashboard-models/prd-017-dashboard-models-index.md`
