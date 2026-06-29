# PRD-014c: Dashboard Shell - Data Client

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/data.js` (`window.RF_DATA`)

---

## Overview

Create the shared dashboard data client used by all dashboard surfaces. The UI kit currently uses `window.RF_DATA`; production should replace that with local `rflectr server` endpoints, consistent loading/error states, and controlled polling for live gateway data.

## Goals

- Provide a typed client for dashboard API calls.
- Support polling for gateway stats, routes, activity, and provider/model status.
- Make stale, loading, and failed states explicit across all screens.
- Avoid leaking credential material into browser-visible payloads.

## Non-Goals

- Defining every feature-specific payload in this PRD.
- Long-term historical analytics storage.
- Remote telemetry upload.

## User Stories

- As a user, I want dashboard values to reflect the running gateway so that I can trust what I am seeing.
- As a user, I want transient gateway failures to be visible and recoverable so that the dashboard does not look frozen.
- As an implementer, I want one client layer so that each screen does not reinvent fetch, auth, polling, and error formatting.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-014c-1 | Given a dashboard surface needs data, when it calls the client, then requests are made against the current `rflectr server` origin. |
| AC-014c-2 | Given a request succeeds, when fresh data arrives, then the relevant surface updates without a full page reload. |
| AC-014c-3 | Given a request fails, when the error is recoverable, then the surface shows a retry affordance and preserves privacy-safe error text. |
| AC-014c-4 | Given a payload includes provider credentials server-side, when serialized to the dashboard, then raw API keys and secret values are omitted. |
| AC-014c-5 | Given polling is active, when the tab is hidden, then polling slows or pauses to avoid unnecessary local work. |

## API Expectations

The exact endpoint names are implementation details, but the client should be able to request:

- Gateway summary: status, host, port, uptime, version, subscription.
- Overview metrics: request counts, success rate, active route count, average latency, volume buckets.
- Active routes.
- Provider registry summaries.
- Model catalog summaries.
- Activity feed rows and aggregate counts.
- Settings values and mutations.

## Implementation Notes

- A single endpoint may return a dashboard bootstrap payload, with feature-specific endpoints used for mutation-heavy surfaces.
- Favor explicit DTOs over leaking internal server model types directly.
- Treat `RF_DATA` as the prototype contract, not a production API contract.

## Test Plan

- Unit-test DTO parsing and credential redaction expectations.
- Test failed fetches, retry behavior, and tab visibility polling controls.
- Add integration tests once server endpoints exist.

## Open Questions

- [ ] Should the initial dashboard load use one bootstrap endpoint or screen-specific parallel endpoints?
- [ ] What polling interval is acceptable for activity and route status?
