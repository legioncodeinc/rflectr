# PRD-016c: Dashboard Providers - Add and Edit

> **Status:** Backlog
> **Priority:** P2
> **Effort:** XL (> 3d)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/chrome.jsx` (`TopBar` Add Provider action), `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ProvidersScreen`)

---

## Overview

Provide dashboard flows for adding and editing registry providers. The first implementation should focus on native provider templates already understood by rflectr, with clear handling for API-key, local, and unsupported/OAuth-only provider states.

## Goals

- Let users create a provider entry from supported provider templates.
- Let users update non-secret provider metadata such as label, base URL, and enabled state where supported.
- Let users add or replace credentials without the UI echoing secret values back.
- Validate provider configuration before saving where practical.

## Non-Goals

- Building arbitrary provider plugin authoring in the dashboard.
- Full OAuth authorization flows in browser.
- Editing provider internals that rflectr intentionally derives from registry templates.

## User Stories

- As a user, I want to add a local provider such as Ollama from the dashboard.
- As a user, I want to fix a missing API key without using a text editor.
- As a user, I want to update a base URL for an OpenAI-compatible provider.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-016c-1 | Given the user chooses Add Provider, when the flow opens, then supported provider templates are available. |
| AC-016c-2 | Given a required non-secret field is missing, when the user tries to save, then validation prevents saving and identifies the field. |
| AC-016c-3 | Given the user enters a credential, when saving succeeds, then the dashboard stores it through server-side credential handling and never redisplays the value. |
| AC-016c-4 | Given an existing provider is edited, when a secret field is unchanged, then the previous credential remains intact. |
| AC-016c-5 | Given validation fails against the provider endpoint, when save returns, then the provider remains unsaved or marked missing with a clear reason. |

## Implementation Notes

- Reuse credential storage paths from PRD-006 rather than storing secrets in dashboard-local state.
- For local providers that do not validate keys, support the existing non-empty placeholder requirement.
- Keep the UI honest when a provider is OAuth-only and cannot be configured by API key.

## Test Plan

- Form validation tests for each supported provider template.
- Server mutation tests ensuring secrets are write-only in responses.
- Manual test adding an OpenAI-compatible provider and a local provider.

## Open Questions

- [ ] Which provider templates are in scope for the first release?
- [ ] Should failed validation block save or allow save with a missing/degraded status?
