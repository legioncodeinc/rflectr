# PRD-023a: Desktop Apps Native Controls - Tab

> **Status:** Backlog
> **Priority:** P0
> **Effort:** M (0.5-1d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/chrome.jsx`, `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx`

---

## Overview

Create the `Desktop Apps` dashboard tab as the single home for desktop app integrations. The layout must avoid the squished card problem and must not mix Claude native interception, Claude legacy gateway, and Codex config controls into one ambiguous box.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-023a-1 | Given the dashboard loads, when the route list is rendered, then `Desktop Apps` is present with a stable route id and active-state behavior. |
| AC-023a-2 | Given the user opens `Desktop Apps`, when content renders, then the main layout uses wide sections or cards with enough horizontal space for provider/model controls. |
| AC-023a-3 | Given Claude Desktop Native Interception renders, when native state is `not_installed`, `not_verified`, `verification_required`, `install_blocked`, or `route_blocked`, then that state and its prerequisite reason are visible without hiding legacy gateway fallback. |
| AC-023a-4 | Given Claude Legacy Gateway renders, when the user reads the card, then it is labeled as legacy/fallback and does not imply native app behavior. |
| AC-023a-5 | Given Codex Desktop renders, when the user reads the card, then it describes config/profile routing rather than native interception. |
| AC-023a-6 | Given a mobile/narrow viewport, when action rows wrap, then buttons retain readable labels and no card content overlaps. |
| AC-023a-7 | Given Settings still renders, when Desktop Apps exists, then desktop app launch/config/revert workflows are not duplicated in Settings. |

## Verification Evidence

Smoker evidence must include `tests/server-dashboard.test.ts` route/nav assertions, Desktop Apps section render assertions, responsive markup/browser smoke for wide and narrow layouts, and a regression assertion that existing Settings behavior remains available until Desktop Apps replacement behavior is verified and not duplicated afterward.

## Files To Touch

- Update `src/server/dashboard.ts`
- Update `tests/server-dashboard.test.ts`

## Implementation Notes

Follow the UI kit's operational dashboard feel. Avoid marketing copy and avoid nested cards.
