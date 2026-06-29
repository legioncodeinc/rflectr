# PRD-014d: Dashboard Shell - Theme and Responsive Baseline

> **Status:** Backlog
> **Priority:** P2
> **Effort:** M (3-8h)
> **Schema changes:** None
> **Design Source:** `library/knowledge/private/design-system/project/ui_kits/dashboard/index.html` (theme persistence, responsive shell)

---

## Overview

Implement the shared visual behavior modeled by the dashboard UI kit: dark-first dashboard styling, a persisted light-theme toggle, responsive layout constraints, keyboard-accessible controls, and reduced-motion support.

## Goals

- Preserve the dashboard's dark-first, dev-premium design direction.
- Persist the light/dark theme choice in browser-local storage.
- Keep primary dashboard flows usable across desktop and narrower widths.
- Respect `prefers-reduced-motion`.

## Non-Goals

- Replacing the global design system.
- Building a public marketing page.
- Supporting every mobile interaction as a first-class command center in the first release.

## User Stories

- As a user, I want a dashboard that fits the rflectr design language so that it feels like part of the product.
- As a user, I want the theme toggle to remember my preference.
- As a keyboard user, I want shell controls to be reachable and labeled.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-014d-1 | Given the user toggles the theme, when the page rerenders, then the root theme state changes immediately. |
| AC-014d-2 | Given local storage is available, when the user reloads, then the prior theme is restored. |
| AC-014d-3 | Given local storage is unavailable, when the user toggles theme or sidebar state, then the dashboard still works without crashing. |
| AC-014d-4 | Given the viewport is below the route-grid breakpoint, when Overview renders, then route cards stack without horizontal overflow. |
| AC-014d-5 | Given reduced motion is preferred, when route changes occur, then non-essential motion is disabled. |

## Implementation Notes

- Use `data-theme="light"` for light mode to match the prototype.
- Keep layout tokens aligned with the design-system variables, not one-off dashboard colors.
- Any icon-only control must have an `aria-label` or `title` with a useful command name.

## Test Plan

- Component tests for theme persistence fallback.
- Playwright viewport checks for desktop and narrow layouts.
- Keyboard tab-order and accessible-name checks for shell controls.

## Open Questions

- [ ] Should collapsed sidebar state persist independently of theme state?
- [ ] What is the minimum supported viewport for the first dashboard release?
