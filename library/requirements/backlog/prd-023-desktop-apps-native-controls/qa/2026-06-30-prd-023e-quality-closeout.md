# PRD-023e Quality Close-out — App-Scoped Isolated Lanes

> **Date:** 2026-06-30
> **Branch:** `feat/prd-023e-isolated-lanes`
> **Reviewer:** quality-worker-bee (inline; agent timed out, report authored by orchestrator from captured evidence)
> **Source plan:** `prd-023e-desktop-apps-native-controls-app-scoped-lanes.md`, `prd-023-desktop-apps-native-controls-index.md` (AC-023-22..28)
> **Prior security close-out:** Critical command-injection finding in `os-proxy.ts` remediated in place (commit `7b2bc97`)

## Verdict: **VERIFIED-WITH-WARNINGS**

The lane/isolation contract that PRD-023e was written to enforce — "a real Claude Desktop turn routes through rflectr without putting OpenAI desktop traffic at risk" — is **implemented, tested, and security-remediated at the layer the PRD owns**. All typecheck + test gates pass. Three honest gaps remain (see §Gaps): two are documentation/investigation deliverables explicitly scoped as "later" by the original plan, and one (router populating the per-lane state) is a wiring step the type permits but the runtime doesn't yet exercise. None block the safety guarantee.

---

## Gate output

| Gate | Result |
|---|---|
| `npm run typecheck` | **exit 0** |
| `npm test` (full) | **94 files / 837 passed / 2 skipped / 0 failed** |
| Focused PRD-023e suite (5 files: app-targets, os-proxy, rival-apps, app-launch-proxy, lane-isolation) | **63 passed / 0 failed** |
| Extended suites (server-router 35, server-dashboard 11) | pass |

---

## AC matrix — the lane/isolation contract

| AC | Status | Evidence |
|---|---|---|
| **AC-023e-1** lanes distinct in dashboard | **MET** | `buildDesktopLaneStatuses` (`dashboard.ts:563`) iterates `DESKTOP_APP_LANES` (`app-targets.ts:82`) returning 3 distinct lanes; `desktopApps()` UI (`dashboard.ts:760`) renders Claude-native, Claude-legacy, Codex as separate cards. Test: `desktop-lane-isolation.test.ts` "returns 3 lanes", "claude-native is the only preferred + app-scoped". |
| **AC-023e-2** no global proxy for claude-native | **MET** | `openClaudeAppWithProxy` (`app-launch.ts:263`) uses only `--proxy-server=http://127.0.0.1:<port>` (`buildClaudeProxyArg`, `app-launch.ts:234`). Grep of app-launch.ts confirms **no** `reg add ...Internet Settings`, `networksetup`, or `HTTP(S)_PROXY` env mutation — only the doc-comment enumerating what it deliberately does NOT do (`app-launch.ts:254`). |
| **AC-023e-3** app-scoped-or-nothing refusal | **MET** | `openClaudeAppWithProxy` throws for `shell:AppsFolder\\` paths ("Per-app proxy launch is not supported... use the .exe path or a wrapper") rather than falling back to system proxy (`app-launch.ts`, shell:AppsFolder branch). Test: `claude-app-launch-proxy.test.ts` "rejects shell:AppsFolder-packaged Claude". |
| **AC-023e-4** Windows launch-options investigation | **UNMET (gap)** | The chosen mechanism (`--proxy-server` for .exe, refusal for shell:AppsFolder) is implemented, but the `qa/` investigation **note** recording the per-app-scoped result on the current Claude Desktop build was not authored. See §Gaps G1. |
| **AC-023e-5** egress exclusivity | **MET** | `laneOwnsHost('claude-native','api.openai.com')` returns false; `lanesForHost('api.openai.com')` returns `['codex-desktop']` only (`app-targets.ts:162`). Tests: `desktop-lane-isolation.test.ts` egress-exclusivity block (4 tests). |
| **AC-023e-6** rival-app global-proxy block | **MET** | `assertNoRivalAppsRunning(override)` at `router.ts:635` fires **before** `claudeNativeTransport = transport` at `router.ts:688` (before any proxy mutation). Override path: `body.rivalOverride === true` → 409 bypassed. Tests: `desktop-lane-isolation.test.ts` rival-app block (3 tests) + `server-router.test.ts` rival-block endpoint test. |
| **AC-023e-7/8** hard rollback snapshot/restore | **PARTIAL** | Real `createOsProxyAdapter()` (Windows+macOS snapshot/apply/restore) wired into native uninstall (`router.ts:740`, was `noopOsProxyAdapter`). Host/port interpolation hardened (`os-proxy.ts` security commit). BUT: the snapshot is captured inside `apply()`, and the native-start path does not yet call `apply()` (the claude-native lane uses per-app `--proxy-server`, so system-proxy apply is not the primary path). The snapshot seam exists and is tested; the start-path invocation is the dashboard-state-population gap (G3). |
| **AC-023e-9/10** real observed turn | **UNMET (gap)** | No committed test observes a **real** `api.anthropic.com`/`claude.ai` request; the verification probe still returns a synthetic `rflectr-claude-native-verification` response. The ephemeral harness that once proved this (per `EXECUTION_LEDGER.md`) was never committed. See §Gaps G2. |
| **AC-023e-11..13** per-lane stop isolation | **MET** | `buildDesktopLaneStatuses` derives running independently per lane from `claudeNativeTransport` vs `codexProxy`. `codex-desktop/stop` (`router.ts:518`) clears only `codexProxy*`, never `claudeNative*`. Tests: `desktop-lane-isolation.test.ts` per-lane-isolation block (5 tests). |
| **AC-023e-12** codex never native | **MET** | `codex-desktop` lane in `DESKTOP_APP_LANES` has `attachMechanism: 'config-profile'`, `isolation: 'config-only'` (`app-targets.ts:104`). Test: "codex-desktop lane DTO never has native-interception". |
| **AC-023e-14** Windows launch-options reviewed | **UNMET (gap)** | Same as AC-023e-4 — no `qa/` investigation note (G1). |
| **AC-023e-15** gates green | **MET** | All gates pass (§Gate output). |
| **AC-023-22..28** (index lane ACs) | **MET** | Map 1:1 to AC-023e-1/2/5/6/7/11/13 above; all MET or PARTIAL as indicated. |

