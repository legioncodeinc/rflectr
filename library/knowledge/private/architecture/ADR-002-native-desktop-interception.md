# ADR-002: Native Desktop Interception Supersedes Claude Desktop Gateway Config

> Category: Architecture | Version: 1.0 | Date: June 2026 | Status: Active

Claude Desktop should use native desktop interception for future desktop routing work.

---

## Context

The current shipped Claude Desktop integration writes a third-party inference gateway config into the Claude 3P config library. That path is implemented in `src/claude-app.ts` and `src/claude-desktop/*`, and documented by PRD-011. It points Claude Desktop at `rflectr server` over `/anthropic`.

That implementation is useful, but it changes Claude Desktop into a 3P gateway client. The old rflectr design had a different approach for sealed desktop apps: leave the app on its normal provider connection, then attach with a local proxy plus trusted CA. The Windows Phase 0 spike in `rflectr.old/library/requirements/backlog/prd-009-desktop-memory-target/qa/2026-06-17-phase0-windows-spike.md` found Claude Desktop and ChatGPT Desktop both interceptable on Windows with no certificate pinning.

The user-visible issue is clear: routing alternate models through Claude Desktop's 3P gateway mode can make the app behave unlike native Claude Desktop. Native interception preserves more of the app's own expected request flow.

## Decision

Future Claude Desktop support will move to native desktop interception:

1. Run a local forward proxy on loopback.
2. Install or reuse a per-install rflectr CA with explicit user consent.
3. Route only Claude Desktop's provider traffic through the proxy where the OS/app permits it.
4. Verify each app/OS pair empirically before enabling it.
5. Let the proxy observe and route the app's normal Anthropic traffic rather than forcing Claude Desktop into 3P gateway mode.

The shipped 3P gateway config implementation becomes a legacy compatibility path. It may remain available as `claude-app --legacy-gateway` or equivalent, but it must not be treated as the primary future path in dashboard, PRDs, or knowledge docs.

## Consequences

- PRD-011 is marked superseded for future Claude Desktop routing by PRD-021 and PRD-022.
- PRD-020f's Claude Desktop config/revert controls are superseded by native desktop install/stop/uninstall/revert controls. Its Codex Desktop parts remain valid.
- New code must add a desktop proxy subsystem instead of extending `src/claude-desktop/app-config.ts` as the primary path.
- Dashboard Desktop Apps must show "Native interception" status separately from "Legacy gateway config" status.
- The implementation must preserve chat usability: if proxy, routing, policy, or future memory work fails, the user gets a clear disabled/stopped state or pass-through mode, not a silently broken app.

## Alternatives Considered

### Keep improving the 3P gateway config

Rejected as the primary path. It can be made safer with better restore controls, but it does not solve the native app behavior mismatch.

### Native interception for ChatGPT Desktop first

Rejected for this adoption phase. The current user pain is Claude Desktop. ChatGPT Desktop remains a future target after the platform exists.

### MCP-only Claude Desktop support

Rejected for routing. MCP is discretionary and cannot guarantee capture, injection, or routing on every turn.

## Related

- [`../integrations/native-desktop-interception.md`](../integrations/native-desktop-interception.md)
- [`ADR-001-data-path-owner-attach-mechanisms.md`](ADR-001-data-path-owner-attach-mechanisms.md)
- [`ADR-003-local-trust-egress-consent.md`](ADR-003-local-trust-egress-consent.md)
- `rflectr.old/library/knowledge/private/integrations/desktop-app-interception.md`
- `rflectr.old/library/requirements/backlog/prd-009-desktop-memory-target/qa/2026-06-17-phase0-windows-spike.md`
