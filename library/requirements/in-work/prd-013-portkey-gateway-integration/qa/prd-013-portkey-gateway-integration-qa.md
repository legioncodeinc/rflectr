# QA Report: PRD-013 — Portkey AI Gateway Integration

**Plan document:** `library/requirements/in-work/prd-013-portkey-gateway-integration/prd-013-portkey-gateway-integration-index.md`
**Audit date:** 2026-06-28
**Base branch:** `main`
**Head:** `feat/prd-013-portkey-gateway`
**Auditor:** quality-worker-bee (opus)
**Ordering:** Ran AFTER `security-worker-bee` (correct — see Security Close-Out).

## Summary

**VERDICT: PASS.** All 11 acceptance criteria (AC-1 … AC-11) are genuinely implemented against real code paths — not stubbed — and are covered by passing, assertion-bearing tests. The shared header primitive (the architectural core of the PRD) is threaded end-to-end from `CachedModel` → materialization → `LocalProviderModel` → `ProxyRoute` / `ServerModelInfo` → `createLanguageModel` → `createOpenAICompatible`, and through the Anthropic passthrough relay. The two hard security invariants — the `x-portkey-api-key` secret is **never written to disk** and all `x-portkey-*` api-key values are redacted in traces — are both proven by dedicated regression tests, including one that asserts the on-disk `CachedModel` object is never mutated. Open Question Q4 was resolved exactly as the PRD specified (one Config pseudo-model with `id: portkey/<slug>`). Typecheck is clean; the full suite is 663 passed / 5 failed, where the 5 failures are the documented pre-existing Windows file-mode/XDG/codex-fallback baseline that also fail on clean `main` — **no PRD-013 regressions**. The single finding is a Suggestion-level alignment nit: the short `claude` and `providers` help text do not name Portkey explicitly (it is named in `--ai` and is fully reachable in the add menu).

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅ | All 11 ACs implemented; every PRD-named file touched as specified. |
| Correctness   | ✅ | Header threading, secret injection gating, redaction, Q4 pseudo-model all behave per spec; tests assert real values. |
| Alignment     | ⚠️ | Code matches PRD vocabulary; one minor gap — short `claude`/`providers` help don't name Portkey (AC-11 partial; `--ai` satisfies it). |
| Gaps          | ✅ | Graceful degradation, auth-rejection-keeps-cache parity, and CRLF/control-char sanitization (security Medium) all present. |
| Detrimental   | ✅ | No secret-on-disk path; no header leak; sanitization blocks header injection; no regressions introduced. |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Short `claude`/`providers` help do not name Portkey explicitly** — `src/cli.ts:353-356`, `src/providers-command.ts:119`

  AC-11 states "`rflectr --ai` and `providers`/`claude` help mention Portkey." The `--ai` doc names Portkey explicitly and well (`src/ai-doc.ts:354-358`), and Portkey is a fully reachable, searchable option in `rflectr providers add` (the menu is built dynamically from `listSupportedTemplates()` and Portkey carries `supported: true`). However, the one-screen `claude` help lists registry providers as "Groq, Mistral, Nvidia, DeepSeek, OpenAI, custom endpoints, etc." and `providers` help as "Groq, Mistral, Together AI, …" — Portkey is covered by the trailing "etc./…" but not named. This is cosmetic discoverability, not a functional gap; adding "Portkey" to either list would fully close AC-11's wording. Classified Suggestion (the plan is functionally satisfied via `--ai` and the live add menu).

  ```
  cli.ts:354   Registry        Configure with rflectr providers add or import (Groq, Mistral,
  cli.ts:355                   Nvidia, DeepSeek, OpenAI, custom endpoints, etc.).
  ```

## Plan Item Traceability

