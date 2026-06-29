# PRD-023: Desktop Apps Native Controls

> **Status:** Backlog
> **Priority:** P0
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/chrome.jsx`, `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx`, `library/knowledge/private/design-system/project/ui_kits/dashboard/README.md`
> **Source:** `library/knowledge/private/architecture/ADR-002-native-desktop-interception.md`, PRD-021, PRD-022

---

## Overview

Expose native desktop interception safely in the dashboard's `Desktop Apps` tab. This PRD owns the product surface for installing, verifying, starting, stopping, uninstalling, and diagnosing Claude Desktop native routing while preserving existing Codex Desktop controls and clearly separating legacy Claude gateway mode.

---

## Goals

- Add dashboard API/runtime state for native desktop interception.
- Make Claude Desktop native mode understandable, reversible, and visibly distinct from legacy gateway config.
- Keep Codex Desktop configure/revert behavior in the same Desktop Apps section without changing its architecture.
- Provide stop/kill/revert controls that act only on rflectr-owned processes and files.
- Follow the modeled dashboard shell and width/layout expectations from the UI kit.

## Non-Goals

- Implementing the underlying native proxy; see PRD-021.
- Implementing Claude request routing; see PRD-022.
- Killing arbitrary user app processes unless a separate explicit PRD approves that behavior.
- Showing raw credentials, cookies, prompts, or response text in dashboard diagnostics.

---

## Transplant Dependency Boundary

PRD-023 starts after the PRD-021 transplant slice compiles and has tests. The dashboard must not expose install/start controls that mutate OS proxy or trust state until PRD-021b and PRD-022a verification are implemented.

The first dashboard-facing increment is status-only:

1. Show that native interception is `not_installed`, `not_verified`, or `transport_available`.
2. Show the imported transport dependency and feature readiness without offering destructive controls.
3. Keep legacy Claude gateway and Codex Desktop controls separate from native interception.
4. Add disabled actions with honest reasons only after the backing endpoints exist.

Dashboard controls can become active in this order:

| Control | Earliest enabling condition |
|---|---|
| Verify Claude Desktop | PRD-021 transport status exists and PRD-022a verification harness exists. |
| Start local native proxy | PRD-021a transport and PRD-021c egress tests pass. |
| Install trust/proxy state | PRD-021b owned install/uninstall state exists and requires explicit consent. |
| Route Claude Desktop | PRD-022b adapter and PRD-022c dispatch pass tests. |
| Uninstall native state | PRD-021b ownership tracking exists and has idempotent tests. |

---

## Status Vocabulary

Dashboard native state uses these stable values: `not_installed`, `transport_available`, `verification_required`, `not_verified`, `install_blocked`, `route_blocked`, `installed`, `running`, `stop_pending`, `uninstall_pending`, and `error`.

Destructive disabled controls must include a prerequisite reason code from this vocabulary or a narrower action reason such as `missing_consent`, `not_owned`, `verification_stale`, or `runtime_not_owned`.

## Runtime Kill Boundary

Kill server/gateway actions may close only runtime handles registered in `DashboardRuntime`. They must not terminate Claude Desktop, Codex Desktop, Claude Code, Codex CLI, or arbitrary OS processes.

## Old Source Transplant Boundary

`rflectr.old/src/desktop/entrypoint.ts` may be used only as lifecycle reference material. Dashboard actions must route through current `src/server/router.ts` endpoints and owned `DashboardRuntime` handles. Any reused old-source behavior must be transplanted into current PRD-021/PRD-022 modules with tests before PRD-023 enables destructive controls.

---

## Isolated Lanes Model

Each desktop app integrates through its own **lane**: an isolated, independently controllable path with its own attach mechanism, isolation class, owned hosts, owned state, and controls. Lanes — not "Claude Desktop" as a monolith — are the unit of dashboard identity, status, and destruction. The lanes model is defined fully in [`prd-023e`](./prd-023e-desktop-apps-native-controls-app-scoped-lanes.md) and is the organizing principle for 023a–d.

| Lane | App | Attach | Isolation | Preferred |
|---|---|---|---|---|
| `claude-native` | Claude Desktop | native-interception | **app-scoped-proxy** | Yes (primary after verification) |
| `claude-legacy-gateway` | Claude Desktop | config-profile (3P gateway) | config-only | No (fallback only) |
| `codex-desktop` | Codex Desktop | config-profile + Responses proxy | config-only | n/a (separate lane) |
| `chatgpt-desktop` (future) | ChatGPT Desktop | reserved | reserved | Out of scope (PRD-021/022 non-goals) |

The **isolation contract** that makes "a real Claude Desktop turn routes safely without touching OpenAI desktop traffic" provable:

1. **No global proxy mutation for `claude-native`** — app-scoped proxy only; never WinINET/WinHTTP, macOS network proxy, or user-env `HTTP_PROXY`/`HTTPS_PROXY`.
2. **Per-app launch/relaunch only** — Claude is launched/restarted with the proxy scoped to its process (Electron/Chromium `--proxy-server`, app-execution-alias, protocol arg, or wrapper/shortcut), never via a system proxy switch.
3. **Egress exclusivity** — a lane's allowlist is bounded by its owned hosts; rival-app hosts (OpenAI/Codex/ChatGPT) never appear in the Claude lane and a rival-host request is `deny`/`pass_through`.
4. **Hard rollback** — every lane Start snapshots OS proxy + trust state; Stop/Uninstall restores only owned state and asserts the post-restore snapshot equals the pre-start snapshot.
5. **Real observed turn** — verification observes an actual `api.anthropic.com`/`claude.ai` request, not a synthetic probe-only response.
6. **App-scoped-or-nothing** — if per-app attach is unavailable, rflectr refuses the native lane rather than silently falling back to system proxy; a system-proxy fallback exists only behind an explicit override naming the rival-app risk.

Global proxy is **explicitly blocked while rival OpenAI desktop apps (ChatGPT Desktop, Codex Desktop) are running**: rflectr refuses global-proxy install/start with a very-clear warning and requires an explicit override. The safe default is app-scoped or nothing.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-023a-desktop-apps-native-controls-tab`](./prd-023a-desktop-apps-native-controls-tab.md) | Desktop Apps layout, route ownership, and responsive cards. | Draft |
| [`prd-023b-desktop-apps-native-controls-install-stop-uninstall`](./prd-023b-desktop-apps-native-controls-install-stop-uninstall.md) | Install, start, stop, uninstall, revert, and server kill actions. | Draft |
| [`prd-023c-desktop-apps-native-controls-status-diagnostics`](./prd-023c-desktop-apps-native-controls-status-diagnostics.md) | Status polling, verification results, and safe diagnostics. | Draft |
| [`prd-023d-desktop-apps-native-controls-codex-boundary`](./prd-023d-desktop-apps-native-controls-codex-boundary.md) | Keep Codex Desktop controls accurate without mixing them into native interception. | Draft |
| [`prd-023e-desktop-apps-native-controls-app-scoped-lanes`](./prd-023e-desktop-apps-native-controls-app-scoped-lanes.md) | Isolated per-app lanes: app-scoped Claude-only routing, rival-app global-proxy block, hard rollback. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-023-1 | Given the dashboard shell renders, when navigation is visible, then `Desktop Apps` is a first-class tab using the modeled sidebar/header patterns from `chrome.jsx`. |
| AC-023-2 | Given the user opens Desktop Apps, when the page renders, then Claude Desktop Native Interception, Claude Legacy Gateway, and Codex Desktop appear as separate sections or cards with clear status. |
| AC-023-3 | Given native interception status is `not_installed`, `not_verified`, `verification_required`, `install_blocked`, or `route_blocked`, when Claude Desktop Native Interception renders, then install/start controls are disabled with prerequisite reason codes and verification/fallback guidance is shown. |
| AC-023-4 | Given native interception is verified, when the user starts it, then dashboard calls the native runtime API and shows port, app target, selected provider/model, trust state, and route state. |
| AC-023-5 | Given native interception is running, when the user clicks Stop, then the local proxy stops without uninstalling owned CA/trust material unless the user chooses Uninstall. |
| AC-023-6 | Given the user clicks Uninstall, when rflectr owns the CA/proxy settings, then the dashboard removes only owned native interception state and reports success or a specific manual cleanup action. |
| AC-023-7 | Given legacy Claude gateway config is active, when the user clicks Revert legacy config, then only rflectr-owned Claude Desktop config/session changes are restored. |
| AC-023-8 | Given Codex Desktop config is active, when the user clicks Revert Codex, then current Codex restore behavior is used and native interception state is untouched. |
| AC-023-9 | Given the user clicks Kill server/gateway, when rflectr owns a `DashboardRuntime` handle, then dashboard closes only that owned handle and communicates that the browser may disconnect. |
| AC-023-10 | Given a provider is added, deleted, or edited, when Desktop Apps polls or refreshes, then provider/model selectors and active route status reflect current registry state without stale deleted sources. |
| AC-023-11 | Given credentials or intercepted traffic exist, when status/diagnostics render, then raw API keys, auth headers, cookies, prompts, and response bodies are never shown. |
| AC-023-12 | Given the window is narrow or wide, when Desktop Apps cards render, then controls are not squished, text does not overlap, and action rows wrap cleanly. |
| AC-023-13 | Given a dashboard action is already pending, when the user clicks another destructive action, then the second action is disabled until the first finishes. |
| AC-023-14 | Given the dashboard polls status, when a modal or focused input is active, then polling does not steal focus or cause the page to bounce. |
| AC-023-15 | Given implementation is complete, when `npm test`, `npm run typecheck`, and a browser smoke of `/dashboard#/desktop-apps` run, then Desktop Apps behaves without console errors. |
| AC-023-16 | Given only the PRD-021 transport transplant has landed, when Desktop Apps renders, then OS proxy, trust install, and Claude route buttons remain disabled with specific missing-prerequisite reasons. |
| AC-023-17 | Given native controls become enabled, when a user activates them, then each action maps to a specific endpoint and owned runtime/state object rather than shelling out to the old standalone entrypoint. |
| AC-023-18 | Given Desktop Apps status or action endpoints respond, when clients consume them, then they return stable typed DTOs for status, action result, reason code, and safe diagnostic fields. |
| AC-023-19 | Given a destructive Desktop Apps control is disabled, when the user inspects it or the API response, then the disabled state includes a prerequisite reason code and does not rely on copy alone. |
| AC-023-20 | Given Settings currently contains desktop app workflows, when Desktop Apps replacement is not fully verified, then existing Settings behavior is preserved; once replacement is verified, duplicate desktop workflows are removed from Settings. |
| AC-023-21 | Given old source behavior is reused, when implementation is reviewed, then provenance shows it was transplanted into current PRD-021/PRD-022 modules with tests and no dashboard action shells out to `rflectr.old/src/desktop/entrypoint.ts`. |
| AC-023-22 | Given the Desktop Apps tab renders, when lanes are displayed, then `claude-native`, `claude-legacy-gateway`, and `codex-desktop` are distinct, independently controllable lanes with their own identity, attach mechanism, isolation class, status, and controls. |
| AC-023-23 | Given the `claude-native` lane is started, when any proxy attach occurs, then rflectr attaches the proxy to the Claude Desktop process only and never writes a system-wide proxy setting (no WinINET/WinHTTP, no macOS network proxy, no user-env `HTTP_PROXY`/`HTTPS_PROXY`). |
| AC-023-24 | Given a rival desktop app (ChatGPT Desktop or Codex Desktop) is running, when the user requests a global/system proxy install or start, then rflectr refuses with an explicit warning naming the running rival app and requires a very-clear override; the safe default is app-scoped or nothing. |
| AC-023-25 | Given a `claude-native` lane Start is about to mutate owned state, when the mutation proceeds, then rflectr snapshots OS proxy and trust state first and associates the snapshot with the lane instance; on Stop/Uninstall the post-restore snapshot must equal the pre-start snapshot or the result is `manual_cleanup_required`. |
| AC-023-26 | Given the Claude-only live verification mode runs, when the user sends a test turn from Claude Desktop, then rflectr observes an actual `api.anthropic.com`/`claude.ai` request (real, not synthetic) and confirms system proxy/trust state is unchanged on stop. |
| AC-023-27 | Given the `claude-native` lane is running, when its egress allowlist and request classifier are inspected, then OpenAI/Codex/ChatGPT hosts are absent and a rival-host request is classified `deny`/`pass_through`, never routed. |
| AC-023-28 | Given any lane's Stop/Uninstall/Revert runs, when it mutates state, then it touches only that lane's owned runtime/state fields and leaves every other lane's probe/transport/route/install state intact. |

