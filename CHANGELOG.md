# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-28

### Added

- **Portkey AI gateway integration.** Add Portkey via `rflectr providers add` → Portkey with a single master API key. rflectr calls Portkey's control-plane API to list your **Configs**, **Virtual Keys / Integrations**, and **Models** for selection, then routes Claude Code, Codex, Gemini, and `rflectr server` through the Portkey gateway. Portkey models register as openai-format (`@ai-sdk/openai-compatible` against `api.portkey.ai/v1`) and reuse the existing SDK adapter.
- **Per-route custom HTTP headers.** A reusable primitive threaded from the registry through the local proxy, SDK adapter (`createOpenAICompatible({ headers })`), Anthropic passthrough (`relayAnthropicMessages`), and the Codex/Gemini route builders — enabling header-routed providers like Portkey.
- Model-list refresh support for Portkey (`portkey-api` model source), including config / virtual-key / individual-model routing modes.

### Security

- The Portkey master key (`x-portkey-api-key`) is **never** written to `providers.json` — it lives in the OS keyring and is injected into request headers only at materialization, and is redacted in trace logs.
- `GET /models` on `rflectr server` strips both `apiKey` and routing `headers`, so the materialized key is never exposed in an HTTP response.
- Routing-header slug values (config / virtual-key / provider) are sanitized against CR/LF and control-character header injection.

### Fixed

- Server `LanguageModel` cache key now includes routing headers, so two Portkey routes that differ only by Config/Virtual Key no longer reuse the wrong cached model.
- Portkey refresh reports a real failure on non-auth (network / 5xx) errors instead of silently reporting stale-cache success, and individual-mode refresh no longer expands the user's explicit model selection.

> Releases prior to 0.2.0 predate this changelog; see the git history and GitHub Releases for v0.1.0–v0.1.2.
