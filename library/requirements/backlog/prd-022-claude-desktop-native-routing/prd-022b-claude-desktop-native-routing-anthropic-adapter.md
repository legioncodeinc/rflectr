# PRD-022b: Claude Desktop Native Routing - Anthropic Adapter

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Source:** `rflectr.old/src/desktop/adapters/anthropic.ts`, `src/sdk-adapter.ts`, `src/upstream-forward.ts`

---

## Overview

Adapt intercepted Claude Desktop Anthropic traffic into the same internal request shape used by the server gateway and SDK adapter. The adapter must be conservative: parse inference traffic, preserve app-compatible response semantics, and avoid mutating unrelated Claude Desktop traffic.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-022b-1 | Given a request to `/v1/messages`, when the body is valid Anthropic JSON, then the adapter extracts `model`, `messages`, `system`, `tools`, `tool_choice`, `stream`, `thinking`, headers needed for safe forwarding, and redacted diagnostics. |
| AC-022b-2 | Given a request includes `system` as a string, array, or inline message pattern, when translated, then system content is preserved according to the existing `src/sdk-adapter.ts` behavior. |
| AC-022b-3 | Given a request includes tools and tool choice, when routed through a non-Anthropic provider, then tool definitions and selection intent reach the SDK adapter. |
| AC-022b-4 | Given a request includes streaming, when a provider route streams, then SSE chunks are returned in Claude Desktop-compatible Anthropic event order. |
| AC-022b-5 | Given a request includes thinking/signature metadata, when routed through the existing adapter, then the current thought-signature round-trip behavior is preserved. |
| AC-022b-6 | Given the request path is not an inference endpoint, when the host is allowlisted, then the adapter returns `pass_through` instead of attempting to parse it as a chat completion. |
| AC-022b-7 | Given the request body is malformed, when routing is attempted, then the adapter returns a compatible error and redacted diagnostic without crashing the proxy. |
| AC-022b-8 | Given logs are emitted, when they include request metadata, then prompt bodies, cookies, authorization headers, and API keys are omitted or redacted. |

## Verification Evidence

Smoker evidence must include `tests/desktop-anthropic-adapter.test.ts` coverage for every parsed field in `AC-022b-1`, system folding parity with `src/sdk-adapter.ts`, tool and tool-choice propagation, streaming event order, thought-signature preservation, `pass_through` classification, malformed-body error handling, redacted diagnostics, and a source inspection showing `injectMemory`, `wrapMemory`, `MEMORY_OPEN`, `MEMORY_CLOSE`, Deeplake, memory, and transcript persistence are absent.

## Files To Touch

- Add `src/desktop-interception/adapters/anthropic.ts`
- Add `src/desktop-interception/adapters/types.ts`
- Add `tests/desktop-anthropic-adapter.test.ts`
- Reuse `src/sdk-adapter.ts`
- Reuse `src/upstream-forward.ts`
- Update `src/desktop-interception/hooks.ts` from PRD-021a if the adapter needs typed hook results.

## Implementation Notes

The adapter should call the same translation and forwarding primitives as the server gateway. Divergent Claude-only protocol code is a regression risk.

### Transplant Notes

Start from `rflectr.old/src/desktop/adapters/anthropic.ts`, but treat it as a parser reference, not a full behavior import.

Preserve:

- Host/path matching for Anthropic `/v1/messages`.
- Content block to text parsing where it helps tests understand captured shapes.
- SSE event parsing as fixtures for app-compatible response expectations.
- Header lookup helpers.

Remove or replace:

- `injectMemory()`.
- `wrapMemory()`, `MEMORY_OPEN`, and `MEMORY_CLOSE`.
- `UserTurn` / `AssistantTurn` as the primary output types.
- Any Deeplake, memory, or transcript grouping assumptions.

Add:

- A parsed request shape that keeps `model`, `messages`, `system`, `tools`, `tool_choice`, `stream`, `thinking`, and raw-safe metadata.
- A `classifyAnthropicDesktopRequest()` style function that returns `route`, `pass_through`, `deny`, or `malformed`.
- Tests proving memory injection markers cannot appear in routed requests unless they were already present in the user's original app payload.
