# PRD-021a: Native Desktop Interception Platform - Transport

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Source:** `rflectr.old/src/desktop/transport-mockttp.ts`, `rflectr.old/src/desktop/hooks.ts`

---

## Overview

Create the native desktop proxy transport that receives app traffic, applies hook callbacks, and streams responses back without turning the current server router into a proxy monolith.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-021a-1 | Given `startDesktopInterceptionTransport()` is called, when no port is specified, then it binds `127.0.0.1:0` and returns `{ port, close, status }`. |
| AC-021a-2 | Given a request targets an allowlisted host, when `beforeRequest` returns unchanged content, then the proxy forwards the request without body corruption. |
| AC-021a-3 | Given `beforeRequest` returns a modified body or headers, when the upstream request is sent, then only the requested modifications are applied. |
| AC-021a-4 | Given the upstream responds with SSE, when the response is streamed, then the app receives chunks progressively and the proxy does not buffer the full response before first byte. |
| AC-021a-5 | Given `afterResponse` is registered, when the response completes, then it receives a redacted copy and completion metadata. |
| AC-021a-6 | Given `close()` is called, when the listener has active sockets, then it refuses new requests and drains or closes existing requests within 5 seconds, or within the configured `closeTimeoutMs` when explicitly supplied. |
| AC-021a-7 | Given the transport throws internally, when it reports status, then dashboard sees `error` with a safe message and no secrets. |

## Verification Evidence

Smoker evidence must include `tests/desktop-interception-transport.test.ts` coverage for binding, forwarding unchanged requests, applying hook modifications, progressive SSE streaming, redacted `afterResponse` metadata, close timeout behavior, and safe error status. The transport test may use local synthetic upstream servers only and must not require OS proxy/trust-store mutation.

## Files To Touch

- Add `src/desktop-interception/transport.ts`
- Add `src/desktop-interception/hooks.ts`
- Add `tests/desktop-interception-transport.test.ts`
- Update `package.json` and `tsup.config.ts` if the chosen transport dependency requires it.

## Implementation Notes

Do not reuse `src/proxy.ts` directly; that file is an Anthropic protocol proxy, not a CONNECT/TLS interception transport. Reuse concepts, not the module boundary.

### Transplant Notes

Start from `rflectr.old/src/desktop/transport-mockttp.ts`. Preserve:

- `mockttp` as the CONNECT/TLS-capable transport engine.
- The `beforeRequest` allowlist check before any hook runs.
- The request/response correlation map.
- The explicit close/stop handle.

Change:

- Rename the public API to `startDesktopInterceptionTransport()`.
- Replace the old `PurposeHooks` comments and memory/guard assumptions with generic routing-first hooks.
- Ensure the first slice can run in tests without OS proxy mutation or trust-store writes.
- Return a status object suitable for `DashboardRuntime`, even before the dashboard consumes it.

Do not import:

- `rflectr.old/src/desktop/memory/*`
- `rflectr.old/src/desktop/purposes/memory.ts`
- `rflectr.old/src/desktop/entrypoint.ts`
