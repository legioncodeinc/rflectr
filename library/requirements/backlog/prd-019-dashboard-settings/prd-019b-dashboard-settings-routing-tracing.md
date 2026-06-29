# PRD-019b: Dashboard Settings - Routing and Tracing Toggles

> **Status:** Backlog
> **Priority:** P2
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`SettingsScreen`, `Toggle`)

---

## Overview

Implement the modeled Auto-reroute on error and Request tracing toggles. These controls must map to actual server behavior or be explicitly scoped as future-facing settings if server support does not yet exist.

## Goals

- Display current auto-reroute preference.
- Display current request tracing preference, off by default.
- Persist changes through `rflectr server`.
- Explain local trace behavior without exposing trace contents in the dashboard.

## Non-Goals

- Building a trace viewer.
- Uploading traces remotely.
- Changing retry/reroute algorithms without server-side design.

## User Stories

- As a user, I want rflectr to retry on another healthy provider when rate limits or 5xx errors occur.
- As a user, I want to turn tracing on only when debugging and know where traces are written.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-019b-1 | Given settings load, when rendered, then auto-reroute and request tracing toggles match server state. |
| AC-019b-2 | Given the user toggles auto-reroute, when save succeeds, then future eligible errors follow the selected policy. |
| AC-019b-3 | Given the user toggles request tracing on, when save succeeds, then traces are written only to the configured local trace path. |
| AC-019b-4 | Given tracing is enabled, when Settings renders, then the UI makes local trace implications clear and does not display trace contents. |
| AC-019b-5 | Given the server does not support one toggle yet, when Settings renders, then that control is disabled rather than pretending to work. |

## Implementation Notes

- Current CLI `--trace` behavior writes debug logs for launched flows; server tracing may need a separate runtime flag or persisted setting.
- Auto-reroute must be aligned with existing retry behavior in routing code before exposing it as a true setting.

## Test Plan

- Settings mutation tests for supported toggles.
- Manual request that triggers retry/rate-limit behavior with auto-reroute on and off.
- Trace-on manual test confirming local file creation and no dashboard payload leakage.

## Open Questions

- [ ] Does server gateway currently have a runtime auto-reroute policy to toggle?
- [ ] Should tracing changes take effect immediately or require server restart?
