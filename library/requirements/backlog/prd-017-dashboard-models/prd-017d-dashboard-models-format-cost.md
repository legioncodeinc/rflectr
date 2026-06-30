# PRD-017d: Dashboard Models - Format, Context, and Cost Labels

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/screens.jsx` (`ModelsScreen`, `ModelRow` format/context/cost fields)

---

## Overview

Show honest model metadata in each row: native vs SDK-translated vs unsupported format, context window, backend/provider, and cost labels. Cost labels must preserve rflectr's known limitation that non-Anthropic cost displays are estimates.

## Goals

- Make wire-format support visible before users favorite or route a model.
- Show context window labels where known.
- Show backend/provider labels consistently.
- Communicate cost uncertainty for translated/non-Anthropic providers.

## Non-Goals

- Real-time cost accounting or billing.
- Vendor pricing reconciliation.
- Model benchmarking.

## User Stories

- As a user, I want to know whether a model is native or translated before using it.
- As a user, I want to understand that some cost values are directional estimates.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-017d-1 | Given a model is Anthropic-native, when rendered, then it shows a native format badge. |
| AC-017d-2 | Given a model routes through the SDK adapter, when rendered, then it shows a translated format badge. |
| AC-017d-3 | Given a model is unsupported, when rendered, then unsupported status is explicit and route/favorite affordances respect that state. |
| AC-017d-4 | Given a context window is known, when rendered, then the label is shown in human-readable form. |
| AC-017d-5 | Given cost data is non-authoritative, when rendered, then the UI labels it as estimate or pairs it with the Activity caveat. |

## Implementation Notes

- Reuse classification semantics from existing model discovery.
- Do not infer routability from provider name alone; use server-classified format/support fields.

## Test Plan

- Unit-test badge mapping from model format.
- Component-test unsupported model rows.
- Manual compare representative Zen, Go, local OpenAI, local Ollama, and OAuth-only providers.

## Open Questions

- [ ] Should unsupported models be favoritable for future availability or blocked entirely?
