# PRD-017: Dashboard Models

> **Status:** Backlog
> **Priority:** P1
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Source model:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx`

---

## Overview

The Models dashboard surface provides a searchable, filterable catalog of models available to rflectr. It must show honest format support, context windows, backend/provider, cost estimates, and favorite status while preserving the existing cap of 20 favorites.

---

## Goals

- Display model rows for the unified registry catalog.
- Support search by model id and family.
- Support filters for all, native, translated, unsupported, and favorites as appropriate.
- Allow favorite toggling up to the existing max catalog size.
- Communicate format honestly: native, SDK-translated, or unsupported.

## Non-Goals

- Launching tools directly from the Models screen.
- Accurate non-Anthropic cost accounting beyond existing directional estimates.
- Editing provider configuration.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-017a-dashboard-models-catalog`](./prd-017a-dashboard-models-catalog.md) | Model row data, display fields, and catalog loading. | Draft |
| [`prd-017b-dashboard-models-search-filter`](./prd-017b-dashboard-models-search-filter.md) | Search input, format filters, empty states, and counts. | Draft |
| [`prd-017c-dashboard-models-favorites`](./prd-017c-dashboard-models-favorites.md) | Favorite toggling, cap enforcement, and persistence. | Draft |
| [`prd-017d-dashboard-models-format-cost`](./prd-017d-dashboard-models-format-cost.md) | Format badges, context windows, backend labels, and cost caveats. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-017-1 | Given model catalog data exists, when Models renders, then each row shows id, family, format, context, cost, backend, and favorite state. |
| AC-017-2 | Given the user types in search, when model ids or families match, then the list filters in place. |
| AC-017-3 | Given the user chooses a format/favorite filter, when the filter changes, then the visible list and shown count update. |
| AC-017-4 | Given the user toggles a favorite, when the mutation succeeds, then favorite state persists to rflectr preferences. |
| AC-017-5 | Given a model is unsupported, when rendered, then the UI clearly marks it unsupported and does not imply it can be routed. |

---

## Data Model Changes

None expected. Favorites should reuse existing `favoriteModels` preferences.

---

## API Changes

- Dashboard-safe model catalog endpoint.
- Favorite update endpoint, reusing existing max favorite behavior.

---

## Open Questions

- [ ] Should unsupported models be visible by default or hidden behind a filter?
- [ ] Should model rows expose a "set default" or "launch with" action in a later PRD?

---

## Related

- `library/requirements/completed/prd-003-model-discovery-classification/prd-003-model-discovery-classification-index.md`
- `library/requirements/completed/prd-008-preferences-tiers-favorites/prd-008-preferences-tiers-favorites-index.md`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx`
