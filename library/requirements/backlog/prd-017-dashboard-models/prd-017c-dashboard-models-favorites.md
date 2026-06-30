# PRD-017c: Dashboard Models - Favorites

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ModelsScreen`, `ModelRow` favorite toggle)

---

## Overview

Allow users to favorite and unfavorite models from the Models screen, reusing rflectr's existing favorites preference behavior and 20-model catalog cap.

## Goals

- Toggle favorite state from a model row.
- Persist favorite changes through `rflectr server`.
- Enforce the existing max of 20 favorites.
- Keep stale/unavailable favorites from blocking catalog display.

## Non-Goals

- Changing how favorites launch in CLI/App flows.
- Supporting more than 20 favorites.
- Provider-specific favorite ordering controls in the first release.

## User Stories

- As a user, I want to curate my favorite models visually.
- As a user, I want the dashboard to stop me before I exceed the launch catalog cap.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-017c-1 | Given a model is not favorited, when the user toggles favorite and capacity remains, then the model becomes favorited and is persisted. |
| AC-017c-2 | Given a model is favorited, when the user toggles favorite, then the model is removed from favorites and persisted. |
| AC-017c-3 | Given 20 favorites already exist, when the user attempts to add another, then the dashboard blocks the action and explains the cap. |
| AC-017c-4 | Given the save fails, when the server returns an error, then the UI restores prior favorite state or marks it unsaved. |

## API Expectations

- Endpoint to read favorites with resolved availability.
- Endpoint to add/remove a favorite by provider/model identity.
- Responses should include the updated favorite count.

## Test Plan

- Unit-test favorite cap enforcement.
- Component-test optimistic or pessimistic mutation behavior.
- Server tests for persistence to preferences and skipped stale favorites.

## Open Questions

- [ ] Should favorite toggles be optimistic or wait for server confirmation?
- [ ] Should favorite order be editable from the dashboard?