| #     | Plan Requirement | Status | Implementation Location | Notes |
|-------|------------------|--------|-------------------------|-------|
| AC-1  | Portkey control-plane client: list configs/VKs/models with `x-portkey-api-key`, 10s timeout, manual redirect, 401/403 handling, graceful degradation | ✅ | `src/registry/portkey/client.ts:101,135,195` (timeout `:9,35`; `redirect:'manual'` `:41`; 401/403 `:52,157`; 404/410→[] `:149`) | Test: `tests/portkey-client.test.ts`. |
| AC-2  | `createLanguageModel({headers})` → `createOpenAICompatible({headers})` (+ openrouter + generic) | ✅ | `src/provider-factory.ts:66` (spec field), `:168` (openai-compatible), `:175` (openrouter), `:182` (generic) | Test: `tests/provider-factory.test.ts`. |
| AC-3  | `ProxyRoute.headers` forwarded into `createLanguageModel`; `startProxy`/`startProxyCatalog` thread it | ✅ | `src/proxy.ts:89` (route field), `:256` (forwarded), `:333,355` (startProxy sdk opts) | Test: `tests/proxy.test.ts`. |
| AC-4  | Registry schema (`headersTemplate`/`CachedModel.headers`/`portkey`) + secret injected at materialization, NEVER on disk; template+model header merge | ✅ | `src/registry/types.ts:34,39,63`; `src/registry/materialize.ts:37-39` (merge), `:81-90` (Portkey-gated secret injection on runtime object only) | Tests: `tests/registry.test.ts`, `tests/materialize.test.ts` (asserts on-disk `CachedModel` not mutated, lines 98-123). |
| AC-5  | Portkey template + add flow (master key → list → select → persist `keyring:provider:portkey`); actionable errors | ✅ | `src/provider-templates.ts:200-208` (`modelSource:'portkey-api'`, `supported:true`); `src/registry/portkey/add.ts:39,168` (`buildPortkeyRegistryEntry`, `runPortkeyAddFlow`); `src/providers-command.ts:397-398` (dispatch) | Test: `tests/portkey-add.test.ts`. Q4 resolved: Config pseudo-model `id: portkey/<slug>` (`add.ts:48-60`). |
| AC-6  | `refreshProviderModels` `portkey-api` branch; auth-rejection keeps cache (parity) | ✅ | `src/registry/refresh-models.ts:477-507` (branch), `:263-370` (`refreshPortkeyProvider`), `:271-274,487-498` (keep-cache on 401/403); `src/registry/model-source.ts:29-30` (dispatch) | Covered by registry-refresh tests; suite green. |
| AC-7  | Claude launch single + favorites carry headers; dry-run shows route+headers (key redacted) | ✅ | `src/cli.ts:1011` (single startProxy `headers`), `:917-924,960-967` (dry-run redacted display); `src/catalog.ts:30` (favorites `buildCatalogRoutes` headers) | Verified via `--dry-run` blocks + `tests/catalog.test.ts`. |
| AC-8  | Codex + Gemini launch carry headers (single + favorites) | ✅ | `src/favorites-resolver.ts:16,83`; `src/codex.ts:564`; `src/codex-proxy.ts:68,160`; `src/codex/favorites-launch.ts:40`; `src/gemini.ts:205,233,268`; `src/gemini-proxy.ts:238` | Tests: `tests/codex-proxy.test.ts`, `tests/favorites-resolver.test.ts`. |
| AC-9  | Server gateway routes Portkey openai models through SDK adapter with headers | ✅ | `src/server/models.ts:49-52` (`ServerModelInfo.headers`); `src/server/router.ts:362` (openai SDK path `headers: model.headers`); `src/provider-catalog.ts:252` (carry headers) | Server tests green. |
| AC-10 | `relayAnthropicMessages` forwards extra headers (CLI proxy + server) | ✅ | `src/upstream-forward.ts:60,68` (`extraHeaders` param + spread); `src/proxy.ts:220` (passthrough relay); `src/server/router.ts:189-191` (anthropic-format Portkey relay) | Test: `tests/upstream-forward.test.ts`. |
| AC-11 | Dry-run shows route+headers (key redacted); `--ai`/help mention Portkey; `redactTraceLine` masks `x-portkey-*` api-key | ✅ / ⚠️ | `src/cli.ts:917-924,960-967` (dry-run redaction); `src/ai-doc.ts:347,354-358` (Portkey section); `src/trace-log.ts:97-101` (JSON + HTTP-header redaction) | Test: `tests/trace-log.test.ts`. ⚠️ `claude`/`providers` short help don't name Portkey explicitly — see Suggestion. |
| NG-1  | No create/edit/delete of Portkey Configs/Providers/VKs (read+select only) | ✅ | `src/registry/portkey/client.ts` is GET-only; add flow `add.ts` only persists local registry | Honored. |
| NG-2  | No local re-implementation of Portkey routing (fallback/retry/cache) | ✅ | Routing referenced by slug header only; no local routing logic | Honored. |
| NG-3  | No prompt templates / guardrails / budgets administration | ✅ | Not present in diff | Honored. |
| NG-4  | Self-hosted Portkey not a first-class template in v1 (custom base-URL override) | ✅ | Template hardcodes `api.portkey.ai`; no dedicated self-host field | Honored (Q3 default). |
| Q4    | Config granularity: one synthetic "Config" pseudo-model per Config | ✅ | `src/registry/portkey/add.ts:48-60` (`id: portkey/<config-slug>`, `portkey.configSlug`) | Built exactly as the PRD's stated default. |
| SEC   | Security close-out: no Critical/High; 1 Medium (CRLF/control-char header sanitization) fixed + tested | ✅ | `src/registry/portkey/add.ts:142-152` (`sanitizeRoutingHeaderValue`); `src/server/router.ts:403` (`sanitizeIncomingHeaderValue`) | Tests: `tests/portkey-add.test.ts:79-115` assert CR/LF/TAB/control stripping. |