---

## Verification Evidence

Smoker evidence for PRD-023 must include:

| AC ID | Required evidence |
|---|---|
| AC-023-1, AC-023a-1 | `tests/server-dashboard.test.ts` asserts Desktop Apps route id, nav label, and active state. |
| AC-023-2, AC-023a-2..5 | Dashboard render test asserts separate Claude Native, Claude Legacy Gateway, and Codex Desktop sections. |
| AC-023-3, AC-023-16, AC-023b-1 | Router/dashboard tests assert disabled controls plus prerequisite reason codes before PRD-021/022 readiness. |
| AC-023-4..6, AC-023b-2..5 | `tests/server-router.test.ts` asserts endpoint calls mutate only owned runtime/trust state mocks. |
| AC-023-7, AC-023b-6 | Router test asserts legacy Claude restore delegates to `src/claude-desktop/app-session.ts`. |
| AC-023-8, AC-023b-7, AC-023d-3 | Router test asserts Codex restore delegates to `src/codex/app-session.ts` and native state is untouched. |
| AC-023-9, AC-023b-9, AC-023d-4 | Router test asserts only registered owned handles close; no user app process kill is attempted. |
| AC-023-10, AC-023d-6 | Provider catalog refresh test asserts deleted providers/models do not reappear. |
| AC-023-11, AC-023b-10, AC-023c-5..6 | Snapshot/string tests assert API keys, auth headers, cookies, prompts, response bodies, and secret file paths are absent. |
| AC-023-12, AC-023a-6 | Browser smoke at narrow and wide widths asserts no overlap or squished action rows. |
| AC-023-13 | Dashboard test asserts destructive buttons are disabled while one action is pending. |
| AC-023-14, AC-023c-7 | Browser smoke asserts polling preserves focused input and typed value. |
| AC-023c-8 | Render test passes unknown status fields and asserts page still renders. |
| AC-023-15 | `npm test`, `npm run typecheck`, and browser smoke of `/dashboard#/desktop-apps` pass without console errors. |
| AC-023-17 | Router tests assert each enabled action maps to a specific current endpoint and owned runtime/state object. |
| AC-023-18, AC-023-19 | Router tests assert typed DTO shapes and prerequisite reason codes for disabled/destructive actions. |
| AC-023-20 | Dashboard tests assert Settings behavior is preserved until Desktop Apps replacement is verified, then duplicate desktop workflows are removed. |
| AC-023-21 | Source inspection and tests assert old-source behavior is transplanted into current modules and no action shells out to the old entrypoint. |
| AC-023-22, AC-023e-1 | `tests/server-dashboard.test.ts` asserts each lane renders as a distinct section with its own identity/attach/isolation/status/controls. |
| AC-023-23, AC-023e-2..3 | `tests/server-router.test.ts` asserts `claude-native` start never invokes an OS-proxy `apply` (mocked adapter whose `apply` fails the test if called) and refuses with `app_scoped_unavailable` when per-app attach is unavailable. |
| AC-023-24, AC-023e-6 | Router test with a running-rival-app fixture asserts global-proxy start is refused with a rival-app warning and requires an explicit override. |
| AC-023-25, AC-023e-7..8 | Router test with a mocked `OsProxyAdapter` asserts a pre-start snapshot is captured and associated with the lane, Stop/Uninstall restores owned state, and a drift fixture yields `manual_cleanup_required`. |
| AC-023-26, AC-023e-9..10 | Verification test asserts a real observed Anthropic host is recorded (not the synthetic `rflectr-claude-native-verification` id) and the system-state snapshot is unchanged after stop. |
| AC-023-27, AC-023e-5 | Router/egress test asserts OpenAI/Codex/ChatGPT hosts are absent from the `claude-native` allowlist and a rival-host request classifies `deny`/`pass_through`. |
| AC-023-28, AC-023e-11..13 | Router test asserts a per-lane Stop touches only that lane's runtime fields and leaves the other lane's probe/transport/route/install state intact; `codex-desktop` status never carries CA/trust/interception fields. |

