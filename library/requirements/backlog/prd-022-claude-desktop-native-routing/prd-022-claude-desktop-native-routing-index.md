# PRD-022: Claude Desktop Native Routing

> **Status:** Backlog
> **Priority:** P0
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Source:** `rflectr.old/src/desktop/adapters/anthropic.ts`, `rflectr.old/src/desktop/adapters/types.ts`, `rflectr.old/src/desktop/entrypoint.ts`, `library/knowledge/private/architecture/ADR-002-native-desktop-interception.md`, `library/knowledge/private/integrations/native-desktop-interception.md`

---

## Overview

Implement Claude Desktop-specific routing on top of the native desktop interception platform from PRD-021. The goal is to keep Claude Desktop on its normal first-party app path while rflectr locally intercepts supported Anthropic traffic, dispatches it through the existing provider catalog and SDK translation layer, and returns app-compatible responses.

The shipped `rflectr claude-app` third-party gateway config remains a legacy compatibility path. It must not be extended as the primary solution for making Claude Desktop feel native with alternate providers.

---

## Goals

- Verify the current Claude Desktop build on Windows and macOS before enabling native routing.
- Route Claude Desktop's Anthropic request shape through existing rflectr provider dispatch instead of duplicating routing logic.
- Preserve Claude Desktop-compatible streaming responses, tool calls, system messages, and errors.
- Let users choose a provider/model explicitly, with safe same-provider defaults and explicit consent for cross-provider routing.
- Keep legacy 3P gateway mode available as a labeled fallback when native interception is unsupported.

## Non-Goals

- Supporting ChatGPT Desktop or other sealed apps.
- Capturing memory, training data, or transcript history.
- Defeating certificate pinning.
- Changing Claude Desktop account state, login, billing, or product entitlements.
- Rewriting the shared SDK adapter.

---

## Transplant Plan

PRD-022 imports only the Anthropic adapter knowledge from the old desktop sidecar. The old adapter was built for memory capture and injection; this PRD changes its purpose to routing Claude Desktop's Anthropic request shape through current rflectr provider dispatch.

| Old source | Current destination | Treatment | Notes |
|---|---|---|---|
| `rflectr.old/src/desktop/adapters/anthropic.ts` | `src/desktop-interception/adapters/anthropic.ts` | Import parser logic and rewrite purpose | Keep host/path matching, content-block parsing, and SSE/non-streaming response parsing as test fixtures. Remove `injectMemory()` from the first routing slice. |
| `rflectr.old/src/desktop/adapters/types.ts` | `src/desktop-interception/adapters/types.ts` | Import and narrow | Replace `UserTurn`, `AssistantTurn`, and memory attribution types with request classification, parsed Anthropic request, response mapping, and redacted diagnostic types. |
| `rflectr.old/src/desktop/entrypoint.ts` | `src/desktop-interception/claude-target.ts` / `src/desktop-interception/verify.ts` | Reference only | Reuse only host/process/proxy discovery clues that still match current Claude Desktop verification. Do not import old sidecar lifecycle or memory behavior. |
| `src/server/router.ts` | same file | Extract shared dispatch | Native routing should call the same Anthropic/provider dispatch used by `/anthropic/v1/messages`, not copy provider logic into the adapter. |
| `src/sdk-adapter.ts` | same file | Reuse | Preserve existing system folding, tool handling, streaming, and thought-signature behavior. |
| `src/upstream-forward.ts` | same file | Reuse | Preserve direct Anthropic passthrough semantics for Anthropic-native routes. |