## Test-Run Results

- **`npm run typecheck`** — clean (exit 0).
- **`npx vitest run`** — **663 passed / 5 failed** (77 files: 74 passed / 3 with failures).
- **The 5 failures are the documented pre-existing baseline, NOT PRD-013 regressions** (each is a Windows file-mode / Unix-path environment assumption; all fail on clean `main` per the ledger):
  1. `tests/codex-proxy.test.ts > startCodexProxy > falls back to first route for unknown model`
  2. `tests/opencode-auth.test.ts > resolveOpencodeAuthPath > uses XDG_DATA_HOME on unix`
  3. `tests/opencode-auth.test.ts > readOpencodeAuthFile > parses oauth entries`
  4. `tests/opencode-auth.test.ts > readOpencodeAuthFile > warns when auth file is world-readable`
  5. `tests/registry.test.ts > registry io > writes providers.json with restrictive permissions` (expects `0o600`, gets `0o666` on Windows)
- No OTHER failures observed. All Portkey/header/redaction/materialize tests pass.

## Security Close-Out (cross-check)

`security-worker-bee` ran in Wave 4 (before this QA, correct order). Reported: no Critical/High; one Medium — CRLF/control-char header-value sanitization — fixed and tested. Independently confirmed:
- `sanitizeRoutingHeaderValue` (`add.ts:142-152`) strips C0 controls (incl. CR/LF/TAB/NUL) + DEL and trims, applied to all three routing-header values at construction (`add.ts:58,72,81`) and on refresh (`refresh-models.ts:292,335,365`).
- Server inbound headers sanitized via `sanitizeIncomingHeaderValue` (`router.ts:392-396`).
- Secret-never-on-disk invariant holds: injection is gated to Portkey and mutates only the runtime `LocalProviderModel`, never the persisted `CachedModel` (proven by `materialize.test.ts:98-123`).
- Redaction holds: `x-portkey-api-key` masked in JSON and HTTP-header forms (`trace-log.ts:97-101`).

## Files Changed (PRD-013 surface, verified present)

