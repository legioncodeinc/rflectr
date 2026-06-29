# PRD-021: Native Desktop Interception Platform

> **Status:** Backlog
> **Priority:** P0
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Source:** `rflectr.old/src/desktop/*`, `rflectr.old/library/knowledge/private/architecture/desktop-interception-overview.md`, `library/knowledge/private/architecture/ADR-001-data-path-owner-attach-mechanisms.md`, `library/knowledge/private/architecture/ADR-003-local-trust-egress-consent.md`

---

## Overview

Build the reusable native desktop interception platform that lets rflectr attach to sealed desktop apps through a local forward proxy and trusted per-install CA. This PRD owns the generic transport, trust, egress, lifecycle, and verification foundation. Claude Desktop-specific routing is PRD-022, and dashboard controls are PRD-023.

---

## Goals

- Add a new `src/desktop-interception/` subsystem for native desktop proxying, separate from existing protocol proxies.
- Reuse the old system's proven seams: transport, hooks, egress allowlist, CA/trust lifecycle, and app/OS verification.
- Keep current Codex Desktop config-backed behavior unchanged.
- Keep current Claude Desktop 3P gateway behavior as legacy fallback only.
- Provide status and lifecycle primitives that dashboard and CLI commands can call safely.

## Non-Goals

- Implementing Claude Desktop request adaptation; see PRD-022.
- Implementing ChatGPT Desktop; future PRD after Claude Desktop is working.
- Implementing memory capture or policy guard.
- Defeating certificate pinning.
- Installing a system service or daemon.

---

## Transplant Plan

PRD-021 should begin as a controlled transplant from `rflectr.old/src/desktop/`, not a rewrite. The first implementation slice imports the desktop interception spine as inert, testable modules with no OS proxy, trust-store, app-launch, or dashboard side effects.

| Old source | Current destination | Treatment | Notes |
|---|---|---|---|
| `rflectr.old/src/desktop/transport-mockttp.ts` | `src/desktop-interception/transport.ts` | Import and adapt | Keep the `mockttp` engine and request/response hook seam. Rename `startMockttpTransport()` to `startDesktopInterceptionTransport()` and return current-style `{ port, close, status }`. |
| `rflectr.old/src/desktop/hooks.ts` | `src/desktop-interception/hooks.ts` | Import and narrow | Keep typed intercepted request/response shapes, but remove memory/guard-specific comments from the first slice. The first purpose is routing. |
| `rflectr.old/src/desktop/egress.ts` | `src/desktop-interception/egress.ts` | Import and adapt | Keep deny-by-default behavior and leak-attempt event shape; derive allowed hosts from current config/provider state rather than the old Deeplake-oriented config. |
| `rflectr.old/src/desktop/config.ts` | `src/desktop-interception/config.ts` | Import and reshape | Keep zod validation and defaults, but remove old `HIVEMIND_CAPTURE`, Deeplake, memory, and guard settings from the first slice. |
| `rflectr.old/src/desktop/ca.ts` | `src/desktop-interception/trust.ts` | Conditional | Do not import until the transport slice proves whether `mockttp` plus installed CA files covers leaf cert generation. OS trust install/uninstall is still new work. |
| `rflectr.old/src/desktop/entrypoint.ts` | None in first slice | Defer | Current rflectr should run this through server/dashboard-owned runtime handles, not a separate standalone sidecar entrypoint. |
| `rflectr.old/src/desktop/memory/*` | None | Reject for this phase | Memory capture/recall is not part of Claude Desktop routing adoption. |
| `rflectr.old/src/desktop/purposes/memory.ts` | None | Reject for this phase | Old memory injection must not be imported into the routing slice. |
| `rflectr.old/src/desktop/proxy.ts` | None | Reject | The old hand-rolled proxy was superseded by `transport-mockttp.ts`. |

The first code step is therefore:

