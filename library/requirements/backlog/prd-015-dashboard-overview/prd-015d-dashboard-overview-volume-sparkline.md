# PRD-015d: Dashboard Overview - Volume Sparkline

> **Status:** Backlog
> **Priority:** P2
> **Effort:** S (1-3h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`Sparkline`, `OverviewScreen`)

---

## Overview

Render the request-volume sparkline shown above the live request feed. The sparkline visualizes recent traffic buckets without turning Overview into a full analytics page.

## Goals

- Display recent request volume compactly.
- Handle zero-volume and missing-volume states safely.
- Keep the sparkline decorative but truthful.

## Non-Goals

- Axis labels, hover tooltips, or detailed chart inspection.
- Historical analytics beyond the current bucket window.

## User Stories

- As a user, I want a quick sense of whether traffic is rising, flat, or idle.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-015d-1 | Given volume buckets exist, when Overview renders, then the sparkline draws one point per bucket. |
| AC-015d-2 | Given all buckets are zero, when the sparkline renders, then it avoids divide-by-zero behavior and shows an idle line or empty state. |
| AC-015d-3 | Given volume data is missing, when Overview renders, then no prototype sparkline values are shown. |

## Implementation Notes

- The prototype uses 24 buckets. The final API should define bucket count and interval explicitly.
- The sparkline should not be the only place where status is communicated.

## Test Plan

- Unit-test point generation for normal, zero, and single-bucket inputs.
- Visual check the sparkline fits the feed header at desktop width.

## Open Questions

- [ ] Should buckets represent the last 24 hours, last hour, or current local day?
