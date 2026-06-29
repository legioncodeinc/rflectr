# PRD-017a: Dashboard Models - Catalog

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ModelsScreen`, `ModelRow`)

---

## Overview

Load and render the dashboard-safe model catalog as `ModelRow` entries. The catalog should merge registry providers consistently with existing rflectr model discovery and classification rules.

## Goals

- Display all relevant models returned by the server catalog endpoint.
- Keep row fields stable across polling refreshes.
- Show model metadata without exposing provider secrets.

## Non-Goals

- Fetching model lists directly from providers in the browser.
- Implementing model launch actions.

## User Stories

- As a user, I want to browse the models rflectr can see.
- As a user, I want each row to show enough metadata to choose a model later.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-017a-1 | Given catalog data exists, when Models renders, then each model appears as one row keyed by stable id/provider identity. |
| AC-017a-2 | Given a model has provider family metadata, when rendered, then the family is shown. |
| AC-017a-3 | Given a model lacks optional metadata, when rendered, then missing fields show an honest fallback. |
| AC-017a-4 | Given the catalog refreshes, when rows update, then favorite and filter state remain stable. |

## API Expectations

Rows should include model id, provider/backend id, family/display name, format, context window, cost label, favorite flag, and routable/unsupported status.

## Test Plan

- Component-test catalog rows with complete and partial metadata.
- Integration-test catalog endpoint mapping from registry provider data.

## Open Questions

- [ ] Should model ids be grouped by provider or remain a flat list in the first release?