1. Add `mockttp` as the chosen transport dependency.
2. Add `src/desktop-interception/config.ts`, `hooks.ts`, `egress.ts`, and `transport.ts`.
3. Add unit tests for config, egress, redaction, no import-time side effects, and close/idempotency behavior.
4. Do not add OS proxy mutation, trust-store mutation, Claude Desktop launch, or dashboard buttons until this transplant compiles and tests pass.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-021a-native-desktop-interception-platform-transport`](./prd-021a-native-desktop-interception-platform-transport.md) | Native forward proxy transport and hook seam. | Draft |
| [`prd-021b-native-desktop-interception-platform-trust`](./prd-021b-native-desktop-interception-platform-trust.md) | Per-install CA, OS proxy/trust state, install/uninstall ownership. | Draft |
| [`prd-021c-native-desktop-interception-platform-egress`](./prd-021c-native-desktop-interception-platform-egress.md) | Host allowlist, redaction, leak-attempt logging. | Draft |
| [`prd-021d-native-desktop-interception-platform-verification`](./prd-021d-native-desktop-interception-platform-verification.md) | App/OS proxy and pinning verification harness. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-021-1 | Given rflectr is built, when native desktop modules are imported, then no CA, proxy setting, listener, or network side effect occurs at import time. |
| AC-021-2 | Given the platform starts a native desktop proxy, when it binds, then it uses `127.0.0.1:0`, records the actual port, and exposes a close method. |
| AC-021-3 | Given the user has not consented to CA/proxy installation, when a native desktop install action is requested, then no trust store or proxy settings are mutated. |
| AC-021-4 | Given a host is not allowlisted, when the proxy sees an outbound request, then the request is denied and a redacted leak-attempt event is recorded. |
| AC-021-5 | Given the proxy receives auth headers, cookies, bearer tokens, or API keys, when it logs or reports status, then raw secret values do not appear. |
| AC-021-6 | Given a target app/OS has not passed verification, when the user attempts enablement, then the platform refuses with an actionable unsupported state. |
| AC-021-7 | Given stop/uninstall is called repeatedly, when no runtime is active, then the operation is idempotent and does not delete unrelated files/settings. |
| AC-021-8 | Given an app pins certificates, when verification runs, then the result is `pinned` and implementation does not attempt to bypass it. |
| AC-021-9 | Given PRD-021 ships, when current CLI/Codex/Gemini tests run, then no shipped harness behavior regresses. |
| AC-021-10 | Given the transplant slice lands, when `src/desktop-interception/*` is inspected, then it contains no imports from old memory, Deeplake, policy guard, or standalone desktop entrypoint modules. |
| AC-021-11 | Given the transport dependency is added, when `npm run build` runs, then `mockttp` is intentionally bundled or externalized and the decision is reflected in `tsup.config.ts` if needed. |
| AC-021-12 | Given tests exercise the first slice, when they run, then no test requires OS proxy settings, OS trust-store writes, Claude Desktop installation, or live provider credentials. |

---

## Verification Evidence

Smoker evidence for PRD-021 must include:

- Command output for `npm run build`, `npm run typecheck`, and the targeted `npx vitest run tests/desktop-interception-*.test.ts` suite.
- A source inspection command proving `src/desktop-interception/*` has no imports from old memory, Deeplake, policy guard, or standalone desktop entrypoint modules.
- Unit tests proving import-time no-op behavior, `127.0.0.1:0` binding, close idempotency, allowlist denial, and redaction with synthetic secrets only.
- Trust/proxy tests using mocked OS adapters and synthetic install ids; no test may mutate real OS proxy settings, real trust stores, Claude Desktop installations, or live provider credentials.
- Verification-harness fixtures containing OS, app name, app version, host result, and enablement decision for supported, pinned, ignored, stale, and incomplete-evidence states.

---

## File Touch Map

| File | Change |
|---|---|
| `package.json` | Add runtime dependencies for the chosen desktop proxy/CA implementation, likely `mockttp` and certificate helper packages if not implemented with Node crypto. |
| `tsup.config.ts` | Externalize or bundle native proxy dependencies deliberately. |
| `src/desktop-interception/config.ts` | New config types and loader for native interception runtime. |
| `src/desktop-interception/transport.ts` | New proxy transport, adapted from `rflectr.old/src/desktop/transport-mockttp.ts`. |
| `src/desktop-interception/hooks.ts` | New hook seam for request/response handling. |
| `src/desktop-interception/egress.ts` | New allowlist and leak-attempt logic, adapted from old `desktop/egress.ts`. |
| `src/desktop-interception/trust.ts` | New CA/trust lifecycle abstraction. |
| `src/desktop-interception/state.ts` | New owned install/runtime state model. |
| `tests/desktop-interception-*.test.ts` | New tests for config, egress, lifecycle, trust-state no-op behavior, and transport hooks. |

---

## Related

- `library/knowledge/private/integrations/native-desktop-interception.md`
- `library/knowledge/private/security/desktop-egress-and-trust.md`
- `../prd-022-claude-desktop-native-routing/prd-022-claude-desktop-native-routing-index.md`
- `../prd-023-desktop-apps-native-controls/prd-023-desktop-apps-native-controls-index.md`
