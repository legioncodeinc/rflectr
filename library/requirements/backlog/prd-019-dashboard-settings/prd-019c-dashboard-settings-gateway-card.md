# PRD-019c: Dashboard Settings - Gateway Card

> **Status:** Backlog
> **Priority:** P2
> **Effort:** S (1-3h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`SettingsScreen` Gateway card, `Row`)

---

## Overview

Render the modeled Gateway card with address, version, uptime, and "runs on your machine" status. This card gives users confidence about which local gateway instance the dashboard is controlling.

## Goals

- Display gateway host, port, version, and uptime.
- Indicate the gateway is local.
- Refresh uptime without requiring a page reload.

## Non-Goals

- Process management beyond display.
- Network diagnostics.
- Log viewing.

## User Stories

- As a user, I want to know which local address my tools should use.
- As a user, I want to verify the server version and uptime before debugging.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-019c-1 | Given gateway runtime data is available, when Settings renders, then address, version, and uptime are displayed. |
| AC-019c-2 | Given the gateway runs on loopback, when the card renders, then local-machine status is visible. |
| AC-019c-3 | Given uptime changes, when polling updates, then the uptime value updates in place. |
| AC-019c-4 | Given version is unavailable, when the card renders, then it shows an honest unknown state. |

## API Expectations

Gateway settings payload should include host, port, version, uptime or started-at timestamp, bind mode, and whether network mode/password protection is active.

## Test Plan

- Component-test complete and partial gateway payloads.
- Server test runtime payload does not include secrets.

## Open Questions

- [ ] Should the card show network-bind mode and password-protected status?
