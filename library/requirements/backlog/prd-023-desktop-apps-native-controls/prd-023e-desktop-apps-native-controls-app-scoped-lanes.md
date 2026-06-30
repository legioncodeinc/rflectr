# PRD-023e: Desktop Apps Native Controls - App-Scoped Isolated Lanes

> **Status:** Backlog
> **Priority:** P0
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Source:** `library/knowledge/private/architecture/ADR-001-data-path-owner-attach-mechanisms.md`, `library/knowledge/private/architecture/ADR-002-native-desktop-interception.md`, `library/knowledge/private/architecture/ADR-003-local-trust-egress-consent.md`, `library/knowledge/private/integrations/native-desktop-interception.md`, PRD-021, PRD-022

---

## Overview

Establish a **lane model** so each desktop app integrates through its own isolated, independently controllable path rather than through one shared proxy surface. The Claude Desktop native lane must route a real Claude turn through rflectr **without putting rival OpenAI desktop app traffic (ChatGPT Desktop, Codex Desktop) at risk**.

Today the dashboard renders one combined "Claude Desktop" card and the runtime (`DashboardRuntime`) holds a single Claude-native probe/transport/route/install state. There is no lane abstraction, no per-app proxy launch (`app-launch.ts` opens apps in place with no args), and the OS proxy adapter is wired noop-only. Host allow-listing alone does **not** prove that a system-proxy switch would not also drag rival apps' traffic through the Claude lane. This sub-PRD defines the isolation contract that makes the safety guarantee provable, and is the organizing principle for PRD-023a–d.

Per ADR-003 and `native-desktop-interception.md`, the architecture prefers **per-app proxy scope with system proxy only as a documented fallback**. This sub-PRD makes that preference an enforceable requirement for the Claude native lane: app-scoped-or-nothing.

---

## Lane Model

A **lane** is one desktop app's integration: its attach mechanism, its isolation class, the hosts it is allowed to touch, the owned state it may mutate, and the controls that act on it. Lanes are the unit of dashboard identity, status, and destruction.

```ts
interface DesktopAppLane {
  laneId: 'claude-native' | 'claude-legacy-gateway' | 'codex-desktop';
  appName: 'Claude Desktop' | 'Codex Desktop';
  attachMechanism: 'native-interception' | 'config-profile';
  isolation: 'app-scoped-proxy' | 'config-only';
  supportedHosts: readonly string[];   // hosts this lane is permitted to intercept
  ownedState: readonly string[];       // runtime/state fields this lane may mutate
  controls: readonly ('start' | 'stop' | 'uninstall' | 'revert' | 'verify' | 'kill')[];
}
```

| Lane | App | Attach | Isolation | Preferred | Status |
|---|---|---|---|---|---|
| `claude-native` | Claude Desktop | native-interception | **app-scoped-proxy** | Yes | Primary after verification |
| `claude-legacy-gateway` | Claude Desktop | config-profile (3P gateway) | config-only | No | Fallback only |
| `codex-desktop` | Codex Desktop | config-profile + Responses proxy | config-only | n/a | Separate lane |
| `chatgpt-desktop` (future) | ChatGPT Desktop | reserved | reserved | n/a | **Out of scope** (PRD-021/022 non-goals) |

A lane's `supportedHosts` is an **upper bound**: a lane may only intercept hosts it owns. The Claude native lane owns Anthropic hosts (`api.anthropic.com`, `claude.ai`). The Codex lane owns OpenAI Responses hosts. No lane owns a rival app's hosts, so a rival app's traffic can never satisfy another lane's allowlist.

---

## Isolation Contract

The contract that makes "Claude turns route safely without touching OpenAI desktop traffic" provable:

1. **No global proxy mutation for `claude-native`.** The Claude native lane must never set a system-wide proxy (WinINET/WinHTTP, macOS network proxy, `HTTP_PROXY`/`HTTPS_PROXY` in the user environment). It may only attach a proxy to the Claude process itself.

2. **Per-app launch/relaunch only.** Claude Desktop is started or restarted with the native proxy scoped to that process — via Electron/Chromium `--proxy-server`, an app-execution-alias invocation, a protocol launch argument, or a wrapper/shortcut that carries the proxy setting. Launching must not mutate system proxy state.

