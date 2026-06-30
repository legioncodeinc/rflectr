# PRD-019d: Dashboard Settings - Restart Gateway

> **Status:** Backlog
> **Priority:** P3
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`SettingsScreen` Restart gateway action)

---

## Overview

Evaluate and implement the modeled Restart gateway action only if it can be made safe within rflectr's foreground server model. If a safe restart is not available, the Settings UI should hide or disable the button with honest status.

## Goals

- Provide a restart action when the server can restart itself safely.
- Avoid leaving the user with a dead dashboard and no recovery guidance.
- Confirm before interrupting active gateway traffic.

## Non-Goals

- Daemonizing `rflectr server`.
- Installing system services.
- Restarting external tools or clients.

## User Stories

- As a user changing settings, I want to restart the gateway when a setting requires restart.
- As a user with active traffic, I want warning before a restart interrupts requests.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-019d-1 | Given restart is unsupported, when Settings renders, then the restart control is hidden or disabled and does not imply functionality. |
| AC-019d-2 | Given restart is supported, when the user clicks Restart, then a confirmation appears before the server interrupts traffic. |
| AC-019d-3 | Given the user confirms restart, when the server restarts, then the dashboard shows reconnecting state and recovers when the server returns. |
| AC-019d-4 | Given restart fails, when the server reports failure or disappears, then the dashboard shows recovery guidance. |

## Implementation Notes

- Because `rflectr server` is foreground and exits on `Ctrl+C`, true restart may require a supervisor pattern that is not currently part of the shipped architecture.
- Do not fake restart by refreshing dashboard data only.

## Test Plan

- If unsupported: component-test disabled/hidden state.
- If supported: integration-test restart request, reconnect polling, and active request warning.

## Open Questions

- [ ] Should restart remain deferred until rflectr has a daemon/supervisor mode?
- [ ] Which settings, if any, actually require a restart?
