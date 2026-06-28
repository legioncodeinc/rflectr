# PRD-002: Provider Registry *(Retroactive)*

> **Status:** Shipped
> **Priority:** —
> **Effort:** —
> **Written:** June 2026
> **Retroactive:** Yes — written after implementation (rflectr v0.2.7).
> **Source:** `src/registry/*`, `src/provider-templates.ts`, `src/provider-catalog.ts`, `src/providers-command.ts`

---

## Overview

The Provider Registry is the on-disk catalog of AI providers and their cached models — the single source of truth that feeds every launch wizard in rflectr (`claude`, `codex`, `gemini`, `server`). It is persisted to `~/.rflectr/providers.json`, a JSON document that holds provider metadata and model caches but **never** holds secrets: each entry carries an `authRef` pointer into the OS keyring rather than a key.

Earlier versions of rflectr discovered providers by spawning OpenCode's `opencode serve` and reading `/config/providers` on *every* launch — slow, and a hard runtime coupling to a running OpenCode process. The registry replaces that model: providers are imported or added **once**, persisted, and read directly on every launch. OpenCode import (`rflectr providers import`) becomes a one-time operation rather than a per-launch dependency, while OpenCode Zen / Go remain available even against an empty registry (via a live OpenCode API key).

See the authoritative knowledge doc: [`../../../knowledge/private/data/provider-registry.md`](../../../knowledge/private/data/provider-registry.md).

## What Was Built

- A typed, versioned on-disk schema (`ProviderRegistry` / `RegistryProvider` / `CachedModel`) persisted to `~/.rflectr/providers.json` with secure permissions (`0o600` file in a `0o700` dir), atomic writes, and a `.bak` backup.
- A library of **27 built-in provider templates** (Groq, Mistral, OpenAI, Google, Ollama, LM Studio, OpenRouter, Anthropic, Zen/Go stubs, etc.) so a user can add a provider without hand-entering base URLs.
- A full CRUD surface via the `rflectr providers` command: hub, `add`, `import`, `list`, `remove`, `refresh-models`, `auth`.
- One-time **OpenCode import** that merges API-key and OAuth providers from `opencode serve` + `auth.json`, with duplicate-provider migration and interactive conflict resolution.
- **Materialization**: registry entries → runtime `LocalProvider[]` consumed by every wizard, with credential resolution, per-agent model hiding, and Google id normalization.
- **models.dev capability enrichment** (bundled snapshot + optional live refresh) for reasoning/tool-call metadata.
- An **SSRF URL-security guard** for custom-endpoint base URLs (DNS resolution + private-range blocking + metadata-host blocklist).
- **Schema migrations** for legacy cloud ids (`opencode`→`zen`, `opencode-go`→`go`) and OAuth provider id splits (`openai`→`openai-oauth`, `xai`→`xai-oauth`).

## Goals

1. Make provider discovery a one-time persisted operation, decoupling launch from a running OpenCode process.
2. Store provider/model metadata locally with secure file permissions and **no secrets on disk**.
3. Offer a curated template catalog so common providers can be added with a key alone.
4. Provide a single materialization path that every wizard (Claude/Codex/Gemini/Server) consumes identically.
5. Keep OpenCode as the source of truth for *which* models a provider exposes; rflectr maintains no per-package allowlist beyond the templates.
6. Guard custom-endpoint URLs against SSRF.

## Non-Goals

- Storing API keys or OAuth tokens in `providers.json` (credentials live in the keyring — see [PRD-006](../prd-006-credential-storage/) / [PRD-007](../prd-007-oauth-device-flows/)).
- Maintaining a per-npm-package model allowlist beyond the template catalog (OpenCode/provider API is authoritative).
- Supporting providers whose auth cannot be reduced to a single forwarded API key or OAuth token (Bedrock/Azure/Vertex are reference-only templates; Vertex is served only through the dedicated `server --vertex` path).
- Model classification/format heuristics themselves (owned by [PRD-003](../prd-003-model-discovery-classification/)).

