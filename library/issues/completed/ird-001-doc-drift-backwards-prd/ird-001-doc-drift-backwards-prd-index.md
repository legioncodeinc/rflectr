# IRD-001: Code-vs-doc drift surfaced by the backwards-PRD pass

> **GitHub Issue:** [#1](https://github.com/legioncodeinc/rflectr/issues/1)
> **Status:** Resolved
> **Priority:** P3
> **Effort:** XS

## Problem

While reverse-engineering the codebase into backwards-PRDs ([`prd-001`](../../../requirements/completed/prd-001-cli-core-launch-orchestration/prd-001-cli-core-launch-orchestration-index.md) … [`prd-012`](../../../requirements/completed/prd-012-server-gateway/prd-012-server-gateway-index.md)), four passages across `CLAUDE.md`, `AGENTS.md`, and the private knowledge base were found to describe symbols, separators, or values that do not match the shipped v0.2.7 source. Each is a documentation-only inaccuracy — the code is correct; the docs lagged behind a refactor. Left unfixed, they mislead any engineer (or agent) who trusts the docs over the source.

## Root Cause

Documentation written against an earlier iteration of the code was not updated when the underlying implementation changed:

- `STALE_FREE_MODELS` was migrated from a `src/constants.ts` constant into the `model-incompatible.json` blacklist (`category: "stale_promotion"`).
- The `thought_signature` tool-use-id separator was changed from a raw `::ts::` to `__ts__` with a base64url-encoded payload (`::ts::` kept only as a legacy decode fallback).
- The `subscriptionTier` preference field was replaced by a registry-level `subscriptionFilter: RegistrySubscriptionFilter`.
- The OpenAI OAuth client id carried a transcription typo (`app_EMoaamEEZ…` vs. the code's `app_EMoamEEZ…`).

## Fix Plan

Documentation-only edits, verified against source before applying:

1. **`STALE_FREE_MODELS`** → describe `src/data/model-incompatible.json` (`category: "stale_promotion"`, `qwen3.6-plus-free`) + `shouldHideModel`. Files: `CLAUDE.md`, `AGENTS.md`, `library/knowledge/private/ai/model-discovery-classification.md`.
2. **`::ts::` → `__ts__`** (base64url payload; legacy `::ts::` fallback) per `src/proxy-shared.ts:38,72,82,93`. Files: `CLAUDE.md`, `AGENTS.md`, `library/knowledge/private/ai/translation-layer.md`, `library/knowledge/private/integrations/local-proxy.md`. Also normalized the two PRDs that referenced it loosely (`prd-010`, `prd-012`).
3. **`subscriptionTier` → `subscriptionFilter`** (`RegistrySubscriptionFilter`, on the Zen registry stub) per `src/registry/builtins.ts:7`, `src/registry/crud.ts:55`. Files: `CLAUDE.md`, `AGENTS.md`.
4. **OpenAI client id typo** → `app_EMoamEEZ73f0CkXaXp7hrann` per `src/oauth/openai.ts:9`. File: `library/knowledge/private/auth/oauth-device-flows.md`.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-1 | No occurrence of `STALE_FREE_MODELS` remains in `CLAUDE.md`, `AGENTS.md`, or the knowledge base; the stale-promotion behavior is described against `model-incompatible.json`. |
| AC-2 | No `::ts::` separator is described as the live form; docs state `__ts__` with base64url payload and note the legacy fallback. |
| AC-3 | No `subscriptionTier` preference field is referenced; docs describe `subscriptionFilter` / `RegistrySubscriptionFilter`. |
| AC-4 | The OpenAI OAuth client id in the auth knowledge doc matches `src/oauth/openai.ts:9` exactly. |
| AC-5 | Each corrected claim is verified present in the cited source file/line at the time of the fix. |

## Verification

```
grep -rn "STALE_FREE_MODELS|::ts::|subscriptionTier|app_EMoaamEEZ" CLAUDE.md AGENTS.md library/knowledge
```
returns no live/normative matches after the fix (only intentional "no longer exists / legacy fallback" mentions). All four source facts were confirmed against `src/` before editing.

## Out of Scope

- No source-code changes — the code is correct as shipped; this IRD only realigns documentation.

## Related

- Backwards-PRDs that surfaced the drift: [`prd-003`](../../../requirements/completed/prd-003-model-discovery-classification/prd-003-model-discovery-classification-index.md), [`prd-004`](../../../requirements/completed/prd-004-translation-layer/prd-004-translation-layer-index.md), [`prd-007`](../../../requirements/completed/prd-007-oauth-device-flows/prd-007-oauth-device-flows-index.md), [`prd-008`](../../../requirements/completed/prd-008-preferences-tiers-favorites/prd-008-preferences-tiers-favorites-index.md).
- Knowledge docs corrected: [`model-discovery-classification.md`](../../../knowledge/private/ai/model-discovery-classification.md), [`translation-layer.md`](../../../knowledge/private/ai/translation-layer.md), [`local-proxy.md`](../../../knowledge/private/integrations/local-proxy.md), [`oauth-device-flows.md`](../../../knowledge/private/auth/oauth-device-flows.md).