3. **Egress exclusivity.** The Claude native lane's egress allowlist and request classification must provably exclude OpenAI/Codex/ChatGPT hosts. A rival app's host appearing in any lane's allowlist is a contract violation unless that lane owns the host.

4. **Hard rollback.** Every lane Start snapshots OS proxy + trust state before any mutation; Stop/Uninstall restores only owned state and asserts the post-restore snapshot equals the pre-start snapshot.

5. **Real observed turn.** Verification must observe an actual `api.anthropic.com` / `claude.ai` request from Claude Desktop, not a synthetic probe-only response.

6. **App-scoped-or-nothing.** If per-app proxy attach is unavailable for the target OS/app, rflectr refuses the native lane rather than falling back to system proxy without an explicit, very-clear user override.

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-023e-1 | Given the Desktop Apps tab renders, when lanes are displayed, then each lane (`claude-native`, `claude-legacy-gateway`, `codex-desktop`) is a distinct, independently controllable section with its own identity, attach mechanism, isolation class, status, and controls — never merged into one ambiguous box. |
| AC-023e-2 | Given the `claude-native` lane is started, when any proxy attach occurs, then rflectr attaches the proxy to the Claude Desktop process only (per-app) and never writes a system-wide proxy setting (no WinINET/WinHTTP, no macOS network proxy, no `HTTP_PROXY`/`HTTPS_PROXY` user env mutation). |
| AC-023e-3 | Given a system-wide proxy path exists, when the `claude-native` lane cannot attach per-app on the target OS/app, then rflectr refuses to start the lane and offers the legacy gateway lane instead, unless the user provides an explicit override naming the rival-app risk. |
| AC-023e-4 | Given a per-app proxy attach mechanism is required on Windows, when implementation lands, then the chosen mechanism is documented (Electron/Chromium `--proxy-server`, app-execution-alias, protocol launch arg, or wrapper/shortcut) with evidence it scopes the proxy to Claude only and leaves WinINET/WinHTTP untouched. |
| AC-023e-5 | Given the `claude-native` lane is running, when its egress allowlist and request classifier are inspected, then OpenAI/Codex/ChatGPT hosts are absent from the allowlist and a request to a rival host is classified as `deny`/`pass_through`, never routed. |
| AC-023e-6 | Given a rival desktop app (ChatGPT Desktop or Codex Desktop) is running, when the user requests a global/system proxy install or start, then rflectr refuses with an explicit warning naming the running rival app and requires a very-clear override; the safe default is app-scoped or nothing. |
| AC-023e-7 | Given the `claude-native` lane starts, when any owned state is about to mutate, then rflectr snapshots OS proxy and trust state first; the snapshot is recorded and associated with the lane instance. |
| AC-023e-8 | Given the `claude-native` lane is stopped or uninstalled, when owned state restoration completes, then rflectr asserts the post-restore OS proxy/trust snapshot equals the pre-start snapshot and reports any drift as a `manual_cleanup_required` result. |
| AC-023e-9 | Given the Claude-only live verification mode is run, when the user sends a test turn from Claude Desktop, then rflectr observes an actual `api.anthropic.com` or `claude.ai` request (real, not synthetic) and records the observed host(s) as verification evidence. |
| AC-023e-10 | Given the Claude-only live verification mode completes, when the native proxy stops, then rflectr confirms system proxy and trust state are unchanged from the pre-verification snapshot. |
| AC-023e-11 | Given any lane's Stop/Uninstall/Revert control runs, when it mutates state, then it touches only that lane's owned runtime/state fields and never another lane's probe/transport/route/install state. |
| AC-023e-12 | Given the `codex-desktop` lane renders, when its status is shown, then it never reports CA/trust/native-interception fields, and stopping/uninstalling it never mutates `claude-native` lane state. |
| AC-023e-13 | Given two lanes are both active (e.g. `claude-native` and `codex-desktop`), when either is stopped, then the other continues unaffected, proving lane runtime isolation. |
| AC-023e-14 | Given the implementation lands, when the Windows Claude Desktop launch-options investigation is reviewed, then it records which launch mechanism works on the current Claude Desktop build, with a per-app-scoped-proxy result and a known-list of any gaps. |
| AC-023e-15 | Given implementation is complete, when `npm test`, `npm run typecheck`, and a browser smoke of `/dashboard#/desktop-apps` run, then lane isolation behavior holds without console errors and no existing harness behavior regresses. |