---

## File Touch Map

| File | Change |
|---|---|
| `src/server/dashboard.ts` | Extend `DashboardRuntime`, dashboard DTOs, embedded `desktopApps()` UI, action handlers, and status rendering. |
| `src/server/router.ts` | Add dashboard API routes for native status, verify, install, start, stop, uninstall, legacy revert, Codex revert, and server/runtime kill. |
| `src/server/index.ts` | Ensure runtime handles are registered and closed cleanly when server exits. |
| `src/desktop-interception/state.ts` | Add or reuse PRD-021-owned status data for owned native install/runtime state after owned state exists. |
| `src/desktop-interception/verify.ts` | Add or reuse PRD-021/PRD-022-owned verification action after the verification slice lands. |
| `src/desktop-interception/routing.ts` | Add or reuse PRD-022-owned selected provider/model status for active Claude native routing after dispatch exists. |
| `src/claude-desktop/app-session.ts` | Reuse legacy config restore behavior for fallback controls. |
| `src/codex/app-session.ts` | Reuse Codex config restore behavior for Codex Desktop card. |
| `tests/server-dashboard.test.ts` | Add Desktop Apps layout/state tests and responsive markup assertions where practical. |
| `tests/server-router.test.ts` | Add dashboard API action tests for status, stop, uninstall, revert, and failure cases. |
| `src/desktop-interception/app-targets.ts` | Add the lane table (lane id → app, attach mechanism, isolation class, owned hosts, owned state); generalize the single `CLAUDE_DESKTOP_TARGET` to lanes (PRD-023e). |
| `src/desktop-interception/egress.ts` | Enforce per-lane egress exclusivity: a lane's allowlist bounded by its owned hosts; rival hosts never present (PRD-023e). |
| `src/desktop-interception/os-proxy.ts` | Promote the (noop-only) `OsProxyAdapter` to a real snapshot/apply/restore with per-lane snapshot records; keep the noop adapter for tests (PRD-023e). |
| `src/claude-desktop/app-launch.ts` | Add per-app proxy launch (the chosen Windows mechanism); `openClaudeApp()` currently passes no args/env (PRD-023e, depends on PRD-022a verification). |
| `src/desktop-interception/rival-apps.ts` | New: detect running rival OpenAI desktop apps (ChatGPT, Codex Desktop) for the global-proxy block (PRD-023e). |

---

## Related

- `../prd-020-dashboard-reliability-desktop-controls/prd-020-dashboard-reliability-desktop-controls-index.md`
- `../prd-021-native-desktop-interception-platform/prd-021-native-desktop-interception-platform-index.md`
- `../prd-022-claude-desktop-native-routing/prd-022-claude-desktop-native-routing-index.md`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/README.md`
