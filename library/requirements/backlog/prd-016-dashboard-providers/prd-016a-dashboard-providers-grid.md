# PRD-016a: Dashboard Providers - Grid

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ProvidersScreen`, `ProviderCard`)

---

## Overview

Render provider summaries as a responsive `ProviderCard` grid matching the UI kit. Cards should show provider identity, auth/status posture, model count, and selected state.

## Goals

- Show all dashboard-safe providers returned by `rflectr server`.
- Distinguish connected, missing, OAuth, and local provider states.
- Preserve provider brand hints through monogram and color.

## Non-Goals

- Provider detail editing.
- Credential entry.
- Model filtering; owned by PRD-017.

## User Stories

- As a user, I want to see which providers rflectr knows about.
- As a user, I want to know which providers are ready to route traffic.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-016a-1 | Given providers are returned, when the grid renders, then every provider summary appears once. |
| AC-016a-2 | Given provider status is `missing`, when the card renders, then missing state is visually distinct from connected state. |
| AC-016a-3 | Given a provider uses OAuth, when the card renders, then OAuth status is shown without implying an API key is stored. |
| AC-016a-4 | Given the user selects a provider card, when selection changes, then the selected card has a persistent selected state. |

## API Expectations

Provider summaries should include display name, provider id, monogram, status, model count, and optional brand color token. They must not include secret values.

## Test Plan

- Component-test all provider status variants.
- Verify responsive auto-fill card layout.
- Test selected state independent of polling refresh.

## Open Questions

- [ ] Should selected provider reveal a detail drawer in this PRD or only prepare state for PRD-016c?
