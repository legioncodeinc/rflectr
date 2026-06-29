# PRD-022d: Claude Desktop Native Routing - Legacy Fallback

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (0.5-1d)
> **Schema changes:** None
> **Source:** `src/claude-app.ts`, `src/claude-desktop/app-config.ts`, `src/claude-desktop/app-session.ts`

---

## Overview

Keep the shipped Claude Desktop 3P gateway path available, but label it honestly as legacy/fallback mode. The fallback exists for unsupported native interception environments and for users who explicitly prefer the current gateway behavior.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-022d-1 | Given native verification fails, when the user views Claude Desktop options, then legacy gateway mode is available with copy explaining that it changes Claude Desktop into third-party gateway mode. |
| AC-022d-2 | Given native verification succeeds, when the user views Claude Desktop options, then native interception is the primary action and legacy gateway mode is secondary. |
| AC-022d-3 | Given legacy gateway mode is used, when rflectr writes Claude 3P config, then existing backup/restore behavior in `src/claude-desktop/app-session.ts` is preserved. |
| AC-022d-4 | Given the user asks to revert Claude Desktop, when legacy mode owns the last change, then rflectr restores the 3P config state and does not touch native CA/proxy state. |
| AC-022d-5 | Given the user asks to uninstall native interception, when legacy 3P config exists, then rflectr does not delete it unless the legacy config is owned by rflectr and the user explicitly chooses legacy revert. |
| AC-022d-6 | Given public or private docs describe Claude Desktop, when this PRD ships, then `library/knowledge/private/integrations/harnesses.md` and `library/knowledge/public/guides/claude-desktop.md` distinguish native interception from legacy 3P gateway mode. |

## Verification Evidence

Smoker evidence must include router/dashboard tests proving native success makes legacy secondary, native failure keeps legacy available, legacy revert delegates to `src/claude-desktop/app-session.ts`, native uninstall does not delete legacy config unless explicit legacy revert is chosen, and documentation diffs for the two Claude Desktop docs named in `AC-022d-6`.

## Files To Touch

- Update `src/claude-app.ts`
- Update `src/claude-desktop/app-config.ts` only if fallback labels or metadata need persisted ownership fields.
- Reuse `src/claude-desktop/app-session.ts`
- Update dashboard copy in `src/server/dashboard.ts` via PRD-023.
- Update `library/knowledge/private/integrations/harnesses.md`
- Update `library/knowledge/public/guides/claude-desktop.md` if user-facing command behavior changes.

## Implementation Notes

Do not remove the legacy path until native mode has real current verification on all intended platforms.
