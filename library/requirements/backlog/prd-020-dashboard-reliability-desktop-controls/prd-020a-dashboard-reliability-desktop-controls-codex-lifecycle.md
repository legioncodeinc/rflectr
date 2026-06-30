# PRD-020a: Dashboard Reliability and Desktop Controls - Codex Lifecycle

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`SettingsScreen` gateway card) and `chrome.jsx` (new `Desktop Apps` navigation item)

---

## Overview

Dashboard-triggered Codex Desktop setup must behave like an owned lifecycle, not a one-way config mutation. When rflectr patches Codex app configuration to point at a dashboard-managed proxy, rflectr must track ownership, expose status, restore config when appropriate, and avoid leaving Codex pointed at a dead local port.

## Goals

- Track dashboard-owned Codex Desktop runtime state in memory and restore-state files.
- Restore or clear dashboard-managed Codex config on server close, intentional stop, replacement, and process shutdown where safe.
- Surface Codex Desktop state in the new Desktop Apps tab with clear connected, stopped, stale, and restore-available states.
- Keep existing CLI `rflectr codex-app --restore` semantics compatible.

## Non-Goals

- Changing Codex Desktop's own config schema.
- Editing unrelated Codex config keys that rflectr did not own.
- Supporting password-protected dashboard auth in this PRD.
- Launching or killing the Codex Desktop process itself.

## User Stories

- As a user who clicked Configure for Codex Desktop, I want Codex to keep working while the rflectr server is alive.
- As a user who stops rflectr, I want Codex not to remain pointed at a dead proxy with no explanation.
- As a user debugging configuration, I want the dashboard to tell me whether it owns the current Codex config and whether restore is available.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-020a-1 | Given the dashboard configures Codex Desktop, when the patch is applied, then rflectr writes ownership metadata that includes config path, restore-state path, proxy port, catalog path, provider id, model id, and current process/session owner. |
| AC-020a-2 | Given ownership metadata exists, when the dashboard status endpoint is called, then it returns `connected`, `stopped`, `stale`, or `unmanaged` rather than only a generic success boolean. |
| AC-020a-3 | Given the active server closes normally, when the Codex Desktop proxy was started by that server, then the proxy is closed and the owned config overlay is restored or marked restore-required. |
| AC-020a-4 | Given process shutdown hooks fire, when the dashboard owns the Codex overlay, then rflectr attempts best-effort restore without throwing unhandled errors. |
| AC-020a-5 | Given the restore operation succeeds, when Codex config is read afterward, then pre-existing user keys such as `model`, `model_provider`, `openai_base_url`, `model_reasoning_effort`, and unrelated settings are preserved exactly. |
| AC-020a-6 | Given no owned restore state exists, when the user requests restore, then the endpoint returns a clear no-op response and does not delete arbitrary Codex config. |
| AC-020a-7 | Given a restore-state file belongs to another active process, when this server attempts cleanup, then it does not claim ownership unless the state is stale and explicitly recoverable. |
| AC-020a-8 | Given the dashboard-managed proxy port is no longer listening, when status refreshes, then the UI labels the Codex connection as stale and offers Revert. |
| AC-020a-9 | Given the dashboard-owned catalog file exists, when restore succeeds, then the catalog file is removed only if it is owned by the restored session. |
| AC-020a-10 | Given restore fails because the config file is locked or unreadable, when the endpoint responds, then the UI shows the file path and recovery action without exposing secrets. |
| AC-020a-11 | Given the user runs CLI restore after dashboard setup, when restore succeeds, then dashboard status later reports unmanaged or restored instead of connected. |
| AC-020a-12 | Given the server starts with stale dashboard-owned restore state, when startup recovery runs, then stale state is detected and made visible before any new Codex setup action. |

## Implementation Notes

- Primary areas: `src/server/router.ts`, `src/codex/app-config.ts`, `src/codex/app-session.ts`, `src/codex/app-profile.ts`, and `tests/codex-app-session.test.ts`.
- The dashboard should treat Codex Desktop setup as a runtime resource with ownership, not as a stateless payload generator.
- Restore must be idempotent and safe to call multiple times.

## Test Plan

- Unit-test restore-state ownership checks and idempotent restore.
- Router-test setup, status, stop, restore, and stale-port responses.
- Integration-test normal server close after dashboard Codex setup.
- Regression-test that user-owned Codex config keys survive restore unchanged.

## Open Questions

- [ ] Should normal server close always auto-restore, or should it leave config plus a clear stale marker for reconnect workflows?
- [ ] Should stale restore recovery happen automatically on next `rflectr server` startup or require user confirmation in Desktop Apps?

## Related

- `./prd-020f-dashboard-reliability-desktop-controls-app-kill-revert-controls.md`
- `../../completed/prd-009-codex-integration/prd-009-codex-integration-index.md`
