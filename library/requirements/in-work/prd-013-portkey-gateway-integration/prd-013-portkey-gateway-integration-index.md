# PRD-013: Portkey AI Gateway Integration

> **Status:** In Work
> **Priority:** P2
> **Effort:** L (1-3d)
> **Schema changes:** Additive (registry: per-route custom headers + Portkey routing metadata)
> **Written:** June 2026
> **Forward-looking:** Yes — specifies unbuilt work (rflectr v0.2.7 baseline).
> **Target source:** `src/registry/portkey/*` (new), `src/provider-templates.ts`, `src/providers-command.ts`, `src/provider-factory.ts`, `src/proxy.ts`, `src/registry/types.ts`, `src/server/*`

---

## Overview

Portkey is an AI gateway that fronts many upstream LLM providers behind one OpenAI- and Anthropic-compatible endpoint, adding routing, fallback, retry, caching, load-balancing, and governance via saved **Configs** and **Providers/Integrations** (formerly **Virtual Keys**). Today a rflectr user who runs their models through Portkey has no first-class path: Portkey requires per-request routing headers (`x-portkey-api-key`, plus one of `x-portkey-config` / `x-portkey-virtual-key` / `x-portkey-provider`) that rflectr's launch paths cannot currently emit, because both the SDK adapter (`createLanguageModel`) and the Anthropic passthrough only forward a single bearer/`x-api-key` credential and never attach arbitrary provider headers.

This module adds Portkey as a **special provider** in the native registry (PRD-002). The user pastes a single **master Portkey API key**; rflectr calls Portkey's control-plane API to list the user's **Configs**, **Providers/Integrations (Virtual Keys)**, and **Models**, lets them select what to route through, and persists a registry entry whose models carry the routing headers needed at launch. The shared enabler — **per-route custom headers threaded through the SDK adapter, the local proxy, and the server gateway** — is the architectural core of this PRD and is reusable by any future header-routed provider.

The result: `rflectr claude` (single-model, favorites catalog, and `server`), `rflectr codex`, and `rflectr gemini` can all target a Portkey Config or model and have every upstream request carry the correct Portkey routing headers, so Portkey's observability and governance see the traffic.

See the (to-be-written) knowledge doc: [`../../../knowledge/private/integrations/portkey-gateway.md`](../../../knowledge/private/integrations/portkey-gateway.md).

## Goals

1. Let a user add Portkey with **one master API key** and no manual base-URL/header entry.
2. **List and select** the user's Portkey Configs, Providers/Integrations (Virtual Keys), and Models from the control-plane API.
3. Persist a registry entry whose materialized models carry the Portkey **routing headers** (config / virtual-key / provider slug) and route through Portkey's gateway.
4. Add the **single missing primitive** — per-route custom headers — to `createLanguageModel`, `ProxyRoute`, and the server router, reusable beyond Portkey.
5. Make Portkey work across every launch surface that consumes the registry: `claude` (single + favorites), `codex`, `gemini`, and `server`.
6. Keep the master Portkey key in the OS keyring (`authRef` pointer only — **no secrets in `providers.json`**), consistent with PRD-002 / PRD-006.

## Non-Goals

- **Creating, editing, or deleting** Portkey Configs, Providers, or Virtual Keys from rflectr (read + select only; management stays in the Portkey dashboard).
- Re-implementing Portkey routing logic (fallback/retry/cache/load-balance) locally — that is Portkey's job; rflectr only references a Config by slug/id.
- Portkey **prompt templates**, **guardrails**, **budgets/rate-limit** administration, or analytics surfacing inside rflectr.
- Supporting Portkey **self-hosted / enterprise** base URLs as a first-class template path in v1 (handled via the existing custom base-URL override; see Open Questions).
- Changing the credential-storage or OAuth subsystems (PRD-006 / PRD-007) beyond adding a Portkey `authRef`.
- Model classification heuristics themselves (owned by PRD-003) — Portkey models are classified by the chosen inference format.

## Features

