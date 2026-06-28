# PRD-008: Preferences, Subscription Tiers & Favorites *(Retroactive)*

> **Status:** Shipped
> **Priority:** —
> **Effort:** —
> **Written:** June 2026
> **Retroactive:** Yes — written after implementation (rflectr v0.2.7).
> **Source:** `src/config.ts`, `src/favorites.ts`, `src/favorites-resolver.ts`, `src/prompts.ts`

---

## Overview

`rflectr` keeps a small, durable layer of user state so the CLI feels personal across sessions: the last backend/model/provider you launched, recently used models per provider, a curated list of favorite models for the mid-session `/model` switch menu, and per-command `server` settings. All of it lives in a single JSON file under a per-user app-home directory, resolved with an override hook and migrated transparently from two earlier locations.

On top of that state sit three interaction systems:

1. **Preferences store** — read/write helpers around `~/.rflectr/config.json`, with legacy-path migration and a `--dry-run` write-skip contract.
2. **Subscription / Zen tier filtering** — a `RegistrySubscriptionFilter` (`free` / `zen` / `go`) carried on the OpenCode Zen registry stub that scopes which cloud models surface; seeded as `free` during first-run.
3. **Favorites** — a manager command (`rflectr models`) plus a resolver shared with the Codex catalog, capped at `MAX_MODEL_CATALOG` (20), and a large-catalog UX (search + pagination) that keeps long model lists navigable.

This PRD documents what was built, grounded in the shipped code.

---

## What Was Built

- A single app-home directory (`~/.rflectr`, override via `RFLECTR_HOME`) holding `config.json` and sibling files, created `0o700` / files `0o600` (`src/paths.ts:28`, `src/config.ts:63`).
- `loadPreferences()` / `savePreferences()` with a shallow per-key merge so callers pass only what changed (`src/config.ts:67`, `src/config.ts:85`).
- `recordLaunchSelection(agent, providerId, modelId, prefs)` — updates the per-agent `last*` fields and prepends to `recentModelsByProvider` (deduped, capped at 3) (`src/config.ts:101`).
- Two-stage legacy migration: dotfile dir (`~/.opencode-starter`) then OS `conf` store, both one-directional and idempotent (`src/config.ts:17`, `src/config.ts:34`).
- `lastProvider === 'opencode'` normalized to `'zen'` on read (`src/config.ts:70`).
- Pure favorites algebra: `isFavorite`, `addFavorite` (duplicate / cap results), `removeFavorite` (`src/favorites.ts`).
- The `rflectr models` favorites manager: list / add (global search or browse-by-provider, multi-select) / remove, single save on Done (`src/cli.ts:534`).
- A surface-agnostic favorites resolver shared by Claude and Codex (`src/favorites-resolver.ts`).
- Recent-models hint at the top of the local-model picker, with a "Browse all models →" escape hatch (`src/prompts.ts:305`).
- Large-catalog UX: search at `MODEL_SEARCH_THRESHOLD = 25`, pagination at `MODEL_PAGE_SIZE = 15` (`src/prompts.ts:22`).
- Inline, never-dead-end first-run wizard that ends in launch or explicit cancel (`src/first-run.ts:36`).

---

## Goals

- Persist enough state that repeat launches pre-select the user's prior choice rather than starting cold.
- Make a curated multi-model `/model` switch menu possible without re-picking every session.
- Keep one canonical config location, surviving the project's two historical renames without user action.
- Honor `--dry-run` as a true no-write simulation of a fresh first run.
- Keep long provider model lists usable (search / paginate) instead of dumping 100+ entries into one prompt.

## Non-Goals

- Touching `~/.claude/settings.json` — launch config is env-var-only (see [PRD-001](../prd-001-cli-core-launch-orchestration/prd-001-cli-core-launch-orchestration-index.md)).
- Storing secrets in `config.json` — API keys live in the OS credential store ([PRD-006](../prd-006-credential-storage/) — folder pending). The server password is migrated *out* of `config.json` into the keyring on first read (`src/config.ts:131`).
- Cloud-syncing preferences across machines (the file is per-user, per-host).

