# PRD-020c: Dashboard Reliability and Desktop Controls - Provider-Qualified Routing

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ModelsScreen`, `ModelRow`) and `data.js` (`providers`, `models`, `routes`)

---

## Overview

The dashboard and Codex proxy must treat a model as provider-qualified identity, not just a bare model id. Many providers can expose the same upstream model id. Tests, table actions, generated Codex catalog slugs, cache lookup, and runtime route resolution must preserve `providerId + modelId` to avoid sending traffic to the wrong provider.

## Goals

- Add provider-qualified identity to dashboard model rows, tests, favorites where relevant, and route DTOs.
- Make Codex proxy lookup unambiguous for duplicate model ids across providers.
- Remove broad unknown-model fallback that masks stale or bad app config.
- Keep display labels readable while preserving exact routing keys under the hood.

## Non-Goals

- Renaming upstream provider model ids.
- Changing provider registry storage unless existing fields are insufficient.
- Hiding duplicate model ids from users.

## User Stories

- As a user with OpenAI and OpenRouter configured, I want testing `gpt-*` from one provider to use the provider I selected.
- As a user viewing Models, I want duplicate model ids to show their provider/source clearly.
- As a user with stale Codex app config, I want rflectr to fail clearly instead of silently routing to a random default.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-020c-1 | Given the server returns model rows, when two providers expose the same model id, then each row has a stable provider-qualified key distinct from the display model id. |
| AC-020c-2 | Given a dashboard model test is triggered, when the request reaches the server, then it includes provider id and model id, not only a bare model id. |
| AC-020c-3 | Given two providers share `modelId = "claude-sonnet-test"`, when the user tests the second provider's row, then only the second provider's credentials, base URL, npm package, upstream id, and headers are used. |
| AC-020c-4 | Given a model row renders, when provider identity is needed for disambiguation, then the UI shows provider/source context without overcrowding the modeled `ModelRow` layout. |
| AC-020c-5 | Given the dashboard builds active route DTOs, when a route references a model, then it includes provider id, provider name, model id, and display label. |
| AC-020c-6 | Given Codex proxy advertises catalog entries, when duplicate model ids exist, then each advertised id maps to exactly one provider-qualified route. |
| AC-020c-7 | Given Codex proxy receives a known provider-qualified model slug, when it resolves the route, then it selects the route by provider id and model id together. |
| AC-020c-8 | Given Codex proxy receives an unknown model slug, when no explicit default alias applies, then it returns a clear error instead of falling back to the first route. |
| AC-020c-9 | Given a launch model/default alias is configured, when Codex sends that specific alias, then only the configured provider-qualified route is used. |
| AC-020c-10 | Given cache entries are stored for initialized SDK/direct routes, when duplicate model ids exist, then cache keys include provider identity and cannot collide. |
| AC-020c-11 | Given favorite model records are provider-qualified elsewhere in rflectr, when the dashboard lists or tests favorites, then it preserves the same provider-qualified shape. |
| AC-020c-12 | Given an older client sends a bare model id to a test endpoint, when duplicate ids exist, then the server rejects the request with an upgrade/ambiguity error rather than guessing. |
| AC-020c-13 | Given an older client sends a bare model id and it is globally unique, when backwards compatibility is retained, then the response includes a deprecation warning that provider id is required. |

## Implementation Notes

- Primary areas: `src/server/dashboard.ts`, `src/server/router.ts`, `src/codex-proxy.ts`, `src/codex/routing.ts`, `tests/server-dashboard.test.ts`, and `tests/codex-proxy.test.ts`.
- Use a delimiter or structured map key that cannot collide with provider or model ids. Avoid deriving routing correctness from display strings.
- Keep display labels separate from routing keys.

## Test Plan

- Unit-test duplicate model ids across two providers in dashboard DTO generation.
- Router-test dashboard model test with duplicate ids.
- Codex proxy-test provider-qualified slug lookup, cache isolation, unknown slug rejection, and default alias handling.
- Manual UI check that duplicate rows remain scannable and do not overflow the Models table.

## Open Questions

- [ ] Should provider-qualified model keys be exposed as `providerId:modelId`, `providerId__modelId`, or a structured JSON field only?
- [ ] Should duplicate bare model ids be grouped visually in the Models table?

## Related

- `../prd-017-dashboard-models/prd-017-dashboard-models-index.md`
- `../../completed/prd-005-local-proxy-catalog-routing/prd-005-local-proxy-catalog-routing-index.md`
- `../../completed/prd-009-codex-integration/prd-009-codex-integration-index.md`
