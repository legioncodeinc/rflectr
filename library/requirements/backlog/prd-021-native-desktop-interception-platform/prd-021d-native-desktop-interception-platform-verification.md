# PRD-021d: Native Desktop Interception Platform - Verification Harness

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Source:** `rflectr.old/library/requirements/backlog/prd-009-desktop-memory-target/qa/2026-06-17-phase0-windows-spike.md`

---

## Overview

Recreate the old Phase 0 discipline in the current repo: every app/OS pair must be verified for proxy honoring, certificate pinning, host list, and request/response shape before it becomes an enabled target.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-021d-1 | Given verification runs on Windows with Claude Desktop installed, when the user performs a test turn, then rflectr records whether `api.anthropic.com` and `claude.ai` are interceptable, pinned, or proxy-ignored. |
| AC-021d-2 | Given macOS verification has not run, when macOS install is requested, then status remains unverified rather than assuming Windows results apply. |
| AC-021d-3 | Given verification captures payload samples, when samples are saved, then secrets are redacted and full prompts are not stored unless the user explicitly chooses a documented debug capture mode that is off by default, records consent timestamp, and stores only synthetic-test or user-approved payload samples. |
| AC-021d-4 | Given a result is stale because the recorded `{ appName, appVersion, osName, osVersion }` no longer matches the current detected tuple, when status is requested, then the dashboard shows re-verify required. |
| AC-021d-5 | Given the harness cannot observe a chat send endpoint, when it completes, then it reports incomplete evidence and blocks enablement. |

## Verification Evidence

Smoker evidence must include `tests/desktop-interception-verify.test.ts` fixtures for interceptable, pinned, proxy-ignored, stale, debug-capture-disabled, debug-capture-consented, and incomplete-evidence outcomes. Manual OS verification may supplement these tests, but enablement remains blocked unless a saved fixture records OS, app name, app version, observed hosts, support state, and redaction result.

## Files To Touch

- Add `src/desktop-interception/verify.ts`
- Add `src/desktop-interception/app-targets.ts`
- Add `tests/desktop-interception-verify.test.ts`
- Add a manual runbook under `library/knowledge/private/operations/` only if implementation needs operator steps.
