# PRD-021c: Native Desktop Interception Platform - Egress and Redaction

> **Status:** Backlog
> **Priority:** P0
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Source:** `rflectr.old/src/desktop/egress.ts`, `library/knowledge/private/security/desktop-egress-and-trust.md`

---

## Overview

Native interception must deny unexpected destinations and redact sensitive values everywhere. This PRD owns the allowlist and redaction behavior used by PRD-021a transport and PRD-023 dashboard status.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-021c-1 | Given a request host is in the allowlist, when checked, then it is allowed with a reason and target app label. |
| AC-021c-2 | Given a request host is not in the allowlist, when checked, then it is denied before upstream connection. |
| AC-021c-3 | Given a denied request contains headers or body secrets, when leak-attempt logging runs, then secrets are redacted. |
| AC-021c-4 | Given a configured routing gateway host exists, when routing is enabled, then that host is allowlisted with explicit purpose. |
| AC-021c-5 | Given routing is disabled, when the gateway host is requested, then it is denied unless it is also the app's normal provider host. |
| AC-021c-6 | Given dashboard status serializes egress state, when it includes last denied host, then it does not include path query secrets or auth headers. |
| AC-021c-7 | Given a request destination is checked, when host matching runs, then rflectr canonicalizes scheme, host, port, and IDNA/case representation, allows only exact configured hosts or explicitly declared subdomain patterns, rejects suffix/wildcard matches by default, and denies IP literals or loopback destinations unless they are owned rflectr endpoints. |

## Verification Evidence

Smoker evidence must include `tests/desktop-interception-egress.test.ts` coverage for allow/deny decisions, explicit allow reasons, pre-upstream denial, routing-enabled gateway allowlisting, routing-disabled gateway denial, and redaction of headers, cookies, bearer tokens, API keys, query strings, and body-like diagnostics with synthetic secrets only. Evidence must also include canonicalization tests for case, trailing dots, default and non-default ports, IDNA/punycode, deceptive suffixes, wildcard/subdomain rules, IP literals, and loopback ownership.

## Files To Touch

- Add `src/desktop-interception/egress.ts`
- Add `src/desktop-interception/redaction.ts`
- Add `tests/desktop-interception-egress.test.ts`
- Potentially reuse redaction helpers from existing logging/credential modules if available.

## Transplant Notes

Start from `rflectr.old/src/desktop/egress.ts`, but remove the old Deeplake-centered defaults from the first routing slice. The generic allowlist is built from:

- target app host labels provided by the app-specific layer, including Claude Desktop hosts from PRD-022's `src/desktop-interception/claude-target.ts` after that PRD lands,
- selected provider route hosts from current provider/catalog state,
- loopback endpoints owned by rflectr,
- routing gateway hosts only when routing is explicitly enabled.

The leak-attempt JSON shape can be preserved, but all status and diagnostic payloads must pass through `src/desktop-interception/redaction.ts` before reaching logs or the dashboard.
