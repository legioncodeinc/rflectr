# PRD-018: Dashboard Activity

> **Status:** Backlog
> **Priority:** P1
> **Effort:** XL (> 3d)
> **Schema changes:** Additive
> **Source model:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx`

---

## Overview

The Activity dashboard surface is the full request feed for the local gateway. It shows succeeded, retried, and errored counts; supports filtering to retries and errors; displays request rows; and includes an honest caveat that cost values for non-Anthropic translated providers are estimates.

---

## Goals

- Show full recent gateway activity, not only the Overview preview.
- Display counts for succeeded, retried/rerouted, and errored requests.
- Filter the feed by all, retries, and errors.
- Surface retry/error rows clearly enough to support debugging.
- Avoid logging or displaying prompt/completion contents.

## Non-Goals

- Long-term analytics warehouse.
- Prompt/completion inspection.
- Cost billing accuracy for translated providers.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-018a-dashboard-activity-capture`](./prd-018a-dashboard-activity-capture.md) | Server-side activity event capture and privacy-safe row model. | Draft |
| [`prd-018b-dashboard-activity-feed`](./prd-018b-dashboard-activity-feed.md) | Full request feed table, live status, and row formatting. | Draft |
| [`prd-018c-dashboard-activity-filters-counts`](./prd-018c-dashboard-activity-filters-counts.md) | Success/retry/error counts and feed filters. | Draft |
| [`prd-018d-dashboard-activity-errors-costs`](./prd-018d-dashboard-activity-errors-costs.md) | Error surfacing, retry labels, and cost-estimate caveat. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-018-1 | Given activity events exist, when Activity renders, then the feed shows recent rows with time, tool, model, backend, tokens, latency, and status. |
| AC-018-2 | Given retry and error events exist, when counts render, then succeeded, retried, and errored totals match the current activity window. |
| AC-018-3 | Given the user filters to retries or errors, when the filter changes, then the feed shows only matching rows. |
| AC-018-4 | Given an event contains request or response content internally, when serialized to the dashboard, then prompt/completion content is omitted. |
| AC-018-5 | Given cost information is shown for non-Anthropic providers, when Activity renders, then an estimate caveat is visible. |

---

## Data Model Changes

Additive if the server does not already keep an activity buffer:

- In-memory ring buffer for recent gateway activity events.
- Optional future persisted activity log is out of scope unless required by implementation.

---

## API Changes

- Activity list endpoint with optional filter parameters.
- Activity summary endpoint or combined payload for counts.

---

## Open Questions

- [ ] How many activity rows should the server retain in memory?
- [ ] Should activity survive server restart, or is in-memory recent activity enough?
- [ ] Should token counts come from provider responses only, or estimate when missing?

---

## Related

- `library/requirements/completed/prd-012-server-gateway/prd-012-server-gateway-index.md`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx`
