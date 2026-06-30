# PRD-014b: Dashboard Shell - Navigation

> **Status:** Backlog
> **Priority:** P1
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/chrome.jsx` (`Sidebar`, `TopBar`)

---

## Overview

Implement the dashboard chrome modeled in `chrome.jsx`: a left sidebar with the rflectr identity, local gateway badge, user/account summary, primary navigation, and a top bar with title, search, theme toggle, sidebar collapse, and Add Provider action.

## Goals

- Provide stable navigation for Overview, Providers, Models, Activity, and Settings.
- Preserve the modeled collapsed-sidebar behavior.
- Route the Add Provider button to the Providers experience.
- Keep gateway locality visible in the sidebar.

## Non-Goals

- Provider add/import implementation; owned by PRD-016.
- Global search result implementation beyond passing query state into relevant surfaces.
- Account management or hosted identity.

## User Stories

- As a user, I want obvious navigation between dashboard sections so that I can quickly inspect the gateway.
- As a user on a narrow or focus-heavy layout, I want to collapse the sidebar so that more space is available for content.
- As a user, I want the Add Provider command to take me to the right place instead of opening a dead action.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-014b-1 | Given the dashboard loads, when the sidebar renders, then it shows Overview, Providers, Models, Activity, and Settings with icons and active state. |
| AC-014b-2 | Given the user clicks a nav item, when the route changes, then the content surface and top-bar title update together. |
| AC-014b-3 | Given the user toggles the sidebar, when the sidebar collapses, then labels hide, icons remain navigable, and tooltips/titles preserve meaning. |
| AC-014b-4 | Given the user clicks Add Provider, when the current route is not Providers, then the shell navigates to Providers. |
| AC-014b-5 | Given gateway host and port are available, when the sidebar renders, then the local gateway badge displays `host:port`. |

## Implementation Notes

- Route state may start as client state, but should be compatible with URL-backed navigation if deep links are added.
- The top-bar search value should be global shell state and passed to Models first; later PRDs may opt into it.
- Use the design-system components modeled by the UI kit where production equivalents exist.

## Test Plan

- Component tests for route switching, active state, collapsed state, and Add Provider routing.
- Accessibility checks for icon-only collapsed nav controls.
- Manual viewport checks at desktop and tablet widths.

## Open Questions

- [ ] Should navigation state be reflected in the URL from the first implementation?
- [ ] Should global search eventually route users to Models automatically?