- `src/ai-doc.ts` (M) — `--ai` doc gains a Portkey section (`:354-358`).
- `src/catalog.ts` (M) — `buildCatalogRoutes` threads `model.headers` into routes (`:30`).
- `src/cli.ts` (M) — single + favorites launch thread `selectedModel.headers`; dry-run prints route + redacted headers.
- `src/codex.ts` (M) — codex launch threads `selectedModel.headers` (`:564`).
- `src/codex-proxy.ts` (M) — `CodexProxyRoute.headers` + forwarded to upstream (`:68,160`).
- `src/codex/favorites-launch.ts` (M) — favorites route carries `headers` (`:40`).
- `src/favorites-resolver.ts` (M) — resolved favorite carries `headers` (`:16,83`).
- `src/gemini.ts` / `src/gemini-proxy.ts` (M) — gemini launch + proxy thread `headers`.
- `src/provider-factory.ts` (M) — `ProviderModelSpec.headers`; passed to openai-compatible / openrouter / generic factory.
- `src/provider-templates.ts` (M) — `portkey` template + `modelSource:'portkey-api'` union member.
- `src/provider-catalog.ts` (M) — server model catalog carries `headers` (`:252`).
- `src/providers-command.ts` (M) — add-flow dispatch to `runPortkeyAddFlow` for `portkey-api` (`:397-398`).
- `src/proxy.ts` (M) — `ProxyRoute.headers`; forwarded to `createLanguageModel` and `relayAnthropicMessages`.
- `src/registry/materialize.ts` (M) — header merge + Portkey-gated secret injection (`:37-39,81-90`).
- `src/registry/model-source.ts` (M) — resolves `portkey-api` via template.
- `src/registry/portkey/add.ts` (A) — add flow + `buildPortkeyRegistryEntry` + `sanitizeRoutingHeaderValue`.
- `src/registry/portkey/client.ts` (A) — GET-only control-plane client (configs/VKs/models).
- `src/registry/portkey/types.ts` (A) — Portkey domain types + routing-target union.
- `src/registry/refresh-models.ts` (M) — `portkey-api` refresh branch + `refreshPortkeyProvider`.
- `src/registry/types.ts` (M) — `headersTemplate`, `CachedModel.headers`, `CachedModel.portkey`.
- `src/server/models.ts` (M) — `ServerModelInfo.headers` (`:49-52`).
- `src/server/router.ts` (M) — openai SDK path + anthropic relay attach `model.headers`; inbound sanitization.
- `src/trace-log.ts` (M) — `x-portkey-*` api-key redaction patterns (`:97-101`).
- `src/types.ts` (M) — `LocalProviderModel.headers`.
- `src/upstream-forward.ts` (M) — `relayAnthropicMessages` gains `extraHeaders` (`:60,68`).
- `tests/*` (A/M) — `portkey-client`, `provider-factory`, `proxy`, `registry`, `materialize`, `portkey-add`, `catalog`, `codex-proxy`, `favorites-resolver`, `upstream-forward`, `trace-log`.

---

# Re-verification (post-CodeRabbit remediation) — 2026-06-28

**Trigger:** After the original PASS, CodeRabbit surfaced 9 Major issues; a remediation Bee landed fixes F1–F7 and `security-worker-bee` re-audited clean (the `GET /models` secret-leak is now closed). This pass confirms the remediation did **not** regress any acceptance criterion and the PRD remains fully satisfied. Scope: re-check AC-1, AC-5, AC-6, AC-9 (touched by the fixes), confirm AC-2/3/4/7/8/10/11 intact, re-run the gate, and confirm the F6 id-shape change is internally consistent.

**Auditor:** quality-worker-bee (opus). **Ordering:** ran AFTER `security-worker-bee`'s re-audit (correct).

## Remediation fixes verified (real, not stubbed)

