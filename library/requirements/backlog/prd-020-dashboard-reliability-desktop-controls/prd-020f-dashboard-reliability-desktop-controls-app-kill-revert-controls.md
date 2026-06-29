# PRD-020f: Dashboard Reliability and Desktop Controls - App Kill and Revert Controls

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/chrome.jsx` (sidebar navigation), `screens2.jsx` (`SettingsScreen` cards/actions), and `README.md` (local-first privacy posture)
> **Supersession:** Partially superseded by PRD-023 for Claude Desktop native interception controls. Codex Desktop stop/revert controls remain valid here.

---

## Overview

The dashboard needs a dedicated Desktop Apps tab for Codex and Claude app integrations. Codex remains a config-backed app integration owned by this PRD. Claude Desktop native interception controls are now owned by PRD-023; legacy Claude 3P gateway controls may remain as fallback-only UI if implemented.

## Goals

- Add a new `Desktop Apps` dashboard tab using the modeled shell and card/action language.
- Move Codex Desktop and Claude Desktop/Claude Code configure and launch controls out of Settings into this tab.
- Add stop/kill buttons for dashboard-owned local runtimes, including Codex proxy and any Claude bridge/server runtime owned by the dashboard.
- Add revert buttons for Codex and Claude app configuration overlays.
- Make destructive actions confirmed, scoped, idempotent, and honest about what will happen.

## Non-Goals

- Killing Codex Desktop, Claude Desktop, or Claude Code app processes themselves.
- Removing user-created provider credentials.
- Reverting config changes not owned or backed up by rflectr.
- Building a hosted device manager.

## User Stories

- As a user, I want all desktop app controls in one tab so I do not confuse gateway settings with app integrations.
- As a user, I want a button that stops the dashboard-managed Codex proxy when I am done testing.
- As a user, I want a revert button that returns Codex or Claude config to its prior state.
- As a user, I want the dashboard to tell me when there is nothing safe to revert.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-020f-1 | Given the dashboard shell renders, when navigation is visible, then `Desktop Apps` appears as a first-class tab with an icon consistent with the inline Lucide style in `chrome.jsx`. |
| AC-020f-2 | Given the user opens Desktop Apps, when the page renders, then Codex and Claude appear as separate cards or sections with status, configured provider/model, local endpoint/port if applicable, and last action result. |
| AC-020f-3 | Given Codex Desktop controls previously lived in Settings, when PRD-020f is implemented, then those controls are removed from Settings and available only in Desktop Apps. |
| AC-020f-4 | Given Claude Desktop/Claude Code controls previously lived in Settings, when PRD-020f is implemented, then those controls are removed from Settings and available only in Desktop Apps. |
| AC-020f-5 | Given Codex has an active dashboard-managed proxy, when the user clicks Stop/Kill Codex Proxy and confirms, then the proxy closes and status updates to stopped without deleting unrelated config. |
| AC-020f-6 | Given Codex config is owned by the dashboard session, when the user clicks Revert Codex Configuration and confirms, then the previous config is restored and the dashboard shows restored/unmanaged state. |
| AC-020f-7 | Given Codex config has no owned restore state, when the user clicks Revert Codex Configuration, then the action is disabled or returns a no-op explanation without altering files. |
| AC-020f-8 | Given Claude app config is owned by rflectr, when the user clicks Revert Claude Configuration and confirms, then the previous Claude config or metadata state is restored according to existing restore semantics. |
| AC-020f-9 | Given Claude app config has no owned restore state, when the user clicks Revert Claude Configuration, then the action is disabled or returns a no-op explanation without altering files. |
| AC-020f-10 | Given a dashboard-owned Claude bridge/server runtime is active, when the user clicks Stop/Kill Claude Bridge and confirms, then only the rflectr-owned runtime is stopped. |
| AC-020f-11 | Given the user clicks Kill rflectr Server/Gateway, when the dashboard can terminate the foreground server, then it shows an explicit confirmation that the dashboard will disconnect and provides restart guidance before calling the endpoint. |
| AC-020f-12 | Given the foreground server kill action succeeds, when the browser loses connection, then the dashboard shows a disconnected/reconnect state if possible, or the last response explains that the user must restart `rflectr server`. |
| AC-020f-13 | Given a stop or revert action is already in progress, when the user clicks the same action again, then the duplicate click is ignored or disabled until the first request completes. |
| AC-020f-14 | Given any stop/revert action fails, when the error is displayed, then the dashboard names the affected app and action and includes safe recovery guidance. |
| AC-020f-15 | Given a revert action succeeds, when the dashboard reloads, then stale ports, stale catalog files, and stale active route labels are removed from visible app status. |
| AC-020f-16 | Given credentials or tokens are involved in app config or proxy auth, when Desktop Apps renders, then secrets are never shown; only redacted status and local endpoint identity are shown. |
| AC-020f-17 | Given Desktop Apps is viewed on a narrow viewport, when both app cards and action rows render, then buttons wrap cleanly and do not become squished or overlap. |
| AC-020f-18 | Given the user has not configured an app, when Desktop Apps renders, then configure actions are prominent and kill/revert controls are disabled with honest empty-state text. |
| AC-020f-19 | Given the user adds or removes providers, when Desktop Apps refreshes, then model/provider selectors reflect current provider availability without requiring a manual server restart unless documented by the runtime. |
| AC-020f-20 | Given Settings still has the gateway card, when Desktop Apps is introduced, then Settings retains general gateway status but no longer owns desktop app configure/launch/restore workflows. |

## API Changes

- `GET /dashboard/desktop-apps/status` or equivalent status data inside the existing dashboard payload.
- `POST /dashboard/desktop-apps/codex/configure`
- `POST /dashboard/desktop-apps/codex/stop`
- `POST /dashboard/desktop-apps/codex/revert`
- `POST /dashboard/desktop-apps/claude/configure`
- `POST /dashboard/desktop-apps/claude/stop`
- `POST /dashboard/desktop-apps/claude/revert`
- Optional `POST /dashboard/gateway/stop` if the foreground gateway can safely self-terminate with a final response.

Exact endpoint names can follow existing router conventions, but each action must have action-specific tests and idempotent behavior.

## Implementation Notes

- Primary areas: `src/server/dashboard.ts`, `src/server/router.ts`, `src/codex/app-session.ts`, `src/codex/app-config.ts`, `src/claude-desktop/app-session.ts`, `src/claude-desktop/app-config.ts`, and shell navigation code.
- Labels may use "Stop" for user clarity while the acceptance criteria preserve the requested kill capability.
- Revert must operate only on rflectr-owned restore state. If ownership cannot be proven, require manual guidance instead of guessing.

## Test Plan

- Browser/component tests for Desktop Apps route, navigation, card layout, disabled empty states, and responsive button wrapping.
- Router tests for Codex stop/revert idempotence and stale/no-owned-state behavior.
- Router tests for Claude stop/revert idempotence and stale/no-owned-state behavior.
- Manual test: configure Codex, stop proxy, revert config, confirm Codex config no longer points at the stopped local port.
- Manual test: configure Claude app path, revert, confirm metadata and config return to previous state.

## Open Questions

- [ ] Should the gateway self-stop button ship in the first pass, or should it be gated behind support for a final disconnect page?
- [ ] Should the tab be labeled `Desktop Apps` exactly, or should route id be `desktop-apps` with label `Desktop Apps`?
- [ ] Do Claude Desktop and Claude Code need separate cards, or one Claude card with detected app variants?

## Related

- `./prd-020a-dashboard-reliability-desktop-controls-codex-lifecycle.md`
- `../prd-019-dashboard-settings/prd-019-dashboard-settings-index.md`
- `../../completed/prd-011-claude-desktop-integration/prd-011-claude-desktop-integration-index.md`
