# PRD-023c: Desktop Apps Native Controls - Status and Diagnostics

> **Status:** Backlog
> **Priority:** P0
> **Effort:** M (0.5-1d)
> **Schema changes:** None
> **Source:** `src/server/dashboard.ts`, PRD-021c, PRD-021d, PRD-022a

---

## Overview

Surface native desktop status and diagnostics in the dashboard without leaking secrets or making the browser unstable. Status should help the user understand what is installed, what is running, what is verified, and what is currently routed.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-023c-1 | Given Desktop Apps polls status, when native mode is stopped, then status shows installed/not-installed, verified/not-verified, and last error separately. |
| AC-023c-2 | Given native mode is running, when status renders, then it shows local port, supported hosts, selected provider/model, and active route age. |
| AC-023c-3 | Given verification has never run, when status renders, then the dashboard asks for verification before install/start. |
| AC-023c-4 | Given verification is stale because OS or Claude Desktop version changed, when status renders, then it asks for re-verification. |
| AC-023c-5 | Given egress denies a host, when diagnostics render, then the host and denial category are shown but request bodies and auth headers are not shown. |
| AC-023c-6 | Given provider credentials fail, when diagnostics render, then the provider id/name and safe error class are shown but the API key is never shown. |
| AC-023c-7 | Given a modal, focused input, or provider credential edit is active, when status polling completes, then the page does not steal focus, reset typed values, or bounce. |
| AC-023c-8 | Given dashboard receives an unknown status field from a newer runtime, when it renders, then it ignores the field safely rather than failing the whole page. |

## Verification Evidence

Smoker evidence must include typed DTO tests for native stopped/running status, verification-needed and re-verification-needed states, safe diagnostics for denied egress and provider credential failures, polling focus preservation browser smoke, unknown-field render tolerance, and redaction snapshots proving request bodies, auth headers, prompts, response bodies, and API keys are absent.

## Files To Touch

- Update `src/server/dashboard.ts`
- Update `src/server/router.ts`
- Add or reuse PRD-021-owned `src/desktop-interception/egress.ts` after the PRD-021 transplant lands.
- Add or reuse PRD-021/PRD-022-owned `src/desktop-interception/verify.ts` after verification exists.
- Add or reuse PRD-021-owned `src/desktop-interception/state.ts` after owned install/runtime state exists.
- Extend `tests/server-dashboard.test.ts`
- Extend `tests/server-router.test.ts`

## Implementation Notes

Status DTOs should be typed and intentionally small. Do not return captured request or response bodies to the dashboard.
