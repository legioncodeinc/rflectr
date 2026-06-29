# PRD-017b: Dashboard Models - Search and Filter

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ModelsScreen` search and filters)

---

## Overview

Implement the modeled model search and segmented filters. Users can search by model id or family and filter the catalog by format and favorites.

## Goals

- Search across model id and family.
- Filter by all, native, translated, unsupported, and favorites if unsupported remains visible.
- Show current result count and favorite count.
- Render an empty state for no matches.

## Non-Goals

- Full advanced query language.
- Server-side search for the first release unless catalog size requires it.

## User Stories

- As a user with a large catalog, I want to find a model quickly by id or family.
- As a user, I want to see only favorites when I am curating a launch catalog.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-017b-1 | Given the user types a query, when model id or family contains the query case-insensitively, then matching rows remain visible. |
| AC-017b-2 | Given the user selects a filter, when the list recomputes, then only matching rows are shown. |
| AC-017b-3 | Given no rows match, when the list renders, then the empty state includes the query text and no prototype data. |
| AC-017b-4 | Given favorites change, when the favorite filter is active, then the visible list updates immediately after successful mutation. |

## Implementation Notes

- Keep local filtering unless catalog size or endpoint latency proves this insufficient.
- Use stable filter ids rather than display labels for state.

## Test Plan

- Unit-test filtering combinations.
- Component-test empty state and result count.
- Keyboard test search input focus and filter controls.

## Open Questions

- [ ] Should unsupported models be a first-class filter tab or included only in All?