| Fix | What changed | Verified at | Status |
|-----|--------------|-------------|--------|
| **F1** | `GET /models` strips `apiKey` **and** `headers` from the response | `src/server/router.ts:124-129` — destructures `{ apiKey: _apiKey, headers: _headers, ...rest }`; comment documents intent | ✅ Leak closed — routing headers (incl. injected `x-portkey-api-key`) no longer emitted |
| **F2** | `createLanguageModel` cache key includes a **stable** serialization of `model.headers` | `src/server/router.ts:347-360` — sorted-entry `JSON.stringify` folded into `cacheKey` via `\x1f` join | ✅ Two Portkey routes differing only by routing header no longer collide on the cache |
| **F3** | `listModels` sanitizes routing slugs before setting `x-portkey-*` headers | `src/registry/portkey/client.ts:14-22` (`sanitizeHeaderValue`), applied at `:219,221,223` | ✅ C0/DEL stripped on the control-plane request path too |
| **F5** | Abort instead of persisting a VK provider with **zero** models | `src/registry/portkey/add.ts:369-380` — `totalModels === 0` → returns `null` → flow cancels before `saveRegistry` | ✅ Tested: `tests/portkey-add.test.ts:374-394` |
| **F6** | VK model local `id` is route-unique `<vkSlug>/<modelId>`; `upstreamModelId` stays bare | `add.ts:64-78`; refresh `refresh-models.ts:322-348`; `:368` keeps by `upstreamModelId ?? id` | ✅ Tested: `tests/portkey-add.test.ts:400-459` |
| **F4** | Non-401/403 refresh fetch failures return **failure**, not stale-cache success | `src/registry/refresh-models.ts:355-363` — 401/403 → keep cache; else `{ models: [], error }` → caller returns `ok:false` (`:499-505`) | ✅ Real failure surfaced; auth-rejection parity preserved |
| **F7** | Individual-mode refresh keeps only previously-cached models that still exist; **no silent auto-add** | `refresh-models.ts:364-369` — `kept = cached.filter(freshIds.has(...))`; new discoveries dropped | ✅ User's explicit selection is never silently expanded |

## Re-checked AC traceability (AC-1 / AC-5 / AC-6 / AC-9)

| #    | AC (re-checked) | Status | Evidence | Notes |
|------|-----------------|--------|----------|-------|
| AC-1 | Control-plane client: list configs/VKs/models, 10s timeout, manual redirect, 401/403 rejection, graceful degradation | ✅ STILL HOLDS | `client.ts:24,49-58,67-72,60-65,149-166`; F3 slug sanitization `:14-22,219-223` | Behavior unchanged; F3 adds defense-in-depth on the GET routing headers. No regression. |
| AC-5 | Add flow: master key → list → select → persist `keyring:provider:portkey`; actionable errors | ✅ STILL HOLDS | `add.ts:172-304`; F5 zero-model abort `:369-380`; F6 VK id-uniqueness `:64-78`; secret never set here `:36-38,56` | Selection→registry shape still correct; F5/F6 strengthen it. Tests assert both. |
| AC-6 | Refresh: `portkey-api` branch; auth-rejection keeps cache (parity) | ✅ STILL HOLDS | `refresh-models.ts:477-507`, `refreshPortkeyProvider :263-370`; F4 `:355-363`; F7 `:364-369`; keep-cache `:271-274,358-359,487-498` | Parity preserved; F4 fixes the previously-masked non-auth failure; F7 fixes silent auto-add. |
| AC-9 | Server gateway routes Portkey openai models through SDK adapter with headers; `/models` does not leak | ✅ STILL HOLDS + HARDENED | `router.ts:200-245` (SDK path, `headers: model.headers` via `:371`); F1 `:124-129`; F2 `:347-360`; anthropic relay `:191-193` | openai SDK routing unchanged; F1 closes the secret leak; F2 fixes header-keyed cache collision. |

## AC-2/3/4/7/8/10/11 — confirmed intact (untouched by remediation)

