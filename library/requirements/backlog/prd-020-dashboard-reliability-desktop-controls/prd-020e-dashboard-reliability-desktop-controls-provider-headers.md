# PRD-020e: Dashboard Reliability and Desktop Controls - Provider Headers

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ProvidersScreen`, `ModelsScreen`) and `data.js` (provider/model source metadata)

---

## Overview

Some direct OpenAI-compatible providers require routing headers in addition to base URL and API key. The catalog already carries model-level header metadata for cases such as Portkey. Runtime direct forwarding and dashboard model tests must pass those headers through consistently while keeping them out of dashboard display payloads.

## Goals

- Preserve `model.headers` or equivalent provider routing metadata through server model loading, route construction, direct forwarding, and model tests.
- Keep headers private: visible status may mention that routing metadata exists, but raw values must not render in the dashboard.
- Add regression tests for direct OpenAI-compatible traffic and dashboard model tests that require custom headers.

## Non-Goals

- Adding a generic arbitrary-header editor to the dashboard.
- Displaying, copying, or logging secret-like header values.
- Replacing provider-specific setup flows for Portkey or other gateway providers.

## User Stories

- As a Portkey user, I want dashboard tests to exercise the same route headers as real traffic.
- As a user routing through an OpenAI-compatible gateway, I want provider config to work from the dashboard without needing manual request header hacks.
- As a privacy-conscious user, I do not want custom headers shown in the browser.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-020e-1 | Given a registry model includes custom routing headers, when the server builds runtime routes, then the route retains those headers. |
| AC-020e-2 | Given a direct OpenAI-compatible route forwards a chat/completions request, when the upstream request is sent, then custom routing headers are included with authorization and content headers. |
| AC-020e-3 | Given a dashboard model test uses a route with custom headers, when the test request is sent upstream, then the same custom headers are included. |
| AC-020e-4 | Given a route has no custom headers, when direct forwarding or model testing occurs, then behavior is unchanged. |
| AC-020e-5 | Given a custom header conflicts with a reserved header such as `authorization`, `content-type`, `content-length`, or `host`, when building the upstream request, then rflectr rejects or ignores the unsafe custom header according to a documented allow/deny policy. |
| AC-020e-6 | Given an upstream call fails, when activity or error logging captures the request, then custom header values are not logged. |
| AC-020e-7 | Given dashboard provider/model DTOs are serialized, when custom headers exist server-side, then raw header names and values are omitted unless a safe boolean such as `hasRoutingHeaders` is required. |
| AC-020e-8 | Given a model test succeeds only when a routing header is present, when regression tests run, then a missing-header implementation fails the test. |
| AC-020e-9 | Given route headers are passed to an SDK-adapter route, when the SDK provider does not accept arbitrary headers, then rflectr documents the behavior and does not silently claim header support for that path. |
| AC-020e-10 | Given headers are merged, when duplicate casing occurs, then header handling is case-insensitive and deterministic. |
| AC-020e-11 | Given provider import or add/edit saves a model with headers, when the dashboard refreshes, then the model remains routable after refresh without requiring server restart unless the runtime architecture truly requires it. |

## Implementation Notes

- Primary areas: `src/catalog.ts`, `src/server/models.ts`, `src/server/router.ts`, `src/upstream-forward.ts`, `src/registry/portkey/*`, and tests around direct forwarding/model tests.
- Reuse existing route/header fields instead of inventing a second parallel metadata path.
- Header redaction must apply to dashboard DTOs, activity events, debug logs, and error responses.

## Test Plan

- Unit-test route construction copies model headers.
- Router-test direct OpenAI-compatible forwarding includes custom headers.
- Router-test dashboard model test includes custom headers.
- Redaction test that dashboard DTOs and errors do not expose header values.

## Open Questions

- [ ] Should safe header names be allowlisted per provider type or globally denylisted for dangerous names?
- [ ] Should the dashboard show a small "routing headers configured" status badge for providers like Portkey?

## Related

- `../../completed/prd-013-portkey-gateway-integration/prd-013-portkey-gateway-integration-index.md`
- `../../completed/prd-012-server-gateway/prd-012-server-gateway-index.md`
- `../prd-016-dashboard-providers/prd-016-dashboard-providers-index.md`
