# PRD-015c: Dashboard Overview - Live Feed

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ActivityFeed`, `StatusPill`, `OverviewScreen`)

---

## Overview

Render the compact live request feed on Overview. The feed shows the latest request rows with time, tool, route, tokens, latency, and status. It is a preview of PRD-018's full Activity surface.

## Goals

- Show the six most recent request events.
- Make retry and error statuses visible without requiring Activity navigation.
- Keep row content compact and scan-friendly.

## Non-Goals

- Full filtering, pagination, or export.
- Storing long-term request history.
- Showing request bodies, prompts, completions, or secret headers.

## User Stories

- As a user, I want to see the latest traffic at a glance.
- As a user, I want to spot rate limits or retries quickly.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-015c-1 | Given recent activity exists, when Overview renders, then the feed shows at most six newest rows. |
| AC-015c-2 | Given a row status is `retry`, when rendered, then it uses retry-specific styling. |
| AC-015c-3 | Given a row status is an HTTP error, when rendered, then it uses critical styling and the status code is visible. |
| AC-015c-4 | Given no activity exists, when rendered, then the feed shows an empty state. |

## Privacy Notes

- The feed must not include prompt text, completion text, raw headers, API keys, or request bodies.
- Model ids and provider/backend ids are allowed because they are already user-configured routing metadata.

## Test Plan

- Component-test status pill variants.
- Verify row truncation for long model ids.
- Confirm only the newest six rows render.

## Open Questions

- [ ] Should Overview link directly to filtered Activity when a user clicks a retry or error row?
