# PRD-015a: Dashboard Overview - KPIs

> **Status:** Backlog
> **Priority:** P1
> **Effort:** S (1-3h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`Kpi`, `OverviewScreen`)

---

## Overview

Render the four modeled Overview KPI tiles from live server data: requests today, success rate, active routes, and average latency.

## Goals

- Make gateway health scannable within the first viewport.
- Use consistent formatting for counts, percentages, route totals, and latency.
- Avoid fabricated sample metrics when server data is unavailable.

## Non-Goals

- Trend explanations or drill-down charts.
- Historical reporting beyond current summary values.

## User Stories

- As a user, I want to see whether requests are flowing today.
- As a user, I want to see whether the gateway is healthy without reading the activity log first.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-015a-1 | Given summary stats are available, when the KPI row renders, then all four modeled KPI labels and values are displayed. |
| AC-015a-2 | Given a metric is unavailable, when the KPI renders, then it shows an unavailable state rather than a static prototype value. |
| AC-015a-3 | Given success rate is below the defined warning threshold, when it renders, then the tile uses a warning or critical tone. |
| AC-015a-4 | Given values update through polling, when the payload changes, then KPI values update in place. |

## Implementation Notes

- Treat the `data.stats` prototype array as the visual contract only.
- Final threshold values should be centralized with the dashboard data formatting helpers.

## Test Plan

- Unit-test value formatting and unavailable states.
- Component-test tone selection for healthy, warning, and critical success rates.

## Open Questions

- [ ] What success-rate thresholds map to healthy, warning, and critical?
