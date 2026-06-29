# PRD-016b: Dashboard Providers - Import From OpenCode

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ProvidersScreen` Import from OpenCode action)

---

## Overview

Add the modeled Import from OpenCode action to the Providers surface. The action should call the server-side provider import flow, refresh the dashboard-safe registry summaries, and report import results without exposing credentials.

## Goals

- Trigger OpenCode provider import from the dashboard.
- Show progress while import is running.
- Report newly imported, updated, skipped, and failed providers.
- Refresh Providers and Models data after successful import.

## Non-Goals

- Reimplementing OpenCode catalog discovery in the browser.
- Showing imported API keys.
- Automatically enabling providers that require additional auth setup.

## User Stories

- As a user, I want to import my existing OpenCode providers without leaving the dashboard.
- As a user, I want to know whether import changed anything.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-016b-1 | Given the user clicks Import from OpenCode, when the import starts, then the button enters a busy state and duplicate clicks are ignored. |
| AC-016b-2 | Given import succeeds, when results return, then the dashboard shows a concise result summary and refreshes provider/model data. |
| AC-016b-3 | Given import partially fails, when results return, then successful imports remain visible and failures are reported with actionable messages. |
| AC-016b-4 | Given imported credentials exist server-side, when results are serialized, then raw key values are not included. |

## Implementation Notes

- Prefer invoking existing provider-catalog/import code through a server endpoint.
- Avoid long-running browser-only work; the server should own filesystem and OpenCode reads.
- Result copy should distinguish "skipped because OAuth-only" from "failed".

## Test Plan

- Unit-test import result formatting.
- Server endpoint tests with mocked OpenCode catalog data.
- Manual test with an OpenCode config containing connected, OAuth-only, and missing-key providers.

## Open Questions

- [ ] Should import require confirmation if it will update an existing provider?
- [ ] Should import results be persisted to a log or only shown transiently?