## Features

| # | Feature | Source | Acceptance |
|---|---------|--------|------------|
| 1 | On-disk schema + secure persistence | `src/registry/types.ts`, `src/registry/io.ts` | [AC-1](#acceptance-criteria) |
| 2 | Built-in template catalog (27 templates) | `src/provider-templates.ts` | [AC-2](#acceptance-criteria) |
| 3 | `rflectr providers` CRUD command | `src/providers-command.ts`, `src/registry/crud.ts` | [AC-3](#acceptance-criteria) |
| 4 | Template add (key test + model fetch) | `src/registry/add-template.ts` | [AC-4](#acceptance-criteria) |
| 5 | Custom-endpoint add (OpenAI/Anthropic) | `src/registry/custom-endpoint.ts` | [AC-5](#acceptance-criteria) |
| 6 | OpenCode one-time import + conflict resolution | `src/registry/import-opencode.ts`, `src/registry/import-build.ts` | [AC-6](#acceptance-criteria) |
| 7 | Materialization → `LocalProvider[]` | `src/registry/materialize.ts`, `src/registry/load.ts` | [AC-7](#acceptance-criteria) |
| 8 | Schema migrations | `src/registry/migrate.ts` | [AC-8](#acceptance-criteria) |
| 9 | models.dev capability enrichment | `src/registry/models-dev.ts` | [AC-9](#acceptance-criteria) |
| 10 | URL-security SSRF guard | `src/registry/url-security.ts` | [AC-10](#acceptance-criteria) |
| 11 | Model-list refresh per `modelSource` | `src/registry/refresh-models.ts` | [AC-11](#acceptance-criteria) |
| 12 | Catalog adapters for pickers/server | `src/provider-catalog.ts` | [AC-12](#acceptance-criteria) |

## Architecture & Implementation

### Data flow: registry entry → runtime provider

```
~/.rflectr/providers.json
  → loadRegistry()                 [io.ts:116 — parse, validate, apply migrations]
  → loadRegistryProviders()        [load.ts:12 — resolve each authRef → credential]
      resolveProviderCredential()  [env.ts — env → keyring → OAuth refresh]
  → materializeRegistry()          [materialize.ts:84 — CachedModel → LocalProviderModel]
      skip disabled / no-models / no-credential
      shouldHideModel() per agent  [model-compatibility.ts]
  → LocalProvider[]                 (the wizard list)
```

### On-disk schema & persistence

`ProviderRegistry`, `RegistryProvider`, and `CachedModel` are defined in `src/registry/types.ts:9-57`; `REGISTRY_SCHEMA_VERSION = 1` at `types.ts:5`. The provider id pattern `PROVIDER_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/` lives in `src/registry/validate.ts:6`, with `slugifyProviderId` / `customProviderId` helpers at `validate.ts:12-26`.

`loadRegistry(path?)` (`src/registry/io.ts:116`) returns an empty registry when the file is missing or unparseable, runs the three migrations, and persists if any migration changed the data. `parseRegistry`/`parseProvider` (`io.ts:52-114`) defensively validate every field and drop malformed providers. `saveRegistry` (`io.ts:139`) writes a `.bak` copy, writes to a `.tmp` file via `writeSecureFile` (`io.ts:36` — `openSync` with `0o600`, then `chmodSync`), then `renameSync`s atomically. `ensureSecureAppHome` (`io.ts:26`) creates `~/.rflectr` at `0o700`. The JSON is 2-space indented with a trailing newline (`io.ts:140`). **No secrets** are written: `authRef` is a pointer string only.

### Built-in templates

`src/provider-templates.ts:26` defines `PROVIDER_TEMPLATES` (27 entries). Each `ProviderTemplate` (`provider-templates.ts:8-23`) carries `id`, `name`, `authType` (`api`/`oauth`/`none`), `npm` (SDK package), optional `defaultBaseUrl`/`signupUrl`/`urlPrompt`/`apiKeyOptional`, `modelSource` (`api-list` | `static-seed` | `manual-only` | `zen-go-api`), and `supported`/`addable`/`unsupportedReason` flags. Query helpers: `listSupportedTemplates` (`:310`, filters to `supported && authType==='api' && addable!==false`), `listAddableTemplates` (`:317`, removes already-configured ids and collapses Zen/Go under `opencode-cloud`), `getTemplateById` (`:327`), `filterTemplates` (`:331`).

Reference-only (not addable) templates carry `supported:false` + `unsupportedReason`: `bedrock` (`:242`), `azure` (`:250`), `vertex` (`:259`). Zen/Go stubs (`zen`/`go`) are `addable:false` (`:285`/`:295`); `opencode-cloud` (`:269`) is the addable proxy that routes to them. `github-copilot` is an `oauth` template (`:299`).

### The `providers` command

`src/providers-command.ts` parses args (`parseProvidersArgs`, `:51`) and dispatches (`runProvidersCommand`, `:798`):

| Command | Function | Notes |
|---|---|---|
| `rflectr providers` | `runProvidersHub` (`:727`) | Interactive hub loop |
| `… add` | `runProvidersAdd` (`:564`) | Import / template / custom endpoint |
| `… import` | `runProvidersImport` (`:131`) | One-time OpenCode import w/ conflict panel |
| `… list` | `runProvidersList` (`:304`) | Tabular, via `resolveProvidersForDisplay` |
| `… remove <id>` | `runProvidersRemove` (`:607`) → `removeProviderFromRegistry` | Entry + keyring cleanup |
| `… refresh-models [id]` | `runProvidersRefreshModels` (`:236`) | Re-fetch model cache |
| `… auth <id> [--native\|--broker]` | `runProvidersAuth` (`:221`) | OAuth sign-in — see [PRD-007](../prd-007-oauth-device-flows/) |

CRUD primitives live in `src/registry/crud.ts`: `removeProviderFromRegistry` (`:23`, with safe keyring deletion gated by `credentialStillReferenced`, `:18`), `toggleProviderEnabled` (`:87`), `addZenRegistryStub`/`addGoRegistryStub` (`:54`/`:66`), `setRegistrySubscriptionFilter` (`:76`).

### Template add

`addProviderFromTemplate` (`src/registry/add-template.ts:42`): probes the SDK package is importable (`probeTemplatePackage`, `:27`, guarded by `isSdkMigratedNpm`), rejects an existing provider unless `replaceExisting`, fetches the live model list (`fetchTemplateModels`), saves the credential to `keyring:provider:<id>`, enriches with pricing (`enrichModelsWithPricing`), writes the entry, and kicks off async pricing enrichment (`enrichPricingAsync`).

### Custom endpoints

`addCustomEndpointProvider` (`src/registry/custom-endpoint.ts:136`) validates the base URL through the SSRF guard, allocates a unique `custom-…` id (`uniqueProviderId`, `:121`), fetches models via the Anthropic path (`fetchAnthropicModels`, `:41`) or the OpenAI-compatible template path, saves the key (or the placeholder `'local'` for keyless local servers), and writes a `custom-anthropic`/`custom-openai` entry.

### OpenCode import

`importFromOpencode` (`src/registry/import-opencode.ts:102`) fetches raw providers from `opencode serve`, reads `auth.json`, and merges API-key + OAuth providers via `buildImportProviderList` (`src/registry/import-build.ts:40`). It runs the legacy-cloud migration, validates each key (`validateImportKey`), resolves conflicts through an injected `resolveConflict` callback (the hub renders a panel and prompts keep/import/skip), saves credentials (API key → `keyring:provider:<id>`; OAuth → `keyring:oauth:provider:<id>`), and records skip reasons. OAuth provider ids are split via `toOAuthRegistryId` (`import-build.ts:23` — `openai`→`openai-oauth`, `xai`→`xai-oauth`). `listCredentialSkippedProviders` (`import-build.ts:112`) surfaces only actionable gaps (OAuth sign-in needed, or a provider already in the registry). `localProviderToRegistry` (`src/registry/convert.ts:28`) performs the structural conversion (no secret write).

### Materialization

`materializeRegistry` (`src/registry/materialize.ts:84`) iterates providers and calls `materializeOne` (`:54`): skips disabled / invalid-id providers, converts each `CachedModel` via `cachedModelToLocal` (`:21`), drops models whose endpoint can't be resolved (`resolveEndpoint`, `src/providers.ts:29`) and models hidden by `shouldHideModel`, and finally drops the whole provider when it has **no models** or **no credential** (`:69-72`). Google ids/display names are normalized (`normalizeGoogleModelId`/`normalizeGoogleDisplayName`); context windows and reasoning fall back to `resolveContextWindow` and the models.dev row (`findModelsDevModel`). `loadRegistryProviders` (`src/registry/load.ts:12`) resolves credentials + OAuth account ids before materializing.

### Schema migrations

`src/registry/migrate.ts`, applied inside `loadRegistry`:
- `migrateLegacyCloudProviders` (`:10`) — `opencode`→`zen`, `opencode-go`→`go` (collapsing a duplicate, otherwise rewriting id/templateId/name and clearing `api`).
- `migrateOAuthOpenAiProvider` (`:37`) — `{id:'openai', authType:'oauth'}`→`openai-oauth` so it can coexist with the API-key `openai`, preserving the original `authRef`.
- `migrateOAuthXaiProvider` (`:56`) — `{id:'xai', authType:'oauth'}`→`xai-oauth`.

### models.dev enrichment

`src/registry/models-dev.ts` ships a bundled snapshot (`loadBundledModelsDevCache`, `:92`, from `src/data/models-dev-cache.json`) and supports an optional live refresh (`fetchModelsDevCache`, `:179`, 15s timeout, written `0o600` to `~/.rflectr/models-dev-cache.json`). `findModelsDevModel` (`:212`) resolves the provider slug via `REGISTRY_TO_MODELS_DEV` (`:60`) and matches normalized model-id candidates; `shouldHideByModelsDevCapabilities` (`:229`) is the conservative auto-hide rule (non-text output, `tool_call===false`, interaction-only models). `refreshModelsDevCacheAsync` (`:205`) refreshes in the background.

### URL-security (SSRF guard)

`validateCustomEndpointUrl` (`src/registry/url-security.ts:65`): requires HTTPS (HTTP only when `allowInsecureLocal` and the host resolves to loopback), blocks a metadata-host blocklist (`169.254.169.254`, `metadata.google.internal`, ECS task metadata — `:20`), DNS-resolves the hostname, and blocks any address in loopback/private/link-local/unique-local/CGNAT ranges via `isBlockedIp` (`:27`, using `ipaddr.js`). Unparseable inputs fail closed. Returns a normalized, trailing-slash-stripped URL on success.

### Model-list refresh

`refreshProviderModels` (`src/registry/refresh-models.ts:321`) branches on `resolveModelSource`: `manual-only` is skipped with a hint; `zen-go-api` re-fetches via `getModels(BACKENDS[...])` (`refreshZenGoProvider`, `:76`); OAuth providers use the live-or-seed strategy (`refreshOAuthProvider`, `:97`, with the OpenAI 3-tier ChatGPT-backend strategy at `:182` and the xAI strategy at `:223`); everything else hits the API list (`refreshApiListProvider`, `:248`) with placeholder-key detection and a "keep cached models" fallback on auth rejection. `refreshAllProviderModels` (`:445`) auto-seeds Zen/Go stubs when a global OpenCode key exists, then refreshes every enabled provider.

### Catalog adapters

`src/provider-catalog.ts` adapts materialized providers for consumers: `resolveLocalProviders`/`fetchProviderCatalog` (`:38`/`:44`), `providersForPicker` (`:85`, merges live Zen/Go when not already in the registry, sorts), `resolveLocalProviderApiKey` (`:109`), `formatRegistryAuthLabel` (`:120`), `resolveProvidersForDisplay` (`:161`, the `providers list`/hub row builder), `localProvidersToServerModels`/`zenGoModelsToServerModels` (`:228`/`:259`, used by the server gateway — see [PRD-012](../prd-012-server-gateway/)).

## Configuration & Data Shapes

Path: `getProvidersPath()` → `~/.rflectr/providers.json` (override the home with `RFLECTR_HOME`).

```ts
// src/registry/types.ts
ProviderRegistry {
  schemaVersion: number          // currently 1 (REGISTRY_SCHEMA_VERSION)
  providers: RegistryProvider[]
  importedAt?: string            // last OpenCode import (ISO)
  pricingCacheAt?: string
}

RegistryProvider {
  id: string                     // PROVIDER_ID_PATTERN: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
  templateId: string             // origin template, e.g. 'groq', 'custom-openai'
  name: string                   // display name
  enabled: boolean
  authRef: string                // pointer ONLY: 'keyring:provider:groq' |
                                 //   'keyring:global:opencode' | 'keyring:oauth:provider:xai-oauth' | 'env:…'
  authType?: 'api' | 'oauth' | 'none'
  subscriptionFilter?: 'free' | 'zen' | 'go'
  api: { npm?: string; url?: string; id?: string }
  modelsCache?: { fetchedAt: string; models: CachedModel[] }
  addedAt: string                // ISO
  refreshedAt?: string
}

CachedModel {
  id: string
  name: string
  upstreamModelId: string        // provider's native id for the wire call
  family?: string; brand?: string
  contextWindow?: number
  cost?: { input: number; output: number }
  modelFormat: 'anthropic' | 'openai'
  npm?: string                   // per-model override of provider.api.npm
  apiUrl?: string                // per-model override of provider.api.url
  sourceBackend?: string
  supportedParameters?: string[]
  reasoning?: boolean
  interleavedReasoningField?: string
}
```

**`authRef` forms** (resolved by `resolveProviderCredential`): `keyring:provider:<id>` (per-provider key), `keyring:global:opencode` (shared OpenCode key, used by Zen/Go), `keyring:oauth:provider:<id>` (OAuth credential JSON), `env:VARNAME` (env-var fallback).

## Acceptance Criteria

- [x] **AC-1 — Schema & secure persistence.** `providers.json` round-trips through `loadRegistry`/`saveRegistry`; the file is written `0o600` inside a `0o700` dir via atomic tmp+rename with a `.bak` backup; malformed/missing files yield an empty registry; **no secrets** are stored (`authRef` is a pointer). `src/registry/io.ts:26,36,116,139`; covered by `tests/registry.test.ts`.
- [x] **AC-2 — Template catalog.** 27 built-in templates exist; `listSupportedTemplates`/`listAddableTemplates`/`getTemplateById`/`filterTemplates` filter by support, configured-state, and query; reference-only templates (Bedrock/Azure/Vertex) carry `unsupportedReason`. `src/provider-templates.ts:26,310-340`; covered by `tests/provider-templates.test.ts`.
- [x] **AC-3 — CRUD command.** `parseProvidersArgs` resolves `hub`/`add`/`import`/`list`/`remove`/`refresh-models`/`auth` with argument validation and help text. `src/providers-command.ts:51,104,798`; covered by `tests/providers-command.test.ts`.
- [x] **AC-4 — Template add.** `addProviderFromTemplate` probes the SDK package, tests the key by fetching models, rejects empty keys and existing providers (unless replacing), persists credential + entry, and enriches pricing. `src/registry/add-template.ts:42`; covered by `tests/registry-add-template.test.ts`.
- [x] **AC-5 — Custom endpoints.** `addCustomEndpointProvider` validates the URL, allocates a unique `custom-…` id, supports OpenAI-compatible and Anthropic-style servers, and persists a keyless `'local'` placeholder for local servers. `src/registry/custom-endpoint.ts:121,136`.
- [x] **AC-6 — OpenCode import.** `importFromOpencode` merges API-key + OAuth providers, validates keys, resolves duplicate-provider conflicts (keep/import/skip), saves credentials to the keyring, and reports skip reasons; OAuth ids split to `<id>-oauth`. `src/registry/import-opencode.ts:102`, `src/registry/import-build.ts:23,40,112`; covered by `tests/import-opencode.test.ts`.
- [x] **AC-7 — Materialization.** `materializeRegistry` converts enabled entries to `LocalProvider[]`, dropping providers with no credential or no cached models and applying per-agent `shouldHideModel`. `src/registry/materialize.ts:54,84`, `src/registry/load.ts:12`.
- [x] **AC-8 — Migrations.** Legacy `opencode`/`opencode-go` ids migrate to `zen`/`go`; OAuth `openai`/`xai` split to `openai-oauth`/`xai-oauth`, preserving `authRef`. `src/registry/migrate.ts:10,37,56`; run inside `loadRegistry` (`io.ts:123`).
- [x] **AC-9 — models.dev enrichment.** A bundled snapshot ships in the binary; an optional live refresh writes `0o600` to `~/.rflectr/models-dev-cache.json`; `findModelsDevModel` supplies reasoning/interleaved metadata during materialization. `src/registry/models-dev.ts:92,179,212`.
- [x] **AC-10 — SSRF guard.** `validateCustomEndpointUrl` blocks metadata hosts and private/loopback/link-local/CGNAT addresses after DNS resolution, allows loopback HTTP only with `allowInsecureLocal`, and fails closed on parse errors. `src/registry/url-security.ts:20,27,65`; covered by `tests/url-security.test.ts`.
- [x] **AC-11 — Model refresh.** `refreshProviderModels` re-fetches per `modelSource` (zen-go / OAuth live-or-seed / api-list), detects placeholder keys, and keeps cached models on auth rejection. `src/registry/refresh-models.ts:248,321,445`; covered by `tests/registry-refresh-models.test.ts`.
- [x] **AC-12 — Catalog adapters.** `providersForPicker` / `resolveProvidersForDisplay` / `localProvidersToServerModels` / `zenGoModelsToServerModels` adapt materialized providers for the CLI pickers, `providers list`, and the server gateway. `src/provider-catalog.ts:85,161,228,259`; covered by `tests/provider-catalog-display.test.ts`.

## Files

### Primary
- `src/registry/types.ts` — schema (`ProviderRegistry`, `RegistryProvider`, `CachedModel`, `REGISTRY_SCHEMA_VERSION`).
- `src/registry/io.ts` — load/save with secure perms, parse/validate, migration trigger.
- `src/registry/load.ts` — credential resolution + materialization entry (`loadRegistryProviders`).
- `src/registry/materialize.ts` — registry entries → `LocalProvider[]`.
- `src/registry/crud.ts` — add/remove/toggle, Zen/Go stubs, subscription filter.
- `src/registry/validate.ts` — provider-id pattern + slugify/custom-id helpers.
- `src/registry/builtins.ts` — Zen/Go registry stub entries.
- `src/registry/migrate.ts` — legacy-cloud + OAuth-id migrations.
- `src/registry/import-opencode.ts` + `src/registry/import-build.ts` — one-time OpenCode import + merge logic.
- `src/registry/convert.ts` — `LocalProvider` ↔ `RegistryProvider`.
- `src/registry/add-template.ts` — template add flow.
- `src/registry/custom-endpoint.ts` — custom OpenAI/Anthropic endpoint add + `fetchAnthropicModels`.
- `src/registry/resolve-template.ts` — imported-id → template + default base URL resolution.
- `src/registry/refresh-models.ts` — model-list refresh per `modelSource`.
- `src/registry/models-dev.ts` — models.dev capability cache (bundled + live).
- `src/registry/url-security.ts` — SSRF guard for custom URLs.
- `src/provider-templates.ts` — the 27 built-in templates + query helpers.
- `src/provider-catalog.ts` — picker/display/server adapters.
- `src/providers-command.ts` — the `rflectr providers` command.

### Supporting
- `src/registry/index.ts` — public barrel re-exports.
- `src/registry/fetch-template-models.ts` — live model-list fetch per template.
- `src/registry/google-model-id.ts` — Google model-id / display-name normalization.
- `src/registry/model-source.ts` — `resolveModelSource(provider)`.
- `src/registry/pricing.ts` — pricing index + async enrichment.
- `src/registry/refresh-credentials.ts` — credential resolution + placeholder-key detection for refresh.
- `src/registry/validate-import-key.ts` — import key validation.
- `src/registry/opencode-auth.ts` — `auth.json` read + OAuth credential shaping.
- `src/registry/provider-auth.ts`, `src/registry/auth-broker.ts` — provider OAuth (see [PRD-007](../prd-007-oauth-device-flows/)).
- `src/providers.ts` — `resolveEndpoint` + `normalizeProviders` (shared with import).
- `src/paths.ts` — `getProvidersPath` / `getAppHome` / `RFLECTR_HOME`.
- `src/data/models-dev-cache.json` — bundled models.dev snapshot.

## Risks & Known Limitations

- **Cost display inaccuracy** — pricing enrichment is best-effort; Claude Code applies its own pricing table for non-Anthropic models, so displayed cost is always inaccurate for them (documented, by design).
- **OAuth-only providers without a stored token** are silently skipped at materialization (no credential → provider dropped).
- **`@ai-sdk/github-copilot` model factory is unavailable** — OpenCode loads it from internal `@opencode-ai/core`, not a shippable public npm factory. OAuth login works; the model provider does not.
- **Bedrock / Azure / Vertex are reference-only** templates (`supported:false`); they need env-based auth beyond a forwarded API key. Vertex is supported only via the dedicated `server --vertex` path — see [PRD-012](../prd-012-server-gateway/).
- **SSRF guard resolves DNS at validation time**, not at request time — a TOCTOU rebinding window exists between validation and use (mitigated by the request itself going through the SDK adapter / proxy).
- **models.dev live refresh is silent on failure** — falls back to the bundled snapshot, so capability metadata may lag the upstream catalog when offline.
- **Stale cached models** persist when a refresh fails on auth rejection (deliberate — keeps the user functional, surfaced with a warning).

## Related

- Knowledge: [`provider-registry.md`](../../../knowledge/private/data/provider-registry.md)
- [PRD-001 — CLI Core & Launch Orchestration](../prd-001-cli-core-launch-orchestration/) (consumes materialized providers at launch)
- [PRD-003 — Model Discovery & Classification](../prd-003-model-discovery-classification/) (`resolveEndpoint`, format classification, `getModels`)
- [PRD-006 — Credential Storage & API Key Management](../prd-006-credential-storage/) (`authRef` resolution, keyring)
- [PRD-007 — OAuth Device Flows](../prd-007-oauth-device-flows/) (`providers auth`, OAuth import, id splits)
- [PRD-008 — Preferences, Tiers & Favorites](../prd-008-preferences-tiers-favorites/) (`subscriptionFilter`, model hiding)
- [PRD-012 — Server Gateway](../prd-012-server-gateway/) (`localProvidersToServerModels`, Vertex path)
