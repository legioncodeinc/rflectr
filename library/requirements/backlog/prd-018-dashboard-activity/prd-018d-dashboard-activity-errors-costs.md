# PRD-018d: Dashboard Activity - Errors and Cost Caveat

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`ActivityScreen` cost caveat), `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`StatusPill`)

---

## Overview

Surface retry/error states and the modeled cost-estimate caveat. Activity should help users debug gateway behavior while staying honest about non-Anthropic token and cost accounting.

## Goals

- Render retry and error statuses distinctly.
- Show concise, privacy-safe error summaries where available.
- Display the non-Anthropic cost estimate caveat.
- Avoid stack traces, request bodies, and secret-bearing upstream messages.

## Non-Goals

- Full trace viewer.
- Billing reconciliation.
- Provider-specific debugging playbooks.

## User Stories

- As a user, I want to see when a backend rate-limits or fails.
- As a user, I want rflectr to be honest when cost values are only estimates.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-018d-1 | Given a row has retry status, when rendered, then retry styling and label are visible. |
| AC-018d-2 | Given a row has an error status, when rendered, then the status code and safe summary are available. |
| AC-018d-3 | Given an upstream error contains sensitive content, when serialized or rendered, then sensitive values are redacted. |
| AC-018d-4 | Given Activity renders, when translated/non-Anthropic models are represented, then the cost-estimate caveat is visible. |

## Implementation Notes

- Reuse existing upstream error formatting where possible.
- Cost caveat copy should align with current known limitation: translated providers do not always report token accounting consistently.

## Test Plan

- Unit-test safe error summary extraction and redaction.
- Component-test retry, HTTP 429, and HTTP 500 rows.
- Manual test with a provider rate-limit response.

## Open Questions

- [ ] Should row-level error summaries be shown inline, on hover, or in a detail expansion?
