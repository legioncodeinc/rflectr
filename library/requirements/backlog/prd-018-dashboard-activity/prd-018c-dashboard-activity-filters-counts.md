# PRD-018c: Dashboard Activity - Filters and Counts

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`ActivityScreen`, `MiniStat`)

---

## Overview

Implement the Activity summary stats and feed filters: succeeded, retried/rerouted, and errored counts plus All, Retries, and Errors filter controls.

## Goals

- Display count cards for succeeded, retried/rerouted, and errored requests.
- Filter the feed by all, retry, and error status.
- Keep counts tied to the same activity window as the feed.

## Non-Goals

- Provider/model-specific filter facets.
- Date range filtering.

## User Stories

- As a user, I want to jump directly to retries or errors.
- As a user, I want summary counts that match what the feed can show.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-018c-1 | Given activity rows exist, when counts render, then count values match the current activity window. |
| AC-018c-2 | Given the user selects Retries, when the feed renders, then only retry rows are shown. |
| AC-018c-3 | Given the user selects Errors, when the feed renders, then only HTTP/error rows are shown. |
| AC-018c-4 | Given a filter has no matching rows, when rendered, then the empty state names the active filter. |

## Implementation Notes

- Counts may be computed server-side or client-side, but they must be consistent with the feed window.
- If pagination is added later, counts should clarify whether they apply to current page or all retained events.

## Test Plan

- Unit-test count derivation.
- Component-test filter button active state and empty filtered state.

## Open Questions

- [ ] Should retry rows include requests that eventually succeeded, or only currently pending retry outcomes?