---

## Features

| # | Feature | Entry point | Notes |
|---|---------|-------------|-------|
| F1 | App-home resolution + override | `getAppHome()` (`src/paths.ts:28`) | `RFLECTR_HOME` (or deprecated `OPENCODE_STARTER_HOME`) wins, else `~/.rflectr` |
| F2 | Preferences load/save (shallow merge) | `loadPreferences` / `savePreferences` (`src/config.ts:67`) | Pass only changed keys |
| F3 | Record launch selection | `recordLaunchSelection` (`src/config.ts:101`) | Per-agent `last*` + recent list (max 3, dedup) |
| F4 | Legacy migration (2 stages) | `ensureConfigMigrated` (`src/config.ts:34`) | Dotfile dir → OS conf store; idempotent |
| F5 | Subscription/Zen tier filter | `RegistrySubscriptionFilter` (`src/registry/types.ts:7`) | `free` / `zen` / `go` on the Zen stub |
| F6 | Favorites algebra | `addFavorite` / `removeFavorite` (`src/favorites.ts`) | Cap at `MAX_MODEL_CATALOG` (20) |
| F7 | Favorites manager command | `runModelsCommand` (`src/cli.ts:534`) | `rflectr models`; saves once on Done |
| F8 | Favorites resolver (shared) | `resolveFavorite` / `buildFavoritesList` (`src/favorites-resolver.ts:52`) | Stale favorites dropped silently |
| F9 | Recent-models picker | `pickLocalModel` (`src/prompts.ts:305`) | Recent shown first + "Browse all" |
| F10 | Large-catalog search/pagination | `selectModelWithSearch` / `selectLargeCatalog` (`src/prompts.ts:246`) | Thresholds 25 / 15 |
| F11 | First-run wizard | `runFirstRunWizard` (`src/first-run.ts:36`) | Zen quick-start / import / providers |

---

## Architecture & Implementation

### Config store schema

`config.json` is parsed into `UserPreferences` (`src/types.ts:72`). Unknown keys are tolerated; everything is optional.

| Field | Type | Purpose | Cite |
|-------|------|---------|------|
| `lastBackend` | `'zen' \| 'go'` | Last cloud backend launched | `src/types.ts:73` |
| `lastModel` | `string` | Last Claude Code model (pre-selects wizard) | `src/types.ts:74` |
| `lastProvider` | `string` | Last Claude Code provider (`'opencode'`→`'zen'` on read) | `src/config.ts:70` |
| `lastCodexProvider` / `lastCodexModel` | `string` | Last Codex selection | `src/types.ts:76` |
| `lastGeminiProvider` / `lastGeminiModel` | `string` | Last Gemini selection | `src/types.ts:78` |
| `recentModelsByProvider` | `Record<string,string[]>` | Up to 3 recent model ids per provider | `src/types.ts:80` |
| `favoriteModels` | `FavoriteModel[]` | `{ providerId, modelId }`, max 20 | `src/types.ts:81` |
| `server` | object | `savedPassword`, `exposedProviders`, `maskGatewayIds`, `favoritesOnly` | `src/types.ts:82` |

**Write path.** `writeConfig()` creates the parent dir `0o700` and writes the file `0o600` with a trailing newline (`src/config.ts:61`). `savePreferences()` is a key-by-key conditional merge — every field is copied through only when `!== undefined`, so partial updates never clobber siblings (`src/config.ts:85`).

> **Note on `subscriptionTier`.** Earlier drafts of the design (and `CLAUDE.md`) describe a `subscriptionTier` (`free`/`zen`/`go`/`both`) preference field. In the shipped v0.2.7 code that field is **not** part of `UserPreferences`, `loadPreferences()`, or `savePreferences()`. The tier concept survives instead as `RegistrySubscriptionFilter` on the registry's Zen provider stub (see *Tier behavior* below). This PRD documents the code as shipped.

### App home & override