| # | Feature | Target source | Acceptance |
|---|---------|--------------|------------|
| 1 | Portkey control-plane client (list configs / virtual-keys / models) | `src/registry/portkey/client.ts` (new) | [AC-1](#acceptance-criteria) |
| 2 | Per-route custom headers in the SDK adapter | `src/provider-factory.ts`, `src/sdk-adapter.ts` | [AC-2](#acceptance-criteria) |
| 3 | Per-route custom headers in the local proxy | `src/proxy.ts` | [AC-3](#acceptance-criteria) |
| 4 | Registry schema: routing metadata + headers | `src/registry/types.ts`, `src/registry/materialize.ts` | [AC-4](#acceptance-criteria) |
| 5 | Portkey provider template + add flow (master key → select) | `src/provider-templates.ts`, `src/registry/portkey/add.ts` (new), `src/providers-command.ts` | [AC-5](#acceptance-criteria) |
| 6 | Model-list refresh for Portkey | `src/registry/refresh-models.ts`, `src/registry/portkey/client.ts` | [AC-6](#acceptance-criteria) |
| 7 | Launch integration: claude (single + favorites) | `src/cli.ts`, `src/catalog.ts` | [AC-7](#acceptance-criteria) |
| 8 | Launch integration: codex + gemini | `src/codex.ts`, `src/gemini.ts`, `src/favorites-resolver.ts` | [AC-8](#acceptance-criteria) |
| 9 | Server gateway routing for Portkey | `src/server/index.ts`, `src/server/router.ts`, `src/server/models.ts` | [AC-9](#acceptance-criteria) |
| 10 | Custom-header support in upstream Anthropic passthrough | `src/upstream-forward.ts`, `src/proxy.ts` | [AC-10](#acceptance-criteria) |
| 11 | Dry-run + `--ai` doc + help text | `src/cli.ts`, `src/ai-doc.ts` | [AC-11](#acceptance-criteria) |

---

## Architecture & Implementation

### Where Portkey fits the existing data flow

Portkey reuses the PRD-002 registry pipeline almost end to end. The novel pieces are (a) a control-plane client used **at add/refresh time** to enumerate routing targets, and (b) **custom headers** carried from `CachedModel` → `LocalProviderModel` → `ProxyRoute` → the SDK provider factory at **launch time**.

```
rflectr providers add → Portkey
  → prompt master API key                       [providers-command.ts]
  → PortkeyClient.listConfigs()                  [registry/portkey/client.ts — GET /v1/configs]
  → PortkeyClient.listVirtualKeys()              [GET /v1/virtual-keys (deprecated) / Integrations]
  → PortkeyClient.listModels()                   [GET /v1/models]
  → user selects Config(s) / VK(s) / model(s)    [clack multiselect]
  → saveProviderCredential(keyring:provider:portkey, masterKey)
  → write RegistryProvider{ id:'portkey', api.url, headersTemplate }
      + modelsCache[] each carrying routing headers
                                                  ↓ (every launch, unchanged path)
  loadRegistry → materializeRegistry → LocalProvider[] (models carry `headers`)
  → ProxyRoute{ headers } → createLanguageModel({ headers }) → createOpenAICompatible({ headers })
```

### Portkey routing model (background)

A single Portkey request needs the gateway key plus **one** routing directive:

| Header | Meaning | rflectr source |
|---|---|---|
| `x-portkey-api-key` | The master/workspace API key | keyring `keyring:provider:portkey` |
| `x-portkey-config` | A saved Config (slug or id) — routing/fallback/cache rules | user-selected Config |
| `x-portkey-virtual-key` | A saved provider credential (Virtual Key slug) | user-selected VK |
| `x-portkey-provider` | A Provider/Integration slug (Model Catalog) | derived from `@slug/model` ids |

Portkey exposes three inference shapes — OpenAI `POST /v1/chat/completions`, OpenAI `POST /v1/responses`, and **Anthropic `POST /v1/messages`**. rflectr can therefore route Portkey two ways (see decision below).

### Decision: header threading is the core primitive

Both candidate routes need the same missing capability — **per-request custom headers** — so this PRD builds that first and uses it for whichever inference format is chosen.

- **Option A (recommended) — OpenAI-format via the SDK adapter.** Portkey models are `modelFormat: 'openai'`, `npm: '@ai-sdk/openai-compatible'`, `apiBaseUrl: 'https://api.portkey.ai/v1'`. `createOpenAICompatible({ name, apiKey, baseURL, headers })` accepts a `headers` map; we pass `x-portkey-api-key` + the routing header. This reuses the entire SDK-adapter path (`translateRequest` / `streamAnthropicResponse`) with zero new wire code. The Bearer `apiKey` is set to the Portkey key as well (Portkey accepts it), and the `x-portkey-*` headers do the routing.
- **Option B — Anthropic-format passthrough.** Portkey speaks Anthropic at `/v1/messages`, so a `modelFormat: 'anthropic'` route could pass through with no translation. But the single-model anthropic path sets `ANTHROPIC_BASE_URL` and lets Claude Code talk to the upstream **directly**, with no place to inject `x-portkey-config`. Making Option B work would force all Portkey anthropic traffic through the proxy (so headers can be added in `relayAnthropicMessages`) — a larger change to the passthrough path. Captured as AC-10 for completeness and for the `server` Anthropic endpoint, but **Option A is the default route** for the CLI launch paths.

> **Recommendation:** ship **Option A** for all CLI launch paths (claude/codex/gemini/favorites). Implement AC-10 (passthrough headers) so the `server` gateway and any future anthropic-format Portkey route are unblocked, but do not make it the default.

### Control-plane client (`src/registry/portkey/client.ts`, new)

A small typed `fetch` client (mirrors `fetch-template-models.ts` conventions: 10s `AbortController` timeout, `redirect: 'manual'`, trace logging via `RFLECTR_TRACE`):

- `listConfigs(masterKey)` → `GET https://api.portkey.ai/v1/configs` with `x-portkey-api-key`. Response: `{ success, data: [{ id, name, slug, is_default, status, workspace_id, ... }] }`. Returns `PortkeyConfig[]`.
- `listVirtualKeys(masterKey)` → `GET /v1/virtual-keys` → `{ data: [{ name, slug, ... }] }` (deprecated upstream; fall back to / prefer Integrations + Providers list where available). Returns `PortkeyVirtualKey[]`.
- `listModels(masterKey, { config?|virtualKey?|provider? })` → `GET /v1/models` with `x-portkey-api-key` and the chosen routing header so the returned catalog reflects what that target can reach (Model Catalog ids are `@provider-slug/model-name`). Returns `CachedModel[]` (format = openai).
- All methods map 401/403 → "master key was rejected" with the dashboard URL hint, and degrade gracefully when an endpoint is unavailable on the user's plan/scope (e.g. configs require admin scope).

### Per-route custom headers (the shared primitive)

- **`ProviderModelSpec`** (`provider-factory.ts:51`) gains `headers?: Record<string, string>`. In the `@ai-sdk/openai-compatible` branch (`:160`) pass `headers` into `createOpenAICompatible({ ..., headers })`. Add a matching `headers` pass-through for `@openrouter/ai-sdk-provider` and the generic factory branch where the SDK supports it.
- **`ProxyRoute`** (`proxy.ts:72`) gains `headers?: Record<string, string>`; the SDK branch (`proxy.ts:246`) forwards `route.headers` into `createLanguageModel`.
- **`startProxy` sdk options** (`proxy.ts:315`) and **`buildCatalogRoutes`** (`catalog.ts`) thread `headers` from the `LocalProviderModel`.
- **`LocalProviderModel`** (`types.ts:33`) gains `headers?: Record<string, string>`.
- Headers are treated as **non-secret routing metadata** for the `x-portkey-config` / `x-portkey-virtual-key` / `x-portkey-provider` values, **but `x-portkey-api-key` is the secret** and is injected at materialization from the resolved keyring credential — it is **never** written to `providers.json` (see Data Model).

### Registry schema additions (`src/registry/types.ts`)

Additive, schema-version-safe (parser tolerates missing fields, so no `REGISTRY_SCHEMA_VERSION` bump required):

- `RegistryProvider.api` gains optional `headersTemplate?: Record<string, string>` — non-secret static headers applied to every model (e.g. an `x-portkey-config` chosen as the provider-wide default).
- `CachedModel` gains optional `headers?: Record<string, string>` — non-secret per-model routing headers (e.g. a specific VK or `@provider` slug). Merged over `headersTemplate` at materialization.
- A `portkey?: { configSlug?: string; virtualKeySlug?: string; providerSlug?: string }` hint on `CachedModel` for display/refresh (optional, derived).
- **Secret injection rule:** `materializeOne` (`materialize.ts:54`) merges `{ 'x-portkey-api-key': resolvedKey }` into each model's `headers` **only when the provider is Portkey and a credential resolved** — keeping the secret off disk.

### Provider template + add flow

- Add a `portkey` entry to `PROVIDER_TEMPLATES` (`provider-templates.ts`): `authType:'api'`, `npm:'@ai-sdk/openai-compatible'`, `defaultBaseUrl:'https://api.portkey.ai/v1'`, `signupUrl:'https://app.portkey.ai/'`, and a new `modelSource:'portkey-api'` so `add`/`refresh` dispatch to the Portkey path instead of the generic `fetchTemplateModels`.
- `runTemplateAddFlow` (`providers-command.ts:387`) special-cases `modelSource === 'portkey-api'` → `runPortkeyAddFlow` (`src/registry/portkey/add.ts`, new): prompt master key → spinner → `listConfigs` / `listVirtualKeys` / `listModels` → a selection wizard:
  1. **Routing target:** "Route through a Config", "Route through a Virtual Key / Provider", or "Pick individual models".
  2. Multiselect the chosen Configs / VKs / models (reuse the large-catalog search/paginate helpers in `prompts.ts` when the list is long).
  3. Persist credential + registry entry with the appropriate `headersTemplate` / per-model `headers`.
- Reuse the existing custom base-URL override prompt to support self-hosted Portkey (Open Question Q3).

### Launch integration

- **Single-model & favorites (`cli.ts`, `catalog.ts`):** no branching needed beyond threading `selectedModel.headers` into `startProxy(... , { headers })` and `buildCatalogRoutes`. Portkey models are openai-format, so they already take the SDK-adapter proxy path.
- **Codex / Gemini:** these consume the same materialized registry via `favorites-resolver.ts` / their own pickers and route through their proxies (`startCodexProxy`, gemini proxy). Thread `headers` into those route builders. Zen/Go-style skips do not apply — Portkey is a normal registry provider for these agents.
- **Server gateway (`server/*`):** `loadServerModels` already carries `npm`/`apiBaseUrl`/`apiKey`; add `headers` to `ServerModelInfo` and pass into `createLanguageModel` in `handleAnthropicMessages`. For the server's **anthropic** endpoint forwarding to a Portkey anthropic route, attach headers in the relay (AC-10).

---

## Data Model Changes

| Type | Field | Type | Required | Notes |
|---|---|---|---|---|
| `RegistryProvider.api` | `headersTemplate` | `Record<string,string>` | no | Non-secret provider-wide routing headers (e.g. default `x-portkey-config`). |
| `CachedModel` | `headers` | `Record<string,string>` | no | Non-secret per-model routing headers (VK / `@provider` slug). Merged over `headersTemplate`. |
| `CachedModel` | `portkey` | `{ configSlug?; virtualKeySlug?; providerSlug? }` | no | Display/refresh hint. |
| `LocalProviderModel` | `headers` | `Record<string,string>` | no | Materialized merge of template + model headers + injected secret. |
| `ProviderModelSpec` | `headers` | `Record<string,string>` | no | Passed to `createOpenAICompatible({ headers })`. |
| `ProxyRoute` | `headers` | `Record<string,string>` | no | Forwarded to `createLanguageModel`. |
| `ServerModelInfo` | `headers` | `Record<string,string>` | no | Server-side parity. |

**Migration:** none. All fields are optional and the registry parser ignores unknown/absent fields. `REGISTRY_SCHEMA_VERSION` stays `1`.

**Secret-handling invariant:** `x-portkey-api-key` is **never** persisted in `providers.json`. It is stored at `keyring:provider:portkey` and injected into `headers` at materialization only. Trace logging must redact all `x-portkey-*` header values (extend `redactTraceLine`).

---

## API / Endpoint Specs (consumed, not exposed)

### `GET https://api.portkey.ai/v1/configs`
**Auth:** `x-portkey-api-key: <master key>`.
**Response `200`:** `{ "success": true, "data": [ { "id", "name", "slug", "is_default", "status", "workspace_id", "organisation_id", "owner_id", "created_at", "last_updated_at" } ] }`.
Used by `listConfigs`. 401/403 → "master key rejected"; empty `data` → "no Configs found — create one in the Portkey dashboard or pick a Virtual Key/model instead".

### `GET https://api.portkey.ai/v1/virtual-keys`
**Auth:** `x-portkey-api-key`. **Response:** `{ data: [ { name, slug, ... } ] }`. Deprecated upstream in favor of Integrations/Providers; client should tolerate a 404/410 and fall back to model-catalog provider slugs.

### `GET https://api.portkey.ai/v1/models`
**Auth:** `x-portkey-api-key` + optional routing header. **Response:** OpenAI list shape `{ data: [ { id, ... } ] }`; Model-Catalog ids look like `@openai-prod/gpt-4o`. Parsed into `CachedModel[]` (format `openai`).

### Inference (at launch)
`POST https://api.portkey.ai/v1/chat/completions` (Option A) carrying `x-portkey-api-key` + routing header(s), issued by `@ai-sdk/openai-compatible` via the proxy. Anthropic `POST /v1/messages` reserved for AC-10.

---

## Acceptance Criteria

- [ ] **AC-1 — Control-plane client.** `PortkeyClient` lists configs (`GET /v1/configs`), virtual keys (`GET /v1/virtual-keys`), and models (`GET /v1/models`) with `x-portkey-api-key`, a 10s timeout, manual-redirect, 401/403 → rejection messaging, and graceful degradation when an endpoint is unavailable. New `src/registry/portkey/client.ts`; covered by `tests/portkey-client.test.ts` (mocked `fetch`).
- [ ] **AC-2 — SDK adapter headers.** `createLanguageModel({ headers })` passes `headers` into `createOpenAICompatible` (and the generic/openrouter branches), and the value reaches the upstream request. `src/provider-factory.ts`; covered by `tests/provider-factory.test.ts`.
- [ ] **AC-3 — Proxy headers.** `ProxyRoute.headers` is forwarded into `createLanguageModel` on the SDK branch; `startProxy`/`startProxyCatalog` accept and thread it. `src/proxy.ts`; covered by `tests/proxy.test.ts`.
- [ ] **AC-4 — Registry schema + secret injection.** `headersTemplate` (provider) and `headers` (model) round-trip through load/save; **no `x-portkey-api-key` is ever written to disk**; materialization injects the resolved master key into each Portkey model's headers and merges template+model headers. `src/registry/types.ts`, `src/registry/materialize.ts`; covered by `tests/registry.test.ts` + `tests/materialize.test.ts`.
- [ ] **AC-5 — Add flow.** `rflectr providers add → Portkey` prompts a master key, lists Configs/VKs/Models, lets the user select a routing target and models, persists the credential to `keyring:provider:portkey`, and writes a registry entry with correct routing headers. Rejected keys and empty results produce actionable messages. `src/provider-templates.ts`, `src/registry/portkey/add.ts`, `src/providers-command.ts`; covered by `tests/portkey-add.test.ts`.
- [ ] **AC-6 — Refresh.** `refreshProviderModels` dispatches `modelSource:'portkey-api'` to the Portkey client, updates the model cache, and keeps cached models on auth rejection (parity with other providers). `src/registry/refresh-models.ts`; covered by `tests/registry-refresh-models.test.ts`.
- [ ] **AC-7 — Claude launch.** A Portkey model launches Claude Code in both single-model and favorites-catalog modes; every `/v1/messages` request the proxy makes to Portkey carries `x-portkey-api-key` and the selected routing header. Verified via `--dry-run` output and manual trace. `src/cli.ts`, `src/catalog.ts`.
- [ ] **AC-8 — Codex & Gemini launch.** `rflectr codex` and `rflectr gemini` can select a Portkey model/Config and route through Portkey with the correct headers (single + favorites). `src/codex.ts`, `src/gemini.ts`, `src/favorites-resolver.ts`.
- [ ] **AC-9 — Server gateway.** `rflectr server` exposes Portkey models; `handleAnthropicMessages` routes openai-format Portkey models through the SDK adapter with headers attached. `src/server/index.ts`, `src/server/router.ts`, `src/server/models.ts`; covered by server tests.
- [ ] **AC-10 — Anthropic passthrough headers.** `relayAnthropicMessages` accepts and forwards extra headers, enabling an anthropic-format Portkey route (used by the server anthropic endpoint and reserved for a future CLI anthropic route). `src/upstream-forward.ts`, `src/proxy.ts`; covered by `tests/upstream-forward.test.ts`.
- [ ] **AC-11 — Dry-run, docs, redaction.** `--dry-run` shows the Portkey route + that headers will be attached (values redacted); `rflectr --ai` and `providers`/`claude` help mention Portkey; `redactTraceLine` masks all `x-portkey-*` values. `src/cli.ts`, `src/ai-doc.ts`, `src/trace-log.ts`.

---

## Test Plan

- **Unit:** `portkey-client.test.ts` (mocked `fetch`: success, 401, empty, redirect, timeout); `provider-factory.test.ts` (headers reach `createOpenAICompatible`); `proxy.test.ts` (route headers threaded); `materialize.test.ts` (secret injected, never on disk; template/model header merge); `portkey-add.test.ts` (selection → registry entry shape).
- **Integration:** `registry-refresh-models.test.ts` Portkey branch; server router test for a Portkey openai model.
- **Manual:** with a real master key — add Portkey, select a Config, `rflectr claude --dry-run` then a live launch; confirm in the Portkey dashboard that requests are attributed to the chosen Config; repeat for `codex` and `gemini`; confirm `--trace` redacts `x-portkey-api-key`.

---

## Risks & Open Questions

- **Risk — control-plane scope variance.** Configs/Virtual-Keys list endpoints may require admin/org scope that a given master key lacks (or be disabled on free plans). **Mitigation:** the add flow degrades to "pick individual models" when configs/VKs come back empty or 403, and never hard-fails when only `/v1/models` is reachable.
- **Risk — Virtual Keys deprecation.** Portkey is migrating Virtual Keys → Integrations/Providers (Model Catalog, `@slug/model` ids). **Mitigation:** prefer model-catalog provider slugs; treat `/v1/virtual-keys` as a best-effort fallback that may 404.
- **Risk — header secret leakage.** `x-portkey-api-key` is a header value, not a bearer body field — easy to log accidentally. **Mitigation:** AC-11 redaction is mandatory and tested; the key is injected only at materialization, never persisted.
- **Risk — cost display.** Like all non-Anthropic providers, Claude Code shows inaccurate cost for Portkey-routed models (documented PRD-002 limitation).
- **Q1 — Bearer vs header for the key.** Should the master key go in `x-portkey-api-key` only, or also as the SDK `apiKey` (Bearer)? Default: set both to the same value (Portkey accepts the key as Bearer); revisit if Portkey rejects a Bearer when a routing header is present.
- **Q2 — Default route format.** Confirm Option A (OpenAI-format via SDK adapter) as the shipped default for all CLI paths, with AC-10 reserved for server/future anthropic routes. (Recommended above.)
- **Q3 — Self-hosted Portkey.** Should v1 expose a base-URL prompt for self-hosted/enterprise gateways, or defer to the existing custom-endpoint flow? Default: reuse the custom base-URL override; no dedicated template field in v1.
- **Q4 — Config vs model granularity.** When a user picks a Config, do we register **one** synthetic model (the Config drives model choice upstream) or still enumerate models under it? Default: register a single "Config" pseudo-model per selected Config (id `portkey/<config-slug>`), plus optionally individual models when the user picks the model route.

---

## Related

- Knowledge (to write): [`../../../knowledge/private/integrations/portkey-gateway.md`](../../../knowledge/private/integrations/portkey-gateway.md)
- [PRD-002 — Provider Registry](../../completed/prd-002-provider-registry/) — registry schema, templates, add/refresh/materialize (primary host).
- [PRD-003 — Model Discovery & Classification](../../completed/prd-003-model-discovery-classification/) — `resolveEndpoint`, format classification.
- [PRD-004 — Translation Layer](../../completed/prd-004-translation-layer/) — the SDK adapter that gains `headers`.
- [PRD-005 — Local Proxy & Catalog Routing](../../completed/prd-005-local-proxy-catalog-routing/) — `ProxyRoute`/`startProxy(Catalog)` gain `headers`.
- [PRD-006 — Credential Storage](../../completed/prd-006-credential-storage/) — `keyring:provider:portkey` authRef.
- [PRD-009 — Codex Integration](../../completed/prd-009-codex-integration/) / [PRD-010 — Gemini CLI Integration](../../completed/prd-010-gemini-cli-integration/) — launch-surface wiring.
- [PRD-012 — Server Gateway](../../completed/prd-012-server-gateway/) — server-side header threading.
- External: [Portkey Configs API](https://portkey.ai/docs/api-reference/admin-api/control-plane/configs/list-configs), [Model Catalog](https://portkey.ai/docs/product/model-catalog), [Virtual Keys](https://portkey.ai/docs/product/ai-gateway/virtual-keys), [Gateway for Other APIs](https://portkey.ai/docs/api-reference/inference-api/gateway-for-other-apis).
