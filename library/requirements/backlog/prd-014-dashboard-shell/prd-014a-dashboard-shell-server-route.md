# PRD-014a: Dashboard Shell - Server Route

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/index.html`

---

## Overview

Expose the dashboard application through `rflectr server` as a local web UI. The implementation should serve bundled dashboard assets from the same foreground server process that already exposes gateway APIs, keeping setup simple and local-first.

## Goals

- Serve the dashboard HTML, JS, CSS, and static assets from the running gateway.
- Keep dashboard serving compatible with loopback-only and network-bind server modes.
- Return appropriate cache headers for static hashed assets while keeping the app shell fresh.
- Make startup output discoverable so users know where to open the dashboard.

## Non-Goals

- Creating a second web server process.
- Implementing authentication beyond the server gateway's existing local/network security posture.
- Shipping the design-system prototype files directly as production source without a build step review.

## User Stories

- As a user running `rflectr server`, I want a URL I can open in my browser so that I can manage the gateway visually.
- As a user in local mode, I want the dashboard to bind to the same local process so that no data leaves my machine.
- As a user in network mode, I want dashboard access to respect the same server password posture as the API where appropriate.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-014a-1 | Given `rflectr server` is running, when the user requests the dashboard route, then the server returns the dashboard app shell with HTTP 200. |
| AC-014a-2 | Given a dashboard asset is requested, when the asset exists, then the server returns it with the correct content type. |
| AC-014a-3 | Given a dashboard client route is requested, when the route is not an API route, then the server falls back to the app shell. |
| AC-014a-4 | Given the server starts successfully, when startup messaging is printed, then it includes the dashboard URL. |
| AC-014a-5 | Given the server is in password-protected network mode, when dashboard data endpoints are requested, then they follow the existing server authorization rules. |

## Implementation Notes

- Keep the dashboard route clearly separated from `/anthropic/*`, `/openai/*`, `/models`, and `/health`.
- Prefer a small static asset handler inside `src/server/router.ts` or a dedicated server-dashboard module if the router would become too crowded.
- The favicon and rflectr mark should use the existing design-system asset source rather than duplicating binary files in `library/`.

## Test Plan

- Unit-test route classification so dashboard paths do not shadow API paths.
- Add server-router tests for HTML fallback, asset content types, and 404 behavior.
- Manually run `rflectr server` and open the printed dashboard URL.

## Open Questions

- [ ] What final route should be printed: `/dashboard`, `/ui`, or `/`?
- [ ] Should the dashboard itself require auth in network mode, or only its data endpoints?
