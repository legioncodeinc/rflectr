# PRD-022c: Claude Desktop Native Routing - Dispatch

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Source:** `src/server/router.ts`, `src/server/models.ts`, `src/provider-catalog.ts`

---

## Overview

Route intercepted Claude Desktop requests to the selected rflectr provider/model using the existing server gateway dispatch logic. Native desktop routing should not fork provider support from `rflectr server`.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-022c-1 | Given server gateway dispatch handles Anthropic messages today, when native routing is implemented, then common dispatch logic is extracted into a reusable function rather than copied. |
| AC-022c-2 | Given two providers expose the same model id, when the user selects one, then dispatch uses provider-qualified route identity and never guesses by model id alone. |
| AC-022c-3 | Given a route is `modelFormat: 'anthropic'`, when the intercepted request is dispatched, then it uses the Anthropic passthrough path with the selected provider's base URL and API key. |
| AC-022c-4 | Given a route is SDK-backed, when the intercepted request is dispatched, then it uses `createLanguageModel()` and the existing `streamAnthropicResponse()` or `generateAnthropicResponse()` path. |
| AC-022c-5 | Given a provider is deleted from the registry, when native routing status refreshes, then stale routes are invalidated and Claude Desktop is not left using a deleted provider. |
| AC-022c-6 | Given provider credentials change, when the user saves them in the dashboard, then subsequent native routed requests resolve credentials from the current provider registry/config on each route refresh without requiring a full `rflectr server` restart. |
| AC-022c-7 | Given routing is active, when model catalogs refresh, then native mode does not reintroduce hidden smoke/test models or deleted OpenCode provider sources. |
| AC-022c-8 | Given dispatch fails, when status is reported, then the route, provider id, and safe error category are visible while raw keys and prompts remain hidden. |

## Verification Evidence

Smoker evidence must include `tests/desktop-routing-dispatch.test.ts` coverage for shared dispatch extraction, provider-qualified route identity, Anthropic passthrough, SDK-backed routing, deleted-provider invalidation, credential refresh without server restart, hidden smoke/test model filtering, deleted OpenCode source exclusion, and redacted failure status.

## Files To Touch

- Update `src/server/router.ts`
- Update `src/server/models.ts`
- Update `src/provider-catalog.ts`
- Add `src/desktop-interception/routing.ts`
- Add `tests/desktop-routing-dispatch.test.ts`
- Extend `tests/server-router.test.ts` if common dispatch extraction changes existing route behavior.

## Implementation Notes

The current dashboard/provider issues came from stale catalog and route state. Native routing must consume the same refreshed provider registry state as the dashboard, not a startup-only snapshot.

### Transplant Notes

There is no old routing module to import wholesale for this PRD. The old sidecar only sketched routing as a future purpose hook. Current rflectr already has the real provider dispatch in `src/server/router.ts`, `src/sdk-adapter.ts`, `src/provider-factory.ts`, and `src/upstream-forward.ts`.

The implementation should therefore:

- extract shared dispatch from current server code,
- make `src/desktop-interception/routing.ts` a thin bridge from intercepted Anthropic requests to that shared dispatch,
- keep provider credentials resolved through current provider catalog/config code,
- avoid new provider allowlists or duplicate model caches.