The header primitive itself (AC-2 `provider-factory.ts`, AC-3 `proxy.ts`, AC-4 `materialize.ts`/`types.ts`) and the launch surfaces (AC-7 `cli.ts`/`catalog.ts`, AC-8 `codex`/`gemini`/`favorites-resolver.ts`, AC-10 `upstream-forward.ts`, AC-11 `trace-log.ts`/`ai-doc.ts`) were not modified by F1–F7. Spot-checked: `materialize.ts:81-90` still gates the `x-portkey-api-key` injection to Portkey and mutates only the runtime object; `upstream-forward.ts:60,68` still spreads `extraHeaders`; `relayAnthropicMessages` is still wired to the server anthropic Portkey route (`router.ts:191-193`). All intact. (AC-11's pre-existing Suggestion — short `claude`/`providers` help not naming Portkey — is unchanged and remains Suggestion-level.)

## F6 design-consequence — confirmed internally consistent (acceptable)

The new VK model id shape `<vkSlug>/<modelId>` was traced through every id-keyed path; all use the same id, so launch wiring (AC-7/AC-8) is not broken:

- **Build** (`add.ts:69-78`): `CachedModel.id = <safeVkSlug>/<m.id>`, `upstreamModelId = m.id` (bare).
- **Materialize** (`materialize.ts:31,47`): Portkey ids (`@ai-sdk/openai-compatible`) pass through unchanged into `LocalProviderModel.id`; `upstreamModelId` stays bare; `headers` merge correct.
- **Favorites** (`favorites-resolver.ts:73,83,101,107`): lookup + dedup key both use the route-unique catalog id; resolved favorite carries `model.headers`. Consistent.
- **Catalog/launch** (`catalog.ts:15,30`): `aliasId = aliasModelId(model.id, lp.id)` → `anthropic-portkey__<vkSlug>/<modelId>` (unique in Claude Code's `/model` picker); `realModelId = upstreamModelId` (bare id on the wire); `headers` threaded into the route. **Wire call uses the bare upstream id; picker sees the unique alias.**
- **Refresh round-trip** (`refresh-models.ts:326-348`): re-derives the same `<safeVkSlug>/<m.id>` prefixed id, matches existing by prefixed id with a legacy bare-id fallback, normalizes on every refresh. Round-trips cleanly.

Minor note (not a finding): `aliasModelId` does not sanitize the `realId` portion, so the `/` in the VK-prefixed id survives into the alias. This matches existing Zen/Go behavior (their ids also contain `/`) and is pre-existing accepted behavior — not introduced by this remediation. No action required.

## Security re-audit reference

`security-worker-bee` re-audited after F1–F7 and reported clean: the `GET /models` secret-leak (F1) is **closed** — `apiKey` and `headers` (which carry the materialization-injected `x-portkey-api-key`) are both stripped from the response (`router.ts:124-129`). The original Medium (CRLF/control-char sanitization) remains fixed and is now reinforced on the control-plane GET path (F3, `client.ts:14-22`). No new Critical/High/Medium introduced.

## Test-run results (this pass)

- **`npm run typecheck`** — clean (exit 0).
- **`npx vitest run`** — **675 passed / 5 failed** (77 files: 74 passed / 3 with failures). Pass count rose from 663 → 675 (new F5/F6 regression tests added; no tests lost).
- **The 5 failures are exactly the documented pre-existing Windows-env baseline — NOT regressions, and none touch Portkey/header/refresh code:**
  1. `tests/codex-proxy.test.ts > startCodexProxy > falls back to first route for unknown model`
  2. `tests/opencode-auth.test.ts > resolveOpencodeAuthPath > uses XDG_DATA_HOME on unix`
  3. `tests/opencode-auth.test.ts > readOpencodeAuthFile > parses oauth entries`
  4. `tests/opencode-auth.test.ts > readOpencodeAuthFile > warns when auth file is world-readable`
  5. `tests/registry.test.ts > registry io > writes providers.json with restrictive permissions` (expects `0o600`/384, gets `0o666`/438 on Windows)
- No OTHER failures. All Portkey add/refresh/client, header-threading, materialize, and trace-redaction tests pass — including the new F5 zero-model-abort and F6 VK-id-uniqueness/sanitization assertions in `tests/portkey-add.test.ts`.

## UPDATED VERDICT

**PASS.** The CodeRabbit remediation (F1–F7) is real, not stubbed, and introduces **no regression** against any of the 11 acceptance criteria. AC-1/5/6/9 still hold and are hardened (F1 closes the `/models` secret leak, F2 fixes the header-keyed cache collision, F4 fixes the masked non-auth refresh failure, F5 prevents zero-model persistence, F7 stops silent selection expansion). AC-2/3/4/7/8/10/11 are untouched and intact. The F6 route-unique VK id is internally consistent across build → materialize → favorites → catalog/alias → refresh, so launch wiring is not broken. Typecheck clean; suite 675/5 with the 5 failures being the documented pre-existing Windows baseline only. The single open item remains the original Suggestion-level AC-11 wording nit (short `claude`/`providers` help do not name Portkey explicitly), which the remediation neither introduced nor was scoped to fix. **Ship-ready.**
