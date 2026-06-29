# PRD-023d: Desktop Apps Native Controls - Codex Boundary

> **Status:** Backlog
> **Priority:** P1
> **Effort:** S (< 0.5d)
> **Schema changes:** None
> **Source:** `src/codex/app-config.ts`, `src/codex/app-session.ts`, `src/codex-proxy.ts`

---

## Overview

Keep Codex Desktop controls in the Desktop Apps tab while making clear that Codex uses config/profile routing and an OpenAI-compatible proxy, not native TLS interception.

> **Lane context:** Codex Desktop is the `codex-desktop` lane with `config-only` isolation — distinct from Claude Desktop's `claude-native` lane (`app-scoped-proxy`) and `claude-legacy-gateway` lane (`config-only`). See [`prd-023e`](./prd-023e-desktop-apps-native-controls-app-scoped-lanes.md).

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-023d-1 | Given Codex Desktop status renders, when no Codex profile is owned by rflectr, then configure is enabled and revert is disabled. |
| AC-023d-2 | Given Codex Desktop status renders, when rflectr owns a profile/session, then the dashboard shows provider/model, configured endpoint URL, proxy listening state, active runtime handle presence, and revert availability. |
| AC-023d-3 | Given the user clicks Revert Codex, when rflectr owns config state, then existing restore behavior in `src/codex/app-session.ts` is used. |
| AC-023d-4 | Given the user clicks Stop Codex proxy, when the proxy runtime is owned by dashboard, then `src/codex-proxy.ts` runtime is closed without touching Claude native interception. |
| AC-023d-5 | Given native Claude controls are implemented, when Codex status updates, then Codex never reports CA/trust/interception status. |
| AC-023d-6 | Given provider/model catalogs refresh, when Codex Desktop selectors render, then deleted providers and old OpenCode sources do not reappear. |

## Verification Evidence

Smoker evidence must include dashboard/router tests for no-owned-profile state, owned profile/session status fields, Codex revert delegation, Codex proxy stop without Claude native state mutation, absence of CA/trust/interception fields in Codex status, and provider/model refresh filtering for deleted providers and old OpenCode sources.

## Files To Touch

- Update `src/server/dashboard.ts`
- Update `src/server/router.ts`
- Reuse `src/codex/app-config.ts`
- Reuse `src/codex/app-session.ts`
- Reuse `src/codex-proxy.ts`
- Extend `tests/server-dashboard.test.ts`
- Extend `tests/server-router.test.ts`

## Implementation Notes

Codex Desktop should stay boring here. The complexity belongs to Claude native interception.