---

## Verification Evidence

Smoker evidence for PRD-023e must include:

- `tests/server-dashboard.test.ts` assertions that each lane renders as a distinct section with its own identity/attach/isolation/status/controls (AC-023e-1).
- `tests/server-router.test.ts` assertions that the `claude-native` lane start never invokes an OS-proxy `apply` and never sets a system-wide proxy, using a mocked `OsProxyAdapter` whose `apply` would fail the test if called (AC-023e-2).
- Router test asserting the app-scoped-or-nothing refusal: when per-app attach is unavailable, start returns `app_scoped_unavailable` and offers the legacy lane; no system proxy is written (AC-023e-3).
- A Windows launch-options investigation note (under `qa/`) recording the chosen per-app launch mechanism and evidence it scopes to Claude only (AC-023e-4, AC-023e-14).
- Router/egress test asserting OpenAI/Codex/ChatGPT hosts are absent from the `claude-native` lane allowlist and a rival-host request classifies as `deny`/`pass_through` (AC-023e-5).
- Router test with a fixture detecting running rival desktop apps, asserting global-proxy start is refused with a rival-app warning and requires an explicit override (AC-023e-6).
- Router test asserting OS proxy + trust snapshot is captured before mutation on lane start and associated with the lane instance, using a mocked adapter (AC-023e-7).
- Router test asserting Stop/Uninstall restores owned state and the post-restore snapshot equals the pre-start snapshot; a drift fixture produces `manual_cleanup_required` (AC-023e-8).
- Verification test asserting a real observed Anthropic host is recorded (not the synthetic `rflectr-claude-native-verification` response id) and system-state snapshot is unchanged after stop (AC-023e-9, AC-023e-10).
- Router test asserting a per-lane Stop touches only that lane's runtime fields and leaves the other lane's probe/transport/route/install state intact (AC-023e-11, AC-023e-13).
- Dashboard test asserting `codex-desktop` lane status never carries CA/trust/interception fields (AC-023e-12).
- `npm run typecheck`, `npm test`, and browser smoke of `/dashboard#/desktop-apps` pass without console errors (AC-023e-15).

---

## Files To Touch

> PRD-level surface. Concrete implementation is owned by PRD-023a–d and PRD-021/022; this sub-PRD defines the contract those slices must satisfy.

- `src/server/dashboard.ts` — extend `DashboardRuntime` from a single Claude-native field set to per-lane state (lane identity, per-lane probe/transport/route/install, per-lane OS-proxy snapshot). Today the runtime holds exactly one probe/transport/route/install; lanes require a per-lane keyed structure.
- `src/server/router.ts` — add lane-scoped start/stop/uninstall/verify endpoints; wire app-scoped-only proxy attach for `claude-native`; add rival-app detection that blocks global proxy; add pre-start OS-proxy/trust snapshot and post-stop snapshot assertion.
- `src/desktop-interception/app-targets.ts` — add the lane table (lane id → app, attach mechanism, isolation class, owned hosts, owned state). Today only `CLAUDE_DESKTOP_TARGET` exists; generalize to lanes.
- `src/desktop-interception/egress.ts` — enforce per-lane egress exclusivity: a lane's allowlist is bounded by its owned hosts; rival hosts are never present.
- `src/claude-desktop/app-launch.ts` — add per-app proxy launch (the chosen Windows mechanism from AC-023e-4); today `openClaudeApp()` passes no args/env.
- `src/desktop-interception/os-proxy.ts` — promote the (currently noop-only) `OsProxyAdapter` to a real snapshot/apply/restore with per-lane snapshot records; keep the noop adapter for tests.
- `src/desktop-interception/claude-target.ts` — extend verification to record a real observed turn and to assert system-state snapshot invariance.
- New `src/desktop-interception/rival-apps.ts` (or equivalent) — detect running rival OpenAI desktop apps (ChatGPT Desktop, Codex Desktop) for the global-proxy block.
- `tests/server-dashboard.test.ts`, `tests/server-router.test.ts` — lane isolation, app-scoped proxy, rival-app block, snapshot/restore, real-turn observation, and per-lane stop-isolation tests.
- New `qa/` investigation note for Windows Claude Desktop launch options.

