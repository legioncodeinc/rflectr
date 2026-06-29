# PRD-022a: Claude Desktop Native Routing - Verification

> **Status:** Backlog
> **Priority:** P0
> **Effort:** M (0.5-1d)
> **Schema changes:** None
> **Source:** `rflectr.old/library/requirements/backlog/prd-009-desktop-memory-target/qa/2026-06-17-phase0-windows-spike.md`, `src/claude-desktop/app-launch.ts`

---

## Overview

Build a current verification gate for Claude Desktop native interception. The old Windows spike is useful evidence, but it is not enough to enable the feature against the current Claude Desktop binary.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-022a-1 | Given verification starts, when Claude Desktop is not installed, then the result is `not_installed` and no proxy or CA setting is changed. |
| AC-022a-2 | Given Claude Desktop is installed on Windows, when the user performs the test turn, then rflectr records whether `api.anthropic.com` and `claude.ai` traffic reaches the local proxy. |
| AC-022a-3 | Given Claude Desktop is installed on macOS, when the user performs the test turn, then rflectr records whether the app honors the configured proxy and trust store. |
| AC-022a-4 | Given a connection fails due to certificate pinning or trust refusal, when verification completes, then the support state is `pinned_or_trust_refused` and native mode remains disabled. |
| AC-022a-5 | Given verification succeeds, when status is stored, then it includes OS, Claude Desktop version when discoverable, timestamp, host coverage, and whether the result came from live verification rather than old docs. |
| AC-022a-6 | Given verification data is stale because OS name/version, Claude Desktop version, support host set, or trust/proxy mechanism changed, when enablement is requested, then native mode requires re-verification before enablement. |
| AC-022a-7 | Given verification emits logs, when viewed in dashboard or CLI, then cookies, authorization headers, prompt bodies, and API keys are redacted. |

## Verification Evidence

Smoker evidence must include verification fixtures for `not_installed`, observed Windows hosts, observed macOS proxy/trust behavior, `pinned_or_trust_refused`, successful live verification, stale verification, and redacted logs. Fixtures must record OS, Claude Desktop version when discoverable, timestamp, host coverage, live-vs-docs evidence source, and enablement decision.

## Files To Touch

- Add `src/desktop-interception/claude-target.ts`
- Add `src/desktop-interception/verify.ts`
- Reuse `src/claude-desktop/app-launch.ts`
- Add `tests/desktop-claude-target.test.ts`
- Add `tests/desktop-interception-verify.test.ts`

## Implementation Notes

Do not treat the old Windows spike as current support. It should prefill expected hosts and test design only.

### Transplant Notes

The old Windows spike proves the old design was plausible on June 17, 2026; it does not prove the current Claude Desktop app, OS proxy path, or trust behavior. Verification must run against the current machine/app before native controls are enabled.

The first verification implementation may use the transplanted PRD-021a transport in a non-routing probe mode. It should answer only:

- Does the app honor the local proxy?
- Does the app accept the local CA?
- Which hosts are observed?
- Is the connection pinned, ignored, or blocked?

It should not route real prompts to alternate providers until PRD-022b and PRD-022c pass.