`getAppHome(env)` returns `resolveAppHomeOverride(env)` when `RFLECTR_HOME`/`OPENCODE_STARTER_HOME` is set (trimmed, non-empty), else `~/.rflectr` (`src/paths.ts:23`, `src/paths.ts:28`). Sibling path helpers (`getConfigPath`, `getProvidersPath`, `getLogsPath`, `getVertexModelsPath`) all derive from it (`src/paths.ts:38`).

### Legacy migration

`readConfig()` runs `ensureConfigMigrated()` before every read (`src/config.ts:56`). Both stages bail the instant `~/.rflectr/config.json` already exists, making migration idempotent:

1. `ensureAppHomeMigrated()` copies `~/.opencode-starter/config.json` (and `vertex-models.json` alongside) into the new home (`src/config.ts:17`).
2. `ensureConfigMigrated()` then copies the even-older OS `conf` file (`getLegacyConfPath`, platform-specific — `src/paths.ts:54`) and best-effort renames the source to `…​.migrated` (`src/config.ts:49`).

### Tier behavior

The Zen registry stub carries an optional `subscriptionFilter: RegistrySubscriptionFilter` (`src/registry/types.ts:7`, `src/registry/builtins.ts:7`). First-run seeds it as `'free'` via `zenRegistryStub('free')` (`src/first-run.ts:31`). The filter scopes which OpenCode cloud models surface; combined Zen+Go lists track the originating backend per model so the correct base URL is set per selection (see [PRD-003](../prd-003-model-discovery-classification/) for model-discovery merge and `sourceBackend`).

| Filter | Behavior |
|--------|----------|
| `free` | Zen free models only — seeded default on first-run (`src/first-run.ts:31`) |
| `zen` | Zen backend models |
| `go` | OpenCode Go (paid) backend models |

`lastBackend` (`'zen' \| 'go'`) records the most recently launched cloud backend independently of the filter (`src/types.ts:73`). The two cloud backends are defined in `BACKENDS` (`src/constants.ts:9`); their `baseUrl` must **not** include `/v1` (the Anthropic SDK appends `/v1/messages`).

### Favorites flow

Pure algebra (`src/favorites.ts`):

- `isFavorite(list, fav)` — `providerId` + `modelId` equality.
- `addFavorite(list, fav, max=MAX_MODEL_CATALOG)` returns `{ ok:false, reason:'duplicate' }`, `{ ok:false, reason:'cap' }`, or `{ ok:true, list }` (`src/favorites.ts:14`).
- `removeFavorite(list, fav)` — filtered copy (`src/favorites.ts:24`).

Manager (`runModelsCommand`, `src/cli.ts:534`): fetches the provider catalog, builds a `providerId:modelId → label` lookup, then loops a menu where each favorite row removes-on-select, `+ Add a model →` offers global cross-provider search (`pickGlobalFavoriteModel`, `src/favorites-picker.ts:85`) or browse-by-provider multi-select, and `Done` exits. State is held in memory and written **once** on exit via `savePreferences({ favoriteModels })` only when `favoritesDirty` (`src/cli.ts:728`). The cap is enforced both in the UI (`atCap` disables Add, `src/cli.ts:579`) and in `addFavorite`.

**Resolution shared with Codex.** `resolveFavorite(fav, ctx)` (`src/favorites-resolver.ts:52`) is route-shape-agnostic — each surface (Claude / Codex / Server) builds its own `ResolveContext`. Zen/Go favorites resolve against `zenModels`/`goModels` + `zenGoApiKey` and carry `sourceBackend`; registry favorites resolve via `ctx.findLocalModel` and are dropped when `ctx.agent` blacklists them via `shouldHideModel` (`src/favorites-resolver.ts:73`). `buildFavoritesList(starting, favorites, ctx, max=20)` dedups (starting model + favorites), caps at `max`, and returns `{ resolved, droppedFavorites }` — **stale / unavailable favorites are silently skipped** (`src/favorites-resolver.ts:87`). Resolved favorites become catalog routes (see [PRD-005](../prd-005-local-proxy-catalog-routing/)); the Codex catalog consumes the same resolver (see [PRD-009](../prd-009-codex-integration/prd-009-codex-integration-index.md)).

