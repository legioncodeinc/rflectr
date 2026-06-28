# PRD-006: Credential Storage & API Key Management *(Retroactive)*

> **Status:** Shipped
> **Priority:** —
> **Effort:** —
> **Written:** June 2026
> **Retroactive:** Yes — written after implementation (rflectr v0.2.7).
> **Source:** `src/key-setup.ts`, `src/registry/auth-broker.ts`, `src/registry/provider-auth.ts`

---

## Overview

`rflectr` re-points Claude Code / Codex / Gemini at alternative model backends, which means it must hold API keys and OAuth tokens for the OpenCode Zen/Go cloud backend and for every registry provider. This PRD documents the credential subsystem: where secrets live, how they are resolved at launch, the interactive key-collection flow, and the per-platform save options.

The design principle is **secrets never touch the config files**. `providers.json` and `config.json` hold only an `authRef` pointer; the actual secret lives in an environment variable, the OS keyring (via `@napi-rs/keyring`), or — only when the user opts in — a plaintext shell profile / persistent env var. The OS keyring is the default everywhere it is available, and a missing native keyring binary degrades gracefully rather than crashing because the module is loaded through a dynamic `import()` (`src/env.ts:141`, `src/env.ts:155`).

This is the security-critical surface of the project. The canonical narrative lives in the knowledge base at [`../../../knowledge/private/security/credential-storage.md`](../../../knowledge/private/security/credential-storage.md).

---

## What Was Built

- A cross-platform OS credential store backed by `@napi-rs/keyring` (service `rflectr`), with `getPassword` / `setPassword` / `deletePassword` wrappers that never throw — failures are classified into human-readable reasons by `classifyKeyringError()` (`src/env.ts:73`).
- A silent startup read: `resolveOrCollectApiKey()` first calls `resolveApiKey()` and then `readFromCredentialStore()` so that when a key already exists no prompt is shown (`src/key-setup.ts:38`, `src/key-setup.ts:58`).
- An interactive key-collection prompt for the OpenCode Zen/Go key with **platform-specific save options** (macOS / Windows / Linux desktop / Linux headless), implemented in `resolveOrCollectApiKey()` (`src/key-setup.ts:86`–`src/key-setup.ts:185`).
- Immediate session activation: `process.env['OPENCODE_API_KEY']` is set the moment a key is resolved or collected, regardless of the persistence choice (`src/key-setup.ts:62`, `src/key-setup.ts:187`).
- A layered resolution order for *provider* keys via `resolveProviderCredential(providerId, authRef)`: namespaced env var → `env:`-ref → `global:opencode` chain → per-provider keyring account (`src/env.ts:241`).
- A keyring migration protocol (read → write → verify → delete) that lifts legacy `rflectr` / `opencode-starter` entries into the canonical `global:opencode` account only after the new entry verifies (`src/env.ts:199`).
- An OAuth auth broker that delegates login to the OpenCode CLI and copies the resulting tokens into the rflectr keychain (`src/registry/auth-broker.ts:17`), plus a native-vs-broker selector (`src/registry/provider-auth.ts:151`).
- Key validation before import: `validateImportKey()` rejects placeholder/empty/invalid keys by actually probing the provider's model endpoint (`src/registry/validate-import-key.ts:30`).

---

## Goals

- Keep secrets out of plaintext config files; store only an `authRef` pointer in the registry.
- Default to the OS-native secure store on every platform, and degrade gracefully when it is unavailable.
- Never block startup on a missing native module — keyring failures are caught and surfaced as diagnostics, not crashes.
- Resolve a usable key at launch with a deterministic, documented priority order.
- Make the key active for the *current* session immediately, independent of where (or whether) it is persisted.
- Validate provider keys before importing them so the registry never holds a known-bad credential.

## Non-Goals

- A custom encryption-at-rest scheme — the OS keyring is the trust anchor.
- Server-mode network authentication — the `server` command's password gate is owned by PRD-012 (`src/server/auth.ts`).
- OAuth device-flow mechanics themselves — token acquisition is PRD-007; this PRD covers only how the resulting tokens are *stored and resolved*.
- Rotating or expiring API keys on a schedule.

---

## Features

