# ADR-001: Data-Path Owner With Target-Specific Attach Mechanisms

> Category: Architecture | Version: 1.0 | Date: June 2026 | Status: Active

rflectr is a local data-path owner, not only a launcher or provider registry.

---

## Context

The current rflectr codebase already routes several host tools through local processes: Claude Code uses Anthropic base-url environment variables, Codex CLI uses a disposable TOML profile, Codex Desktop patches app config, Gemini CLI uses Gemini base-url environment variables, and `rflectr server` exposes a long-lived local gateway.

The imported `rflectr.old/library` clarified the missing product identity. Its `interception-targets.md` and `desktop-interception-overview.md` model rflectr as a universal interception sidecar with one constant: own the data path between an AI client and the network, then apply purposes such as routing, memory, and policy guard.

The current docs describe rflectr primarily as a launcher that "re-points" host tools at model backends. That framing is too narrow for sealed desktop apps and for future memory/policy work.

## Decision

rflectr's architecture identity is:

> rflectr owns the local data path for AI clients and chooses the least invasive attach mechanism each target supports.

rflectr has three attach classes:

| Attach class | Targets | Mechanism | Current status |
|---|---|---|---|
| Env/base-url redirect | Claude Code, Gemini CLI, other CLIs that honor env | Launch child process with scoped env vars | Current production path |
| Config/profile redirect | Codex CLI, Codex Desktop, legacy Claude Desktop 3P | Write owned profile/config overlay with backup/restore | Current production path |
| Native desktop interception | Claude Desktop, ChatGPT Desktop, other sealed apps | Local forward proxy plus per-install trusted CA, after empirical no-pinning verification | Planned by PRD-021+ |

The purposes layered onto an attached data path are:

- **Routing:** forward inference to the configured provider/gateway/model.
- **Lifecycle visibility:** expose status, health, stop, and restore controls.
- **Policy and egress controls:** restrict outbound destinations and log denied attempts where supported.
- **Memory/capture:** deferred for current rflectr, but the architecture keeps the path open.

## Consequences

- Knowledge docs and PRDs must distinguish the attach mechanism from the purpose. "Claude Desktop support" is not one thing; 3P gateway config and native interception are different attach mechanisms with different product outcomes.
- The current Claude Desktop 3P gateway config path remains a shipped legacy integration, but it is no longer the target architecture for making Claude Desktop feel native with alternate routing.
- New desktop work starts from empirical app behavior, especially proxy support and certificate pinning, before implementation.
- Dashboard Desktop Apps must expose attach mechanism, status, owned files, and revert/stop controls instead of presenting every app as a generic provider/model launcher.

## Alternatives Considered

### Keep rflectr as a provider launcher

Rejected. It explains the CLI paths but fails to account for sealed desktop apps, user trust, proxy lifecycle, and the old system's verified Windows interception path.

### Treat every app as a config-patched gateway client

Rejected for Claude Desktop. It works for some 3P/Cowork surfaces but changes the app's native behavior and creates the "funny" desktop experience seen with alternate models.

### Build only native interception and remove config/profile paths

Rejected. CLI and Codex paths work better with env/profile mechanisms. Native interception is for sealed apps where env/profile hooks do not preserve the right user experience.

## Related

- [`system-overview.md`](system-overview.md)
- [`../integrations/native-desktop-interception.md`](../integrations/native-desktop-interception.md)
- [`ADR-002-native-desktop-interception.md`](ADR-002-native-desktop-interception.md)
- `rflectr.old/library/knowledge/private/architecture/interception-targets.md`
- `rflectr.old/library/knowledge/private/architecture/desktop-interception-overview.md`