### Recent models per provider

On launch, `recordLaunchSelection()` prepends the chosen model id to `recentModelsByProvider[providerId]`, dedupes, and slices to `MAX_RECENT_MODELS = 3` (`src/config.ts:99`, `src/config.ts:107`). `pickLocalModel()` reads them back, showing up to 3 with a `'recent'` hint plus a "Browse all models →" option; when there are none it goes straight to the full browse (`src/prompts.ts:311`).

### Large-catalog UX

`selectModelWithSearch()` shows a flat list when `models.length <= MODEL_SEARCH_THRESHOLD` (25), otherwise delegates to `selectLargeCatalog()` which offers search vs paginated browse at `MODEL_PAGE_SIZE` (15) per page (`src/prompts.ts:246`, `src/prompts.ts:155`). `pickModelFromPagedList()` provides prev/next paging and computes the initial page from a target model id (`src/prompts.ts:87`). Search tokenizes the query on whitespace + punctuation with AND logic across id/name/brand (`src/prompts.ts:52`).

### First-run

`needsFirstRunSetup()` returns true only when the registry is empty **and** no Zen/Go key is stored (`src/first-run.ts:21`). `runFirstRunWizard()` offers Zen quick-start (collect key → seed `zenRegistryStub('free')`), import-from-OpenCode, or set-up-your-own-provider — and every branch terminates in `continue` (launch) or explicit `cancel`, never a dead end (`src/first-run.ts:36`).

### `--dry-run`

All preference writes are gated on the caller passing `dryRun`. In dry-run, favorites load as `[]` (`src/cli.ts:761`) and the launch path skips `recordLaunchSelection`, so a fresh first-run is fully simulated without mutating `config.json`.

---

## Data Shapes

```ts
// src/types.ts:67
export interface FavoriteModel {
  providerId: string;
  modelId: string;
}

// src/types.ts:72
export interface UserPreferences {
  lastBackend?: 'zen' | 'go';
  lastModel?: string;
  lastProvider?: string;
  lastCodexProvider?: string;
  lastCodexModel?: string;
  lastGeminiProvider?: string;
  lastGeminiModel?: string;
  recentModelsByProvider?: Record<string, string[]>;
  favoriteModels?: FavoriteModel[];
  server?: {
    savedPassword?: string;
    exposedProviders?: string[];
    maskGatewayIds?: boolean;
    favoritesOnly?: boolean;
  };
}

// src/registry/types.ts:7
export type RegistrySubscriptionFilter = 'free' | 'zen' | 'go';

// src/favorites-resolver.ts:8
export interface ResolvedFavorite {
  providerId: string;
  providerName: string;
  model: LocalProviderModel | ServerModelInfo;
  apiKey: string;
  sourceBackend?: 'zen' | 'go';
}
```

---

## Acceptance Criteria

- [x] App home resolves from `RFLECTR_HOME` (or deprecated `OPENCODE_STARTER_HOME`), else `~/.rflectr` (`src/paths.ts:23`).
- [x] Config dir created `0o700`, file written `0o600` with trailing newline (`src/config.ts:61`).
- [x] `savePreferences()` shallow-merges, copying only defined keys (`src/config.ts:85`).
- [x] `recordLaunchSelection()` sets per-agent `last*` and prepends to `recentModelsByProvider`, deduped and capped at 3 (`src/config.ts:101`).
- [x] Legacy migration runs both stages, is idempotent, and renames the old conf file best-effort (`src/config.ts:34`).
- [x] `lastProvider === 'opencode'` is normalized to `'zen'` on read (`src/config.ts:70`).
- [x] Zen registry stub carries a `subscriptionFilter`, seeded `'free'` at first-run (`src/first-run.ts:31`, `src/registry/builtins.ts:7`).
- [x] `addFavorite` rejects duplicates and enforces the `MAX_MODEL_CATALOG` (20) cap (`src/favorites.ts:14`).
- [x] `rflectr models` saves favorites once on Done, only when dirty (`src/cli.ts:728`).
- [x] Favorites resolver drops stale/unavailable favorites silently and is shared across Claude/Codex/Server (`src/favorites-resolver.ts:87`).
- [x] `buildFavoritesList` dedups starting model + favorites and caps at `max` (`src/favorites-resolver.ts:103`).
- [x] `pickLocalModel` surfaces up to 3 recent models with a "Browse all" escape hatch (`src/prompts.ts:311`).
- [x] Lists above `MODEL_SEARCH_THRESHOLD` (25) switch to search/paginated browse at `MODEL_PAGE_SIZE` (15) (`src/prompts.ts:257`).
- [x] First-run wizard never dead-ends; every path returns `continue` or `cancel` (`src/first-run.ts:36`).
- [x] `--dry-run` loads favorites as `[]` and skips all preference writes (`src/cli.ts:761`).