| # | Feature | Source |
|---|---------|--------|
| F1 | `@napi-rs/keyring` OS credential store via dynamic `import()` (graceful degrade) | `src/env.ts:139`–`src/env.ts:173` |
| F2 | Silent startup read — no prompt when a key already exists | `src/key-setup.ts:38`, `src/key-setup.ts:58` |
| F3 | Per-platform save options (macOS / Windows / Linux desktop / headless) | `src/key-setup.ts:86`–`src/key-setup.ts:185` |
| F4 | `OPENCODE_API_KEY` set in `process.env` immediately, regardless of save choice | `src/key-setup.ts:62`, `src/key-setup.ts:187` |
| F5 | Layered provider-key resolution (`resolveProviderCredential`) | `src/env.ts:241` |
| F6 | `global:opencode` fallback chain (env → keyring → legacy services) | `src/env.ts:176` |
| F7 | Legacy-entry migration (read → write → verify → delete) | `src/env.ts:199` |
| F8 | Keyring error classification (never throws) | `src/env.ts:73` |
| F9 | Secret Service availability probe (Linux) | `src/env.ts:367`, `src/key-setup.ts:79` |
| F10 | OAuth broker → keychain copy | `src/registry/auth-broker.ts:17`, `src/registry/provider-auth.ts:160` |
| F11 | Pre-import key validation (placeholder / invalid / manual-auth) | `src/registry/validate-import-key.ts:30` |
| F12 | `--dry-run` simulates save without writing | `src/key-setup.ts:123`–`src/key-setup.ts:133` |

---

## Architecture & Implementation

### Where secrets live

Secrets are never written to `providers.json` or `config.json` — those hold only an `authRef` pointer. The actual secret lives in one of three places (`src/env.ts:241`):

1. **Env var** — the namespaced `RFLECTR_KEY_<PROVIDER_ID_UPPER>` (highest priority, `rflectrKeyEnvVar()` at `src/env.ts:129`), or whatever `env:VAR_NAME` the `authRef` names (`src/env.ts:252`).
2. **OS keyring** — service `rflectr` via `@napi-rs/keyring`. Accounts: `provider:<id>` (`src/env.ts:96`), `oauth:provider:<id>` (`src/env.ts:100`, a JSON `StoredOAuthCredential`), and `global:opencode` (`src/env.ts:94`).
3. **Legacy keyring entries** — `rflectr` / `opencode-starter` accounts, auto-migrated on first successful read (`src/env.ts:199`).

### Key resolution order

For a **provider** key, `resolveProviderCredential(providerId, authRef, diag?)` resolves in this order (`src/env.ts:241`):

1. Namespaced env var `RFLECTR_KEY_<ID>` (`src/env.ts:246`).
2. If `authRef` is an `env:` ref → read that env var (`src/env.ts:252`).
3. If the keyring account is `global:opencode` → run the `readGlobalOpencodeCredential()` chain (`src/env.ts:256`).
4. Otherwise → read the per-provider keyring account, decoding/refreshing OAuth JSON if present (`src/env.ts:260`, `src/env.ts:324`).

For the shared **OpenCode Zen/Go** key, `readGlobalOpencodeCredential()` tries, in order (`src/env.ts:176`): `OPENCODE_API_KEY` env (`resolveApiKey()`, `src/env.ts:20`) → keyring `global:opencode` → legacy keyring `rflectr` → oldest legacy service `opencode-starter`. On a successful legacy read, `migrateGlobalOpencodeCredential()` rewrites it to `global:opencode` using a read → write → verify → delete protocol — the old entry is deleted only after the new one verifies (`src/env.ts:217`–`src/env.ts:233`).

### Per-platform storage matrix

`resolveOrCollectApiKey()` builds the option list per platform (`src/key-setup.ts:86`). The default selection is keychain/credential-manager/secret-service where available, else profile (`src/key-setup.ts:118`).

| Platform | Options | Source |
|----------|---------|--------|
| **macOS** | Keychain only · Keychain + `~/.zshrc` (or profile) auto-load · shell profile (plaintext) · session only | `src/key-setup.ts:87`–`src/key-setup.ts:93` |
| **Windows** | Windows Credential Manager · `setx` user env var (plaintext) · session only | `src/key-setup.ts:95`–`src/key-setup.ts:100` |
| **Linux desktop** | Secret Service (GNOME Keyring / KWallet) · shell profile (plaintext) · session only | `src/key-setup.ts:103`–`src/key-setup.ts:111` |
| **Linux headless** | shell profile · session only — shown with a note explaining why secure storage is unavailable | `src/key-setup.ts:105`–`src/key-setup.ts:111` |

Notes grounded in code:

- The macOS auto-load line uses the `security` CLI directly so the shell can source it (`src/key-setup.ts:143`): `export OPENCODE_API_KEY="$(security find-generic-password -s rflectr -a global:opencode -w 2>/dev/null)"`. It is appended only if not already present (`src/key-setup.ts:145`).
- `setx` is invoked with piped stdio (`stdio: ['pipe','pipe','pipe']`) to suppress its "SUCCESS" stdout (`src/key-setup.ts:164`).
- Secret Service availability is probed with a test `getPassword()` against a throwaway `rflectr-probe` entry (`isSecretServiceAvailable()`, `src/env.ts:367`); if the daemon isn't running the secure option is hidden and a note is shown (`src/key-setup.ts:103`–`src/key-setup.ts:107`).
- `detectShellProfile()` chooses the right profile file per platform/shell — `~/.zshrc`, `~/.bash_profile`, `~/.bashrc`, or `~/.profile` (`src/key-setup.ts:21`).
- The plaintext shell-profile path single-quotes and escapes the key before appending (`src/key-setup.ts:179`–`src/key-setup.ts:180`).

