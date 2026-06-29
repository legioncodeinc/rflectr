# PRD-021b: Native Desktop Interception Platform - Trust and Install State

> **Status:** Backlog
> **Priority:** P0
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Source:** `rflectr.old/src/desktop/ca.ts`, `rflectr.old/library/knowledge/private/security/desktop-egress-and-trust.md`

---

## Overview

Implement reversible local trust and proxy-setting ownership for native desktop interception. The platform must know what it owns, what it can uninstall, and when to refuse unsafe cleanup.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-021b-1 | Given install begins, when consent has not been recorded for this action, then no CA or proxy setting is changed. |
| AC-021b-2 | Given a CA is created, when stored, then the private key is written only to an rflectr-owned per-install path with user-only permissions/ACLs, is never world/group-readable, fails closed if permissions cannot be enforced, and is not copied into dashboard payloads, logs, fixtures, PRDs, or test snapshots. |
| AC-021b-3 | Given Windows install succeeds, when status is requested, then rflectr reports `{ caPresent, caTrusted, proxyConfigured, proxyOwnerInstallId, recoverablePartialState }`. |
| AC-021b-4 | Given macOS is unverified or unsupported, when install is requested, then the platform returns `verification_required` or `unsupported` without partial installation. |
| AC-021b-5 | Given uninstall is requested, when rflectr owns the CA/proxy setting, then it removes only owned trust/proxy artifacts. |
| AC-021b-6 | Given uninstall is requested and ownership cannot be proven, then rflectr refuses destructive cleanup and returns manual recovery guidance containing the owned install id if known, affected file paths/settings, and a non-destructive manual cleanup checklist. |
| AC-021b-7 | Given install is interrupted, when status is checked later, then partial owned state is detectable and recoverable. |

## Verification Evidence

Smoker evidence must include mocked Windows and unsupported macOS trust/proxy tests in `tests/desktop-interception-trust.test.ts`. Evidence must show no mutation without consent, private-key path ownership and user-only permissions/ACL assertions on each supported OS, closed failure on insecure permissions, no private key in dashboard/log/fixture output, exact status DTO assertions, idempotent uninstall behavior, not-owned refusal, and recoverable partial-state fixtures using synthetic install ids and synthetic file paths.

## Files To Touch

- Add `src/desktop-interception/trust.ts`
- Add `src/desktop-interception/os-proxy.ts`
- Add `src/desktop-interception/state.ts`
- Add `tests/desktop-interception-trust.test.ts`
- Reuse patterns from `src/codex/app-session.ts` and `src/claude-desktop/app-session.ts`.

## Transplant Notes

`rflectr.old/src/desktop/ca.ts` is a reference, not an automatic first-slice import. The immediate transplant from PRD-021a can run against existing CA files supplied to `mockttp`; this PRD owns creating, installing, trusting, tracking, and uninstalling those files.

Do not implement this PRD by shelling out from the old standalone desktop entrypoint. Trust state must be represented as current rflectr-owned state with:

- a unique install id,
- exact owned file paths,
- OS proxy state before/after snapshots,
- install timestamp,
- verified target app and OS,
- idempotent uninstall status.

No dashboard Install button should become active until these ownership fields exist and are tested.
