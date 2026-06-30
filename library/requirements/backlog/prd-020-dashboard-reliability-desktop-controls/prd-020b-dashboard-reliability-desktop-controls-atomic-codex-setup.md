# PRD-020b: Dashboard Reliability and Desktop Controls - Atomic Codex Setup

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ProvidersScreen`, `ModelsScreen`) and `screens2.jsx` (`SettingsScreen` gateway actions)

---

## Overview

Codex Desktop setup from the dashboard must be atomic. Retrying setup must not kill a currently working Codex proxy before the replacement proxy, catalog, config patch, and status response are known-good. A failed setup should leave the previous working path untouched.

## Goals

- Build replacement Codex proxy resources before closing the existing active proxy.
- Keep a prior working Codex Desktop configuration active if replacement setup fails.
- Validate requested provider/model selections before changing runtime or config state.
- Return setup responses that identify the selected provider/model and any skipped routes.

## Non-Goals

- Changing the Codex Desktop UI.
- Starting multiple dashboard-managed Codex proxies for the same app profile.
- Supporting arbitrary user-edited TOML merge conflicts beyond restore safeguards.

## User Stories

- As a user who retries Codex setup, I want the existing working Codex Desktop route to remain alive until the new route is ready.
- As a user choosing a model, I want one bad model route not to silently break a whole setup when a valid selected model exists.
- As a user reading the dashboard, I want the setup result to say exactly what provider/model Codex is now configured to use.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-020b-1 | Given an existing dashboard-managed Codex proxy is active, when a new setup request begins, then the old proxy remains open until the replacement proxy has bound a port successfully. |
| AC-020b-2 | Given replacement proxy creation fails, when the endpoint returns an error, then the old proxy, old config overlay, old catalog file, and dashboard status remain unchanged. |
| AC-020b-3 | Given catalog generation fails, when setup aborts, then no new config overlay is written and no old proxy is closed. |
| AC-020b-4 | Given config patching fails, when setup aborts, then the newly-created replacement proxy is closed and the previous active proxy remains active. |
| AC-020b-5 | Given setup succeeds, when the new config overlay is verified, then rflectr swaps runtime pointers and closes the previous proxy only after the swap is complete. |
| AC-020b-6 | Given the requested provider id does not exist, when setup is submitted, then the response is `400` with a parsed message and no runtime changes. |
| AC-020b-7 | Given the requested model id does not exist for the requested provider, when setup is submitted, then the response is `400` with provider-qualified detail and no runtime changes. |
| AC-020b-8 | Given multiple models are available, when no explicit model is provided, then the dashboard either requires selection or uses a documented default and returns that default in the response. |
| AC-020b-9 | Given some non-selected provider models cannot initialize, when the selected route is valid, then the selected setup can still succeed unless the invalid route is required for the generated catalog. |
| AC-020b-10 | Given skipped routes occur, when setup succeeds, then the response includes a privacy-safe `warnings` array naming skipped provider/model ids and reasons. |
| AC-020b-11 | Given setup succeeds, when the dashboard refreshes, then Desktop Apps and Overview active routes both show the same active Codex provider/model. |
| AC-020b-12 | Given setup is in progress, when the user submits another setup request, then the second request is rejected or queued with explicit status rather than racing the first. |
| AC-020b-13 | Given setup fails, when the dashboard renders the failure, then it preserves form selections and does not force the user to re-enter any API key value already accepted by the server. |

## Implementation Notes

- Primary areas: `src/server/router.ts`, `src/codex-proxy.ts`, `src/codex/app-config.ts`, `src/codex/app-session.ts`, and `tests/server-router.test.ts`.
- Prefer a staged object such as `{ proxy, catalogPath, configState }` that is committed only after every stage succeeds.
- Do not close `runtime.codexProxy` before the replacement resource is committed.

## Test Plan

- Router tests for proxy creation failure, catalog failure, config patch failure, and successful replacement.
- Unit tests around staged replacement cleanup.
- Manual dashboard test: configure Codex, intentionally submit invalid provider/model, verify old route still works.

## Open Questions

- [ ] Should the first Desktop Apps release expose a required model picker, or is a documented default acceptable for one release?
- [ ] Should skipped non-selected routes be hidden from Codex catalog or shown disabled with warnings?

## Related

- `./prd-020a-dashboard-reliability-desktop-controls-codex-lifecycle.md`
- `./prd-020c-dashboard-reliability-desktop-controls-provider-qualified-routing.md`
