# PRD-019a: Dashboard Settings - Subscription and Default Tool

> **Status:** Backlog
> **Priority:** P2
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`SettingsScreen` subscription and default tool cards)

---

## Overview

Implement the modeled Settings controls for subscription tier and default tool. Subscription tier should align with existing rflectr tier semantics. Default tool requires a final persistence decision before implementation.

## Goals

- Display current subscription tier across `free`, `zen`, `go`, and `both` where applicable.
- Persist tier updates through existing preference/config mechanisms.
- Display default tool options: Claude Code, Codex, Gemini CLI, and Cursor if supported.
- Persist default tool only after the storage contract is clarified.

## Non-Goals

- Changing subscription entitlement logic.
- Launching the selected tool from Settings.
- Adding new tool integrations.

## User Stories

- As a user, I want to update which OpenCode plan rflectr routes through.
- As a user, I want to choose what bare `rflectr` should launch.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-019a-1 | Given settings load, when rendered, then the current subscription selection is active. |
| AC-019a-2 | Given the user changes subscription tier, when saving succeeds, then subsequent catalog loads use the selected tier. |
| AC-019a-3 | Given default tool storage is implemented, when the user selects a tool, then bare `rflectr` uses that tool on the next launch. |
| AC-019a-4 | Given a tool is unsupported on the current platform, when Settings renders, then it is disabled or omitted with clear reasoning. |

## Implementation Notes

- Existing docs note `subscriptionFilter` on the registry's Zen provider stub rather than `subscriptionTier` in `UserPreferences`; implementation must honor that.
- Do not invent a default-tool persistence key without checking existing CLI behavior.

## Test Plan

- Unit-test tier mutation updates the same config path used by CLI flows.
- Component-test active selector state and disabled platform-specific tools.

## Open Questions

- [ ] What is the canonical persisted field for default tool?
- [ ] Should `both` remain a dashboard-visible tier if the current registry configuration only stores `free`, `zen`, or `go`?