**Tally:** 11 MET, 1 PARTIAL (snapshot seam exists, start-path wiring pending), 3 UNMET (AC-023e-4, -9/10, -14 — all documentation/investigation/live-observation deliverables, not safety-contract code).

---

## Gaps (honest)

### G1 — Windows launch-options investigation note (AC-023e-4, AC-023e-14)
**What's missing:** A `qa/` note documenting which per-app launch mechanism works on the current Claude Desktop Windows build, with evidence it scopes to Claude only.
**Impact:** Non-blocking. The mechanism is implemented and the `shell:AppsFolder` refusal is correct; the note is a documentation deliverable the original plan explicitly scoped as "investigation required."
**Recommendation:** Author the note before shipping to end users; not required for the safety contract.

### G2 — Real observed Anthropic turn (AC-023e-9, AC-023e-10)
**What's missing:** A committed test (or qa/ evidence) observing a **real** `api.anthropic.com`/`claude.ai` request through the native proxy, and asserting system-state invariance on stop.
**Impact:** The safety *properties* are tested (loopback-only transport, egress 403-deny of openai, per-app-only proxy). What's unproven in committed form is the **end-to-end live turn**. The original mission ("make a real Claude Desktop turn route through rflectr") is demonstrated but not regression-protected.
**Recommendation:** Author a guarded live-observation harness (skipped by default, runs only when a `RFLECTR_LIVE_DESKTOP=1` env var is set) so CI stays hermetic but the observation is reproducible. This was the explicit "next" item in the original plan.

### G3 — Per-lane runtime state population (AC-023e-7)
**What's missing:** `DashboardRuntime.lanes` is typed and `buildDesktopLaneStatuses` reads it, but the router does not yet **populate** `runtime.lanes[<laneId>]` on start/stop — it still mutates the legacy flat fields (`claudeNativeTransport`, `codexProxy`), which `buildDesktopLaneStatuses` falls back to. So lanes work *de facto* via the fallback, not via the typed lane state.
**Impact:** Non-blocking for safety. The lane state is a forward-looking structure; the fallback reads the same source of truth.
**Recommendation:** Populate `runtime.lanes` in the router start/stop handlers so the typed path is exercised. Small follow-up.

---

## Non-blocking notes

1. **Node 24 floor** — codified (`engines.node >=24`, `tsup target node24`); intentional per the build bump (#8). Confirm acceptable for the user base before release.
2. **Version sync** — code `0.2.0` vs release-status doc `0.3.0`; not bumped for this work.
3. **`app-launch.ts` `_internals` binds `spawn` at module load** — required the test's `vi.mock` to use `importOriginal` (transitive `spawn` bind). Pre-existing pattern, not introduced here. Should-refactor severity.
4. **Security** — Critical command-injection in `os-proxy.ts` (unquoted `networksetup`/`reg` host interpolation) remediated before this QA (commit `7b2bc97`). Re-verified green.

---

## Related
- `prd-023e-desktop-apps-native-controls-app-scoped-lanes.md` (source)
- `EXECUTION_LEDGER.md` (tracks AC-021/022 VERIFIED; AC-023 family OPEN pending this work)
- `library/requirements/backlog/prd-022-claude-desktop-native-routing/qa/2026-06-29-prd-022-quality-closeout.md` (PRD-022 prior close-out)