### Immediate session activation

In every code path — found in store, freshly pasted, or save failed — `process.env['OPENCODE_API_KEY']` is set so the key is live for the current process: at the store-hit branch (`src/key-setup.ts:62`) and at the end of collection (`src/key-setup.ts:187`). This is the one documented mutation of the parent environment; `buildChildEnv()` otherwise only mutates the child (`src/env.ts:48`).

### Graceful degradation

Every keyring operation goes through `readKeyringAccount` / `writeKeyringAccount` / `deleteKeyringAccount`, each wrapping a dynamic `import('@napi-rs/keyring')` in try/catch and routing failures through `classifyKeyringError()` into a `diag?` callback (`src/env.ts:139`–`src/env.ts:173`). A missing native binary therefore yields a warning ("native keyring module not available"), not a crash. `@napi-rs/keyring` ships as an `optionalDependency` and is marked `external` in the bundle so it resolves from `node_modules` at runtime.

### OAuth token storage

OAuth tokens are stored in the same keyring under `oauth:provider:<id>` as a serialized `OpencodeOAuthCredential` JSON (`oauthCredentialToKeychainJson()`, `src/registry/opencode-auth.ts:110`). `authenticateProvider()` saves them via `saveProviderCredential(oauthAuthRef(registryId), …)` (`src/registry/provider-auth.ts:160`, `src/registry/provider-auth.ts:194`) and warns — without failing — if the write doesn't land. The broker path (`runOpencodeAuthBroker()`, `src/registry/auth-broker.ts:17`) delegates the actual login to `opencode auth login`, then reads the token back out of OpenCode's `auth.json` (`src/registry/opencode-auth.ts:80`). On resolution, OAuth JSON in a keyring account is decoded and, when near expiry, refreshed in place (`src/env.ts:290`, `src/env.ts:324`). The acquisition mechanics are PRD-007.

### Key validation before import

`validateImportKey()` (`src/registry/validate-import-key.ts:30`) gates registry imports: OAuth providers pass through (`:34`); empty keys are rejected (`:38`); gcloud/AWS/Azure providers are flagged `untested-manual` (`:44`); otherwise the key is probed against the provider's real model endpoint and rejected as `placeholder-key` or `invalid-key` if the API refuses it (`:83`–`:107`). Placeholder keys are recognized by `isLikelyPlaceholderKey()` / `isPlaceholderProviderKey()` (`src/registry/refresh-credentials.ts:25`, `:30`), and a small env-fallback table lets `anthropic`/`openai` fall back to their standard SDK env vars when OpenCode supplied only a placeholder (`src/registry/refresh-credentials.ts:20`, `:56`).

---

## Security Considerations

- **Plaintext options are opt-in and clearly labelled.** The `setx` and shell-profile choices write the key in cleartext; their prompt hints say so explicitly ("plaintext", "visible in System Properties → Environment Variables") (`src/key-setup.ts:91`, `src/key-setup.ts:98`, `src/key-setup.ts:109`). The default selection is always the secure store when available (`src/key-setup.ts:118`).
- **Keyring is the default trust anchor.** Secrets live in the OS keyring by default; config files hold only `authRef` pointers (`src/env.ts:241`).
- **The provider's real key never reaches the child when proxying** — the child gets a proxy token while the local proxy holds the real key (env contract, PRD-001 / PRD-005). Confirmed by `buildChildEnv()` setting `ANTHROPIC_API_KEY` to whatever caller passes — the proxy token on proxy routes (`src/env.ts:55`).
- **What is never logged:** the key value itself is never written to the trace log. The trace path uses `writeSecureLogLine()` and logs only the *reason* string from a keyring diagnostic, never the secret (`src/key-setup.ts:52`–`src/key-setup.ts:56`). Dry-run output masks the value (`setx OPENCODE_API_KEY ***`, `src/key-setup.ts:128`). The interactive prompt uses `p.password()` so the paste is not echoed (`src/key-setup.ts:69`).
- **Migration is non-destructive on failure.** The legacy entry is deleted only after the new `global:opencode` entry reads back identical; a verification mismatch keeps the legacy entry and warns (`src/env.ts:220`–`src/env.ts:224`).
- **OAuth file permission hygiene.** When reading OpenCode's `auth.json`, a warning is emitted if the file is group/world-readable (`authFilePermissionWarning()`, `src/registry/opencode-auth.ts:66`).
- **`--dry-run` writes nothing.** All persistence branches are skipped and replaced by `[dry-run]` log lines (`src/key-setup.ts:123`).

---

## Acceptance Criteria

