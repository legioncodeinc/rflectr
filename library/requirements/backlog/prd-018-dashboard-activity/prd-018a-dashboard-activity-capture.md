# PRD-018a: Dashboard Activity - Event Capture

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)
> **Schema changes:** Additive
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/data.js` (`activity` rows), `library/knowledge/private/design-system/project/ui_kits/dashboard/screens2.jsx` (`ActivityScreen`)

---

## Overview

Capture privacy-safe gateway request events inside `rflectr server` so the dashboard can render recent activity. Events should include routing metadata and operational metrics, not request bodies.

## Goals

- Capture request start/end time, tool/client where known, model, backend, status, latency, and token counts.
- Capture retry/reroute outcomes.
- Keep a bounded recent activity window.
- Exclude prompts, completions, raw headers, and secrets.

## Non-Goals

- Persistent audit logging.
- Full distributed tracing.
- Prompt replay or debugging payload capture.

## User Stories

- As a user, I want to see what the gateway has recently handled.
- As a privacy-conscious user, I do not want prompts or responses stored for dashboard display.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-018a-1 | Given a gateway request completes, when activity capture runs, then a privacy-safe event is appended to the recent buffer. |
| AC-018a-2 | Given a request retries or reroutes, when captured, then retry status is represented distinctly from final success/error. |
| AC-018a-3 | Given the buffer reaches its limit, when a new event is added, then the oldest event is evicted. |
| AC-018a-4 | Given an event is serialized, when inspected, then it contains no prompt, completion, raw header, or secret value. |

## Implementation Notes

- Start with an in-memory ring buffer owned by the server process.
- Event capture should wrap both Anthropic and OpenAI-compatible routes where the gateway can observe them.
- Use conservative token values when providers omit usage.

## Test Plan

- Unit-test event redaction.
- Server-router tests for successful, retry, and error event capture.
- Load test buffer eviction behavior with more than the configured row limit.

## Open Questions

- [ ] What is the default buffer size: 100, 500, or 1000 events?
- [ ] How should tool/client identity be inferred when the caller does not send a recognizable user agent?