---

## Implementation Notes

### Relationship to existing 023 slices

This sub-PRD is the organizing principle for PRD-023a–d, not a replacement:

- **023a (Tab)** renders lanes as distinct sections (AC-023e-1).
- **023b (Install/Stop/Uninstall)** actions must be per-lane and honor the hard-rollback snapshot contract (AC-023e-7, AC-023e-8, AC-023e-11).
- **023c (Status/Diagnostics)** reports per-lane status and the OS-proxy/trust snapshot state.
- **023d (Codex Boundary)** formalizes Codex as a `config-only` lane distinct from Claude's `app-scoped` lane (AC-023e-12).

### Dependency on PRD-021 / PRD-022 primitives

App-scoped launch (AC-023e-4) and per-lane egress (AC-023e-5) depend on PRD-021's transport/egress and PRD-022's Claude-target/adapter work. This sub-PRD adds the lane/isolation layer on top; it does not redefine the transport or adapter. Where a 023e AC requires a PRD-021/022 primitive that does not yet exist, the AC is blocked until that primitive lands (consistent with the PRD-023 Transplant Dependency Boundary).

### Isolation is by attach scope + host exclusivity, not by process monitoring

Today's transport discriminates traffic by host allowlist, not by originating process (the `app` field on `InterceptedRequest` is derived from the egress label, not the OS process). This sub-PRD's isolation guarantee therefore rests on **(a)** per-app proxy attach so only Claude's process uses the lane's proxy, plus **(b)** host exclusivity so a rival host can never satisfy the lane's allowlist. Process-level source identification is a hardening, not a prerequisite.

### Global-proxy fallback is explicit, never silent

The safe default is app-scoped-or-nothing. A system-proxy fallback exists only behind an explicit override that names the rival-app risk (AC-023e-3, AC-023e-6). This operationalizes ADR-003's "system proxy only as a documented fallback" for the multi-rival-app reality on this machine.

### Non-Goals

- No per-lane CA. The CA stays per-install and shared (ADR-003). Lanes share one trust root; isolation is enforced at proxy-scope and egress, not at trust.
- No ChatGPT Desktop or Codex Desktop native interception. They remain `config-only` lanes (Codex) or out of scope (ChatGPT), matching PRD-021/022 non-goals.
- No defeating certificate pinning.
- No memory capture, transcript persistence, or policy guard.

---

## Related

- [`./prd-023-desktop-apps-native-controls-index.md`](./prd-023-desktop-apps-native-controls-index.md)
- [`./prd-023a-desktop-apps-native-controls-tab.md`](./prd-023a-desktop-apps-native-controls-tab.md)
- [`./prd-023b-desktop-apps-native-controls-install-stop-uninstall.md`](./prd-023b-desktop-apps-native-controls-install-stop-uninstall.md)
- [`./prd-023c-desktop-apps-native-controls-status-diagnostics.md`](./prd-023c-desktop-apps-native-controls-status-diagnostics.md)
- [`./prd-023d-desktop-apps-native-controls-codex-boundary.md`](./prd-023d-desktop-apps-native-controls-codex-boundary.md)
- `../../completed/...` not applicable; see backlog siblings:
- [`../prd-021-native-desktop-interception-platform/prd-021-native-desktop-interception-platform-index.md`](../prd-021-native-desktop-interception-platform/prd-021-native-desktop-interception-platform-index.md)
- [`../prd-022-claude-desktop-native-routing/prd-022-claude-desktop-native-routing-index.md`](../prd-022-claude-desktop-native-routing/prd-022-claude-desktop-native-routing-index.md)
- `library/knowledge/private/architecture/ADR-001-data-path-owner-attach-mechanisms.md`
- `library/knowledge/private/architecture/ADR-002-native-desktop-interception.md`
- `library/knowledge/private/architecture/ADR-003-local-trust-egress-consent.md`
- `library/knowledge/private/integrations/native-desktop-interception.md`
- `library/knowledge/private/security/desktop-egress-and-trust.md`
