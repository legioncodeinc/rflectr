# PRD-023b: Desktop Apps Native Controls - Install, Stop, and Uninstall

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Source:** `src/server/router.ts`, `src/desktop-interception/state.ts`, `src/claude-desktop/app-session.ts`, `src/codex/app-session.ts`

---

## Overview

Add dashboard actions for starting, stopping, uninstalling, and reverting desktop app integrations. Each action must act only on state owned by rflectr and must be idempotent.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-023b-1 | Given native interception has not been verified, when Install or Start is requested, then the API returns a blocked status and does not mutate trust or proxy settings. |
| AC-023b-2 | Given native verification has passed and the user confirms consent, when Install is requested, then rflectr installs only the owned per-install CA/proxy state described by PRD-021b. |
| AC-023b-3 | Given native interception is installed, when Start is requested, then rflectr starts the local proxy and records a runtime handle in `DashboardRuntime`. |
| AC-023b-4 | Given native interception is running, when Stop is requested, then rflectr closes the proxy runtime and leaves installed trust state intact. |
| AC-023b-5 | Given native interception is installed, when Uninstall is requested, then rflectr removes owned CA/proxy state and leaves unrelated user proxy/trust settings untouched. |
| AC-023b-6 | Given legacy Claude gateway config is owned by rflectr, when Revert legacy config is requested, then `src/claude-desktop/app-session.ts` cleanup semantics are reused. |
| AC-023b-7 | Given Codex config is owned by rflectr, when Revert Codex is requested, then `src/codex/app-session.ts` cleanup semantics are reused. |
| AC-023b-8 | Given a stop/revert/uninstall endpoint is called twice, when the second call runs, then it returns an idempotent no-op success or clear not-owned state. |
| AC-023b-9 | Given Kill server/gateway is requested from the dashboard, when the runtime is registered in `DashboardRuntime`, then rflectr closes only owned handles and warns that the current browser connection may drop. |
| AC-023b-10 | Given any action fails, when the response is returned, then it includes a safe action category from `blocked`, `not_owned`, `unsupported`, `verification_required`, `consent_required`, `runtime_error`, or `manual_cleanup_required`, plus a manual next step without raw paths to secret files or secret values. |

## Verification Evidence

Smoker evidence must include `tests/server-router.test.ts` coverage for blocked pre-verification install/start, consent-required install, owned start/stop/uninstall, legacy Claude revert delegation, Codex revert delegation, idempotent repeat calls, kill boundary limited to `DashboardRuntime`, and safe action error categories. Tests must use mocked runtime/trust/session handles and must not kill user apps or mutate OS trust/proxy settings.

## Files To Touch

- Update `src/server/router.ts`
- Update `src/server/dashboard.ts`
- Update `src/server/index.ts`
- Reuse or add `src/desktop-interception/state.ts`
- Reuse `src/claude-desktop/app-session.ts`
- Reuse `src/codex/app-session.ts`
- Extend `tests/server-router.test.ts`

## Implementation Notes

Do not kill Claude Desktop, Codex Desktop, Claude Code, Codex CLI, or arbitrary OS processes unless a future PRD explicitly approves user-app process termination.

### Transplant Boundary

Do not wire dashboard buttons to `rflectr.old/src/desktop/entrypoint.ts`. The old entrypoint is useful as a lifecycle sketch, but the current dashboard must own runtime handles through `DashboardRuntime` and `src/server/router.ts`.

The first implementation should expose status and disabled controls before destructive actions:

- `transport_available`: PRD-021a modules compiled and tests passed.
- `verification_required`: transport exists, but PRD-022a has not verified the current Claude Desktop app/OS.
- `install_blocked`: verification or consent is missing.
- `route_blocked`: PRD-022 adapter/dispatch is missing.

Only after those states exist should active Install, Start, Stop, and Uninstall controls be added.
