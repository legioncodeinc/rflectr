# PRD-016d: Dashboard Providers - Security and Redaction

> **Status:** Backlog
> **Priority:** P0
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/README.md` (privacy rule), `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ProviderCard` key status)

---

## Overview

Define the provider security rules for the dashboard. The Providers surface may show credential posture but must never show raw API keys, OAuth tokens, credential-store values, or secret-bearing environment variables.

## Goals

- Ensure provider payloads are dashboard-safe by construction.
- Show useful credential status without revealing secrets.
- Prevent accidental secret exposure in error messages, logs, and import results.

## Non-Goals

- Replacing OS credential storage.
- Adding multi-user access control.
- Encrypting browser-local storage; secrets should not be placed there.

## User Stories

- As a user, I want to know whether a provider has usable auth without seeing the key.
- As a user, I want confidence that opening the dashboard will not leak secrets into the browser.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-016d-1 | Given a provider has an API key, when provider data is serialized, then the response contains only redacted status metadata. |
| AC-016d-2 | Given an upstream error includes a secret-like value, when shown in the dashboard, then the value is redacted. |
| AC-016d-3 | Given browser devtools inspect dashboard state, when provider objects are present, then no raw key or token values are present. |
| AC-016d-4 | Given import results include credential sources, when rendered, then they identify source type only, not secret content. |

## Implementation Notes

- Add dashboard DTO builders server-side and test them directly.
- Treat any field named `apiKey`, `token`, `secret`, `password`, or `authorization` as forbidden in dashboard responses unless explicitly redacted.
- Keep redaction rules shared by Providers and Settings gateway diagnostics.

## Test Plan

- Snapshot-test provider DTOs for absence of forbidden secret fields.
- Add redaction tests for representative upstream error bodies.
- Manual inspect network responses during provider add/import.

## Open Questions

- [ ] Should the dashboard expose credential source labels such as environment, keychain, config, or session-only?