---

## Files

| File | Role |
|------|------|
| `src/config.ts` | Read/write preferences, legacy migration, server-password keyring move, recent-models recording |
| `src/paths.ts` | App-home resolution, override hook, sibling path helpers, legacy conf path |
| `src/types.ts` | `UserPreferences`, `FavoriteModel` shapes |
| `src/favorites.ts` | Pure favorites algebra (`isFavorite`/`addFavorite`/`removeFavorite`) |
| `src/favorites-picker.ts` | Global cross-provider favorite search (`pickGlobalFavoriteModel`) |
| `src/favorites-resolver.ts` | Surface-agnostic favorite → route resolution, shared with Codex |
| `src/prompts.ts` | `pickLocalModel`, recent-models, large-catalog search/pagination |
| `src/first-run.ts` | Inline never-dead-end first-run wizard |
| `src/cli.ts` | `runModelsCommand` favorites manager; launch-time recent/favorite wiring |
| `src/constants.ts` | `BACKENDS`, `MAX_MODEL_CATALOG` |
| `src/registry/builtins.ts` | Zen/Go registry stubs carrying `subscriptionFilter` |
| `src/registry/types.ts` | `RegistrySubscriptionFilter` type |

---

## Risks & Known Limitations

- **`subscriptionTier` drift:** the field named in `CLAUDE.md` is not present in shipped code; tier filtering is registry-stub-based (`subscriptionFilter`). Documentation that references a `subscriptionTier` preference key is stale.
- **Stale favorites are invisible:** unavailable favorites (provider removed, model retired) are silently dropped at resolution time; in the `rflectr models` list they render as `★ <id> — provider gone` (`src/cli.ts:575`) but are not auto-pruned from `config.json`.
- **No schema versioning:** `config.json` has no version field; forward/backward compat relies on all keys being optional and unknown keys being tolerated.
- **Per-host only:** preferences are not synced across machines.
- **Best-effort legacy rename:** if renaming the old conf file to `…​.migrated` fails (permissions), the copy still succeeds but the stale source remains (`src/config.ts:51`).
- **Context window in switch-menu mode** reflects the launch model, not live `/model` switches — a downstream limitation of the catalog/gateway path (see [PRD-005](../prd-005-local-proxy-catalog-routing/)), not the preferences layer.

---

## Related

- **Knowledge:** [`preferences-config.md`](../../../knowledge/private/data/preferences-config.md)
- [PRD-001 — CLI Core & Launch Orchestration](../prd-001-cli-core-launch-orchestration/prd-001-cli-core-launch-orchestration-index.md) — launch flow that reads/writes these preferences
- [PRD-003 — Model Discovery & Classification](../prd-003-model-discovery-classification/) — tier-scoped model lists, `sourceBackend` merge
- [PRD-005 — Local Proxy & Catalog Routing](../prd-005-local-proxy-catalog-routing/) — catalog routes built from resolved favorites
- [PRD-009 — Codex Integration](../prd-009-codex-integration/prd-009-codex-integration-index.md) — Codex favorites catalog using the shared resolver