The adapter import is not complete until old memory behavior is removed. In this codebase, the adapter's job is to answer: "Is this Claude Desktop inference traffic, and how do we hand it to existing rflectr routing?"

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-022a-claude-desktop-native-routing-verification`](./prd-022a-claude-desktop-native-routing-verification.md) | Current Claude Desktop verification and support matrix. | Draft |
| [`prd-022b-claude-desktop-native-routing-anthropic-adapter`](./prd-022b-claude-desktop-native-routing-anthropic-adapter.md) | Anthropic request/response adapter for intercepted app traffic. | Draft |
| [`prd-022c-claude-desktop-native-routing-dispatch`](./prd-022c-claude-desktop-native-routing-dispatch.md) | Provider/model route selection using existing server dispatch. | Draft |
| [`prd-022d-claude-desktop-native-routing-legacy-fallback`](./prd-022d-claude-desktop-native-routing-legacy-fallback.md) | Fallback behavior and labeling for unsupported native mode. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-022-1 | Given Claude Desktop native routing is not verified on the current OS/app version, when the user attempts to enable it, then rflectr refuses native mode and offers the legacy gateway fallback instead. |
| AC-022-2 | Given verification succeeds, when Claude Desktop sends an Anthropic `/v1/messages` request through the native proxy, then rflectr extracts model, messages, system, tools, tool choice, stream flag, and thinking metadata without logging raw secrets. |
| AC-022-3 | Given the selected route is Anthropic-native, when Claude Desktop sends a message, then rflectr uses the shared upstream passthrough path unless adapter normalization is required, and tests assert both streaming SSE and non-streaming JSON response compatibility. |
| AC-022-4 | Given the selected route uses a non-Anthropic provider, when Claude Desktop sends a message, then rflectr dispatches through the existing SDK adapter path and returns Anthropic-compatible output. |
| AC-022-5 | Given Claude Desktop sends an unsupported or non-inference request to an allowlisted host, when native routing is active, then rflectr records an explicit `pass_through` or `deny` decision according to the PRD-021 egress policy and does not silently mutate unrelated app traffic. |
| AC-022-6 | Given the user selects a provider/model, when native routing starts, then the route is recorded as provider-qualified state so duplicate model ids from different providers cannot collide. |
| AC-022-7 | Given cross-provider routing would send app prompts to a provider different from the app's original destination, when the user enables it, then the UI/API requires explicit consent naming the destination provider. |
| AC-022-8 | Given streaming is enabled, when a provider emits tokens/tool events, then Claude Desktop receives progressive SSE events and first byte is not delayed until full completion. |
| AC-022-9 | Given a provider error occurs, when the error is returned to Claude Desktop, then the app receives a compatible error response and dashboard receives a redacted diagnostic. |
| AC-022-10 | Given native routing is stopped, when Claude Desktop continues running, then rflectr removes only owned proxy/trust state and does not leave the app pointed at a dead local endpoint. |
| AC-022-11 | Given the implementation is complete, when `npm test` and `npm run typecheck` run, then existing `claude-app`, server gateway, Codex, Gemini, and dashboard tests continue to pass. |
| AC-022-12 | Given the old Anthropic adapter is transplanted, when the new adapter is reviewed, then it contains no memory injection, Deeplake, or transcript persistence behavior. |
| AC-022-13 | Given dispatch is implemented, when a route is selected, then the adapter delegates to shared server/provider dispatch rather than creating a second provider factory path. |
| AC-022-14 | Given a Claude Desktop request is classified as non-inference traffic, when native mode is active, then the adapter returns a pass-through/deny decision and does not attempt routing. |

---

## Verification Evidence

Smoker evidence for PRD-022 must include:

- Command output for `npm run typecheck`, `npm test`, and targeted desktop routing tests.
- `tests/desktop-anthropic-adapter.test.ts` assertions for request classification, parsed fields, malformed payload errors, redaction, streaming SSE, non-streaming JSON, and absence of memory/Deeplake/transcript behavior.
- `tests/desktop-routing-dispatch.test.ts` assertions proving provider-qualified route selection, stale provider invalidation, shared dispatch reuse, direct Anthropic passthrough, and SDK-backed dispatch.
- `tests/desktop-claude-target.test.ts` and `tests/desktop-interception-verify.test.ts` fixtures proving current-app verification gates, stale invalidation, pinned/trust-refused states, and log redaction.
- Source inspection proving the new adapter delegates to shared `src/server/router.ts`, `src/sdk-adapter.ts`, `src/provider-factory.ts`, and `src/upstream-forward.ts` behavior rather than creating a second provider factory path.

---

## File Touch Map

| File | Change |
|---|---|
| `src/desktop-interception/adapters/anthropic.ts` | New Claude/Anthropic adapter adapted from `rflectr.old/src/desktop/adapters/anthropic.ts`. |
| `src/desktop-interception/adapters/types.ts` | New adapter types narrowed from `rflectr.old/src/desktop/adapters/types.ts`. |
| `src/desktop-interception/claude-target.ts` | New Claude Desktop target definition: supported hosts, endpoints, process/app metadata, verification expectations. |
| `src/desktop-interception/routing.ts` | New provider-qualified route selection and dispatch bridge for intercepted traffic. |
| `src/server/router.ts` | Extract reusable Anthropic dispatch from `handleAnthropicMessages` so native routing and `/anthropic/v1/messages` share behavior. |
| `src/server/models.ts` | Ensure `ServerModelInfo` carries enough provider/model metadata for native desktop route selection. |
| `src/provider-catalog.ts` | Reuse registry/local provider resolution for native mode; add helper only if current helpers cannot express the needed route. |
| `src/server/index.ts` | Reuse `loadServerModels()` behavior for native route catalogs without starting a separate server gateway. |
| `src/claude-desktop/app-launch.ts` | Reuse app discovery/open/restart helpers for native verification and launch flows. |
| `src/claude-app.ts` | Keep legacy 3P gateway mode; only add explicit fallback labeling or native command branching if required. |
| `tests/desktop-anthropic-adapter.test.ts` | New tests for request extraction, streaming event mapping, errors, and redaction. |
| `tests/desktop-claude-target.test.ts` | New tests for host/endpoint matching and support-state evaluation. |
| `tests/desktop-routing-dispatch.test.ts` | New tests for provider-qualified route dispatch, duplicate model ids, and unsupported requests. |
| `tests/server-router.test.ts` | Extend only if dispatch extraction changes router behavior. |

---

## Related

- `../prd-021-native-desktop-interception-platform/prd-021-native-desktop-interception-platform-index.md`
- `../prd-023-desktop-apps-native-controls/prd-023-desktop-apps-native-controls-index.md`
- `library/knowledge/private/architecture/ADR-002-native-desktop-interception.md`
- `library/knowledge/private/integrations/native-desktop-interception.md`