- [x] Secrets are stored in the OS keyring (or opt-in plaintext), never in `providers.json` / `config.json` — registry holds only `authRef` (`src/env.ts:241`).
- [x] `@napi-rs/keyring` is loaded via dynamic `import()` and a missing native binary degrades gracefully without crashing (`src/env.ts:141`, `src/env.ts:155`).
- [x] On startup, an existing key is read silently and no prompt is shown (`src/key-setup.ts:38`, `src/key-setup.ts:58`).
- [x] macOS offers 4 save options (Keychain · Keychain + auto-load · profile · session) (`src/key-setup.ts:87`).
- [x] Windows offers 3 save options (Credential Manager · `setx` · session) (`src/key-setup.ts:95`).
- [x] Linux desktop offers Secret Service · profile · session; headless offers profile · session with an explanatory note (`src/key-setup.ts:103`).
- [x] `process.env['OPENCODE_API_KEY']` is set immediately on resolve/collect regardless of save choice (`src/key-setup.ts:62`, `src/key-setup.ts:187`).
- [x] Provider keys resolve via the documented order: namespaced env → `env:`-ref → `global:opencode` chain → per-provider keyring (`src/env.ts:241`).
- [x] Legacy keyring entries migrate via read → write → verify → delete (`src/env.ts:199`).
- [x] OAuth tokens are stored in the keychain and warn (not fail) on write failure (`src/registry/provider-auth.ts:160`, `:195`).
- [x] Provider keys are validated against the live endpoint before import; placeholder/invalid keys are rejected (`src/registry/validate-import-key.ts:30`).
- [x] The key value is never written to the trace log (only the diagnostic reason) and is masked in dry-run output (`src/key-setup.ts:55`, `src/key-setup.ts:128`).
- [x] `--dry-run` performs no writes (`src/key-setup.ts:123`).

---

## Files

| File | Role |
|------|------|
| `src/key-setup.ts` | Interactive Zen/Go key collection, per-platform save options, shell-profile detection, dry-run simulation |
| `src/env.ts` | Credential store wrappers, `resolveProviderCredential`, `global:opencode` chain, migration, `classifyKeyringError`, `isSecretServiceAvailable`, `buildChildEnv` env contract |
| `src/registry/auth-broker.ts` | Delegate OAuth login to OpenCode CLI, read token back from `auth.json` |
| `src/registry/provider-auth.ts` | Native-vs-broker OAuth selector; saves tokens to keychain; upserts registry provider |
| `src/registry/opencode-auth.ts` | Read/decode OpenCode `auth.json`; OAuth JSON (de)serialization; file-permission warning |
| `src/registry/refresh-credentials.ts` | Placeholder-key detection; env-fallback table for refresh |
| `src/registry/validate-import-key.ts` | Pre-import key validation against live endpoints |
| `src/cli.ts` | Calls `resolveOrCollectApiKey` / `readGlobalOpencodeCredential` in the launch flow (`src/cli.ts:13`, `:888`) |

---

## Risks & Known Limitations

- **Plaintext persistence is user-selectable.** `setx` and shell-profile options store the key in cleartext by design, for users without a working keyring. Mitigated by clear labelling and a secure default (`src/key-setup.ts:91`, `:98`, `:109`).
- **Keyring dependency is optional and native.** If `@napi-rs/keyring` fails to load, no secure storage is available and the user is steered to session-only or plaintext (`src/env.ts:141`). The probe (`src/env.ts:367`) catches this on Linux before showing the option.
- **OAuth broker requires the OpenCode CLI.** Providers without native OAuth and without OpenCode installed cannot complete broker login (`src/registry/auth-broker.ts:22`, `src/registry/provider-auth.ts:167`).
- **gcloud/AWS/Azure providers are not importable by API key.** They are flagged `untested-manual` and must be configured via OpenCode env auth (`src/registry/validate-import-key.ts:44`).
- **Server-mode exposure.** When the `server` command binds beyond localhost, its single password is the only gate — out of scope here, owned by PRD-012.

---

## Related

- Knowledge: [`../../../knowledge/private/security/credential-storage.md`](../../../knowledge/private/security/credential-storage.md) — credential storage & environment isolation narrative.
- [PRD-001 — CLI Core & Launch Orchestration](../prd-001-cli-core-launch-orchestration/prd-001-cli-core-launch-orchestration-index.md) — the `buildChildEnv()` env contract and scrubbed child environment.
- [PRD-002 — Provider Registry](../prd-002-provider-registry/prd-002-provider-registry-index.md) — the registry that stores per-provider `authRef` pointers and triggers import-time validation.
- [PRD-007 — OAuth Device Flows](../prd-007-oauth-device-flows/prd-007-oauth-device-flows-index.md) — the other credential path: how OAuth tokens are *acquired* before they land in the keychain documented here.
