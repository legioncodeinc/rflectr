# PRD-016: Dashboard Providers

> **Status:** Backlog
> **Priority:** P1
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Source model:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx`

---

## Overview

The Providers dashboard surface visualizes and manages the rflectr provider registry. It presents configured providers as cards with connection status, model counts, auth posture, and import/add actions. It must respect rflectr's privacy rule: key status may be shown, but secret values are never rendered.

---

## Goals

- Display registry providers in a card grid with status and model counts.
- Show honest key/auth status: connected, missing, OAuth, local, or similar.
- Provide an Import from OpenCode action aligned with existing registry behavior.
- Provide an Add Provider entry point for native provider setup.

## Non-Goals

- Showing raw API keys.
- Replacing existing CLI setup flows in the first dashboard release.
- Supporting OAuth browser flows from the dashboard unless covered by a later PRD.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-016a-dashboard-providers-grid`](./prd-016a-dashboard-providers-grid.md) | Provider card grid, selection, status display, and counts. | Draft |
| [`prd-016b-dashboard-providers-import-opencode`](./prd-016b-dashboard-providers-import-opencode.md) | Import from OpenCode command and refresh feedback. | Draft |
| [`prd-016c-dashboard-providers-add-edit`](./prd-016c-dashboard-providers-add-edit.md) | Add/edit provider flows and non-secret form state. | Draft |
| [`prd-016d-dashboard-providers-security`](./prd-016d-dashboard-providers-security.md) | Credential redaction, key status, and privacy requirements. | Draft |

---

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-016-1 | Given registry providers exist, when Providers renders, then each provider appears as a card with name, monogram, status, and model count. |
| AC-016-2 | Given a provider is missing credentials, when its card renders, then the missing state is visible without showing secret material. |
| AC-016-3 | Given the user imports from OpenCode, when import completes, then provider cards refresh and report success or failure. |
| AC-016-4 | Given the user adds or edits a provider, when changes are saved, then the registry updates through `rflectr server` and the UI refreshes. |
| AC-016-5 | Given an API payload includes credential metadata, when rendered, then only redacted status labels are visible. |

---

## Data Model Changes

None expected. Dashboard mutations should use the existing provider registry storage.

---

## API Changes

- Provider list endpoint for dashboard-safe provider summaries.
- Provider import endpoint for OpenCode import.
- Provider create/update endpoint for native provider configuration, if not already exposed.

---

## Open Questions

- [ ] Which provider fields are editable in the first dashboard release?
- [ ] Should Add Provider initially open a modal, route to a detail panel, or delegate to CLI instructions?
- [ ] Can OpenCode import run while the gateway is actively serving traffic?

---

## Related

- `library/requirements/completed/prd-002-provider-registry/prd-002-provider-registry-index.md`
- `library/requirements/completed/prd-006-credential-storage/prd-006-credential-storage-index.md`
- `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx`
