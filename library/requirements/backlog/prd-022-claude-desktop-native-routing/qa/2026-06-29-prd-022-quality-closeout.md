# QA Report: PRD-022 Claude Desktop Native Routing

**Plan document:** `library/requirements/backlog/prd-022-claude-desktop-native-routing/prd-022-claude-desktop-native-routing-index.md` plus sub-PRDs `prd-022a` through `prd-022d`  
**Audit date:** 2026-06-29  
**Base branch:** `main`  
**Head:** `legion/dashboard-interface` with dirty working tree and untracked PRD-022 files  
**Auditor:** quality-worker-bee  
**Status:** VERIFIED

## Summary

PRD-022 can be marked VERIFIED. The prior Critical blocker is closed: dashboard-started Claude Desktop native routing now rewrites intercepted inference traffic to an internal loopback endpoint and streams through the shared dispatch target using the live `ServerResponse`, and `tests/server-router.test.ts` proves the first SSE chunk arrives before upstream completion. No Critical issues remain; one non-blocking Warning remains for the out-of-scope Node 24 runtime/build target bump.

Current QA evidence:

- `npx vitest run tests/desktop-claude-target.test.ts tests/desktop-interception-verify.test.ts tests/desktop-interception-transport.test.ts tests/desktop-interception-trust.test.ts tests/desktop-anthropic-adapter.test.ts tests/desktop-routing-dispatch.test.ts tests/server-router.test.ts tests/server-dashboard.test.ts` - PASS, 8 files / 77 tests.
- `npm run typecheck` - PASS, `tsc --noEmit`.
- `npm test` - PASS, 89 files / 763 tests / 2 skipped.
- `npm run build` - PASS, `tsup` built `dist/cli.js` with target `node24`.
- Live-safe local harness - PASS, temporary `tests/live-prd022-safe.test.ts` detected Claude Desktop installed as `shell:AppsFolder\Claude_pzs8sxrjxfjjc!Claude`, exercised dashboard native verify/start/route/stop/uninstall through an ephemeral rflectr server, confirmed `api.openai.com` was denied with HTTP 403 by native egress, confirmed progressive SSE first chunk at 5ms with total stream duration 189ms, and asserted Windows WinINET/WinHTTP proxy state remained unchanged before and after. The temporary harness file was removed after the run.
- Source inspection: `rg -n "injectMemory|wrapMemory|MEMORY_OPEN|MEMORY_CLOSE|Deeplake|DeepLake|deeplake|memory|transcript|rflectr\\.old" src\\desktop-interception src\\server\\anthropic-dispatch.ts src\\server\\router.ts tests\\desktop-anthropic-adapter.test.ts tests\\desktop-routing-dispatch.test.ts tests\\server-router.test.ts` only matched the negative no-transplant test in `tests/desktop-anthropic-adapter.test.ts:156-160`.

## Scorecard

| Category | Status | Notes |
|---|---|---|
| Completeness | PASS | All PRD-022, 022a, 022b, 022c, and 022d acceptance criteria are traced to implementation and tests |
| Correctness | PASS | Native verification/start/stop/uninstall, shared dispatch, route filtering, redaction, and progressive product-path streaming match the PRD |
| Alignment | WARNING | Implementation is aligned to native-routing architecture, but the Node 24 runtime/build target change remains outside PRD-022 scope |
| Gaps | PASS | Focused PRD-022 tests, typecheck, full test suite, build, redaction scan, and source inspection all passed |
| Detrimental | WARNING | No PRD-022 regression found; Node 24 floor may affect release compatibility outside this PRD |

## Critical Issues (must fix)

None.

## Warnings (should fix)

- [ ] **Confirm the Node 24 runtime floor is intentional for this release**, `package.json:33-35`, `tsup.config.ts:3-7`

  PRD-022 did not call for changing the package's supported Node runtime, but this working tree requires Node `>=24` and builds with `target: 'node24'`. The focused tests, full test suite, typecheck, and build pass on this machine, so this does not block PRD-022 verification. Confirm this is a release-wide requirement for native desktop interception, or narrow it to the minimum supported runtime before shipping.

  ```json
  "engines": {
    "node": ">=24"
  }
  ```

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| AC-022-1 | Unverified current OS/app version refuses native mode and offers legacy fallback | PASS | `src/server/dashboard.ts:449-508`, `src/server/router.ts:580-593`, `tests/server-router.test.ts:1024-1051` | Start fail-closes on stale/unverified evidence and keeps legacy gateway available |
| AC-022-2 | Verified native proxy extracts model/messages/system/tools/tool choice/stream/thinking without raw secret logs | PASS | `src/desktop-interception/adapters/anthropic.ts:46-66`, `tests/desktop-anthropic-adapter.test.ts:43-70` | Parser extracts all required fields and redacts diagnostics |
| AC-022-3 | Anthropic-native route uses shared passthrough and streaming/non-streaming compatibility tests | PASS | `src/server/anthropic-dispatch.ts:198-228`, `src/server/anthropic-dispatch.ts:314-327`, `tests/desktop-routing-dispatch.test.ts:187-220`, `tests/server-router.test.ts:975-1022` | Shared passthrough streams directly to the dispatch target; dashboard product path is covered |
| AC-022-4 | Non-Anthropic route dispatches through existing SDK adapter and returns Anthropic output | PASS | `src/server/anthropic-dispatch.ts:231-280`, `tests/desktop-routing-dispatch.test.ts:222-274` | SDK-backed route uses `createLanguageModel()`, `translateRequest()`, and shared streaming/generate paths |
| AC-022-5 | Unsupported/non-inference allowlisted traffic records pass-through/deny and does not mutate unrelated traffic | PASS | `src/desktop-interception/adapters/anthropic.ts:15-31`, `src/server/router.ts:778-799`, `tests/desktop-routing-dispatch.test.ts:300-334` | Non-inference Claude traffic is allowed through; non-Claude hosts deny |
| AC-022-6 | Selected provider/model is provider-qualified to avoid duplicate model id collisions | PASS | `src/desktop-interception/routing.ts:143-192`, `tests/desktop-routing-dispatch.test.ts:139-162` | Route IDs include provider namespace such as `native-openai__gpt-4o` |
| AC-022-7 | Cross-provider routing requires explicit consent naming destination provider | PASS | `src/desktop-interception/routing.ts:162-168`, `src/server/dashboard.ts:710`, `tests/server-router.test.ts:907-915` | Dashboard confirmation/API consent is required for non-Anthropic destinations |
| AC-022-8 | Streaming returns progressive SSE events without first-byte buffering | PASS | `src/server/router.ts:618-623`, `src/server/router.ts:704-765`, `src/server/router.ts:778-799`, `src/server/anthropic-dispatch.ts:314-327`, `tests/server-router.test.ts:91-107`, `tests/server-router.test.ts:975-1022` | Product path no longer buffers in a hook; test asserts `firstChunkMs < 80` while total duration waits for upstream's delayed completion |
| AC-022-9 | Provider errors return compatible error to app and redacted dashboard diagnostic | PASS | `src/server/anthropic-dispatch.ts:107-120`, `src/desktop-interception/routing.ts:108-119`, `src/server/router.ts:820-830`, `tests/desktop-routing-dispatch.test.ts:300-334` | Safe diagnostics expose route/category without prompt or key material |
| AC-022-10 | Stopping native routing removes only owned proxy/trust state and avoids dead endpoint | PASS | `src/server/router.ts:647-702`, `src/desktop-interception/trust.ts:115-150`, `tests/server-router.test.ts:956-972`, `tests/desktop-interception-trust.test.ts:105-134` | Stop closes the owned runtime transport; uninstall reports `legacyGatewayUntouched: true` |
| AC-022-11 | `npm test` and `npm run typecheck` pass without regressions | PASS | QA command output from this pass | `npm run typecheck`, focused PRD-022 Vitest suite, full `npm test`, and `npm run build` passed locally |
| AC-022-12 | Transplanted adapter contains no memory injection, Deeplake, or transcript persistence | PASS | `src/desktop-interception/adapters/anthropic.ts:1-152`, `tests/desktop-anthropic-adapter.test.ts:156-160` | Source scan only found forbidden terms inside the negative test |
| AC-022-13 | Adapter delegates to shared server/provider dispatch rather than second provider factory path | PASS | `src/desktop-interception/routing.ts:122-133`, `src/server/router.ts:1227-1254`, `src/server/anthropic-dispatch.ts:76-105` | Native bridge and `/anthropic/v1/messages` share `dispatchAnthropicMessages()` |
| AC-022-14 | Non-inference Claude Desktop request returns pass-through/deny and does not attempt routing | PASS | `src/desktop-interception/adapters/anthropic.ts:26-31`, `tests/desktop-anthropic-adapter.test.ts:90-107` | Non-inference Claude path classifies as `pass_through` |
| AC-022a-1 | Verification not installed result is `not_installed` with no proxy/CA mutation | PASS | `src/desktop-interception/claude-target.ts:61-70`, `src/desktop-interception/verify.ts:107-111`, `tests/desktop-claude-target.test.ts:29-43` | Not-installed state is represented without CA/proxy mutation |
| AC-022a-2 | Windows installed test turn records whether required hosts reach local proxy | PASS | `src/server/router.ts:486-535`, `src/server/router.ts:537-570`, `tests/server-router.test.ts:859-905` | Verification probe records observed `api.anthropic.com` and `claude.ai` hosts |
| AC-022a-3 | macOS installed test turn records whether proxy/trust store are honored | PASS | `src/desktop-interception/claude-native-state.ts:64-83`, `src/server/dashboard.ts:493-500`, `tests/server-dashboard.test.ts:60-92` | Stored status includes proxy/trust honored fields derived from live observed hosts |
| AC-022a-4 | Certificate pinning/trust refusal maps to blocked native mode | PASS | `src/desktop-interception/verify.ts:107-111`, `src/desktop-interception/claude-target.ts:120-127`, `tests/desktop-interception-verify.test.ts:35-56` | `pinned`/`proxy_ignored` become `pinned_or_trust_refused` |
| AC-022a-5 | Stored status includes OS, app version, timestamp, host coverage, live-vs-docs source | PASS | `src/desktop-interception/claude-native-state.ts:23-37`, `src/server/dashboard.ts:493-500`, `tests/server-router.test.ts:892-905` | Verification is persisted with `evidenceSource: live` and dashboard DTO exposes status fields |
| AC-022a-6 | Stale verification requires re-verification before enablement | PASS | `src/desktop-interception/app-targets.ts:16-28`, `src/server/router.ts:580-593`, `tests/server-router.test.ts:1024-1051` | Stale saved evidence rejects native start and keeps legacy fallback available |
| AC-022a-7 | Verification logs redact cookies, auth headers, prompt bodies, API keys | PASS | `src/desktop-interception/verify.ts:95-104`, `src/desktop-interception/hooks.ts:67-85`, `tests/desktop-interception-verify.test.ts:80-95`, `tests/desktop-interception-transport.test.ts:200-225` | Body previews are redacted placeholders and secret headers/paths are redacted |
| AC-022b-1 | Valid Anthropic JSON extracts all request fields and redacted diagnostics | PASS | `src/desktop-interception/adapters/anthropic.ts:46-66`, `tests/desktop-anthropic-adapter.test.ts:43-70` | Required Anthropic fields are present |
| AC-022b-2 | String/array/inline system content preserved according to SDK adapter behavior | PASS | `src/desktop-interception/adapters/anthropic.ts:54-66`, `tests/desktop-anthropic-adapter.test.ts:72-88` | Raw body is preserved for shared SDK translation |
| AC-022b-3 | Tools and tool choice reach SDK adapter for non-Anthropic providers | PASS | `src/desktop-interception/routing.ts:122-133`, `src/server/anthropic-dispatch.ts:251-261`, `tests/desktop-routing-dispatch.test.ts:222-250` | Routed body reaches shared SDK adapter path |
| AC-022b-4 | Streaming provider route returns Claude-compatible Anthropic SSE order | PASS | `src/server/anthropic-dispatch.ts:267-275`, `src/server/anthropic-dispatch.ts:314-327`, `tests/desktop-anthropic-adapter.test.ts:124-154`, `tests/desktop-routing-dispatch.test.ts:252-274`, `tests/server-router.test.ts:975-1022` | Direct dispatch and product-path streaming are both covered |
| AC-022b-5 | Thinking/signature metadata preserves current adapter round-trip behavior | PASS | `src/desktop-interception/adapters/anthropic.ts:61-66`, `src/server/anthropic-dispatch.ts:251-261`, `tests/sdk-adapter.test.ts:326` | Native raw body reaches existing SDK adapter behavior |
| AC-022b-6 | Non-inference allowlisted path returns pass-through | PASS | `src/desktop-interception/adapters/anthropic.ts:26-31`, `tests/desktop-anthropic-adapter.test.ts:90-98` | Non-inference Claude path classifies as pass-through |
| AC-022b-7 | Malformed body returns compatible error and redacted diagnostic | PASS | `src/desktop-interception/adapters/anthropic.ts:34-51`, `src/desktop-interception/adapters/anthropic.ts:107-117`, `src/server/router.ts:820-830`, `tests/desktop-anthropic-adapter.test.ts:109-122` | Malformed JSON returns Anthropic-style 400 without secret leakage |
| AC-022b-8 | Logs/metadata omit prompt bodies, cookies, auth headers, API keys | PASS | `src/desktop-interception/adapters/anthropic.ts:119-143`, `src/desktop-interception/hooks.ts:67-85`, `tests/desktop-anthropic-adapter.test.ts:43-70`, `tests/desktop-interception-transport.test.ts:200-225` | Diagnostics omit prompt bodies and redact secret-bearing headers |
| AC-022c-1 | Common server dispatch extracted instead of copied | PASS | `src/server/anthropic-dispatch.ts:76-105`, `src/server/router.ts:1227-1254`, `src/desktop-interception/routing.ts:122-133` | Router and native route both use extracted dispatch |
| AC-022c-2 | Duplicate model ids use provider-qualified route identity | PASS | `src/desktop-interception/routing.ts:151-192`, `tests/desktop-routing-dispatch.test.ts:139-162` | Provider id participates in model lookup and route alias |
| AC-022c-3 | Anthropic-format native route uses selected provider base URL/API key | PASS | `src/server/anthropic-dispatch.ts:209-225`, `tests/desktop-routing-dispatch.test.ts:187-220`, `tests/server-router.test.ts:933-947` | Selected provider key reaches `/v1/messages` |
| AC-022c-4 | SDK-backed route uses `createLanguageModel()` and existing SDK response paths | PASS | `src/server/anthropic-dispatch.ts:231-280`, `tests/desktop-routing-dispatch.test.ts:222-274` | SDK-backed route uses shared provider factory/adapter |
| AC-022c-5 | Deleted provider invalidates stale native routes | PASS | `src/desktop-interception/routing.ts:151-159`, `tests/desktop-routing-dispatch.test.ts:164-185`, `tests/server-router.test.ts:677-728` | Missing/stale routes are blocked rather than guessed |
| AC-022c-6 | Credential changes refresh without full server restart | PASS | `src/server/anthropic-dispatch.ts:123-163`, `tests/desktop-routing-dispatch.test.ts:276-298` | SDK cache key includes credential fingerprint |
| AC-022c-7 | Catalog refresh does not reintroduce hidden smoke/test or deleted OpenCode sources | PASS | `src/desktop-interception/routing.ts:155-159`, `src/server/dashboard.ts:688`, `tests/desktop-routing-dispatch.test.ts:164-185`, `tests/server-router.test.ts:677-728` | Hidden smoke routes and deleted providers are excluded |
| AC-022c-8 | Dispatch failure exposes safe route/provider/error category only | PASS | `src/desktop-interception/routing.ts:108-119`, `tests/desktop-routing-dispatch.test.ts:300-334`, `tests/server-router.test.ts:774-812` | Safe diagnostics omit prompt/key material |
| AC-022d-1 | Native verification failure keeps legacy gateway available with copy explaining 3P gateway mode | PASS | `src/server/dashboard.ts:502-508`, `library/knowledge/public/guides/claude-desktop.md:5-9` | Dashboard and public docs label legacy 3P mode |
| AC-022d-2 | Native verification success makes native primary and legacy secondary | PASS | `src/server/dashboard.ts:477-508`, `tests/server-dashboard.test.ts:60-92` | Native is primary after live supported verification |
| AC-022d-3 | Legacy gateway mode preserves existing backup/restore behavior | PASS | `src/claude-app.ts:27-55`, `src/claude-app.ts:224-238`, `library/knowledge/private/integrations/harnesses.md:79-87` | Legacy command/session restore path remains intact |
| AC-022d-4 | Legacy revert restores 3P config and does not touch native CA/proxy state | PASS | `src/claude-app.ts:68-72`, `src/claude-app.ts:236-238` | Legacy restore/cleanup calls only Claude 3P session recovery |
| AC-022d-5 | Native uninstall does not delete legacy 3P config unless explicitly owned/chosen | PASS | `src/server/router.ts:668-702`, `src/desktop-interception/trust.ts:115-150`, `tests/server-router.test.ts:963-972`, `tests/desktop-interception-trust.test.ts:105-134` | Native uninstall reports `legacyGatewayUntouched: true` and ownership checks protect unrelated state |
| AC-022d-6 | Public/private Claude Desktop docs distinguish native interception from legacy gateway | PASS | `library/knowledge/private/integrations/harnesses.md:31-37`, `library/knowledge/public/guides/claude-desktop.md:5-9` | Docs describe native as verified path and legacy as fallback |

## Files Changed

- `library/knowledge/private/integrations/harnesses.md` (M), distinguishes native Claude Desktop interception from shipped legacy 3P gateway mode
- `library/knowledge/public/guides/claude-desktop.md` (M), labels public Claude Desktop guide as legacy third-party gateway fallback
- `package-lock.json` (M), lockfile update for desktop interception dependencies and test/build dependency changes
- `package.json` (M), adds native interception dependencies and changes Node engine to `>=24`
- `src/claude-app.ts` (M), updates CLI help/runtime copy to call Claude Desktop app mode legacy gateway mode
- `src/desktop-interception/adapters/anthropic.ts` (A), Anthropic request classifier/parser, malformed response helper, redacted diagnostics, and SSE/content-block utilities
- `src/desktop-interception/adapters/types.ts` (A), narrowed desktop adapter classification/request/diagnostic types
- `src/desktop-interception/app-targets.ts` (A), desktop app verification tuple and stale-detection helper
- `src/desktop-interception/ca.ts` (A), local CA material creation/removal helpers with owned-path checks
- `src/desktop-interception/claude-native-state.ts` (A), persisted Claude native verification load/save and current tuple helpers
- `src/desktop-interception/claude-target.ts` (A), Claude Desktop target host/path matching and native enablement decision helper
- `src/desktop-interception/config.ts` (A), desktop interception config schema/env loader
- `src/desktop-interception/egress.ts` (A), egress allowlist, loopback ownership, destination canonicalization, and redacted leak-event formatting
- `src/desktop-interception/hooks.ts` (A), interception hook contracts and redacted request/response snapshots
- `src/desktop-interception/os-proxy.ts` (A), OS proxy adapter interface plus noop adapter
- `src/desktop-interception/redaction.ts` (A), shared header/path/text/body redaction helpers
- `src/desktop-interception/routing.ts` (A), native Claude Desktop route selection and bridge into shared Anthropic dispatch
- `src/desktop-interception/state.ts` (A), native install/runtime state types and partial-state detection
- `src/desktop-interception/transport.ts` (A), Mockttp-backed loopback transport with egress enforcement, upstream URL rewriting, and hook pass-through
- `src/desktop-interception/trust.ts` (A), trust install/uninstall planning and owned cleanup execution
- `src/desktop-interception/verify.ts` (A), verification result construction, stale-status bridge, and sample redaction
- `src/server/anthropic-dispatch.ts` (A), extracted shared Anthropic dispatch for passthrough and SDK-backed models
- `src/server/dashboard.ts` (M), adds native/legacy Claude Desktop dashboard DTO/copy/UI and redacted activity surfaces
- `src/server/router.ts` (M), adds dashboard native verify/start/stop/uninstall endpoints and product-path streaming through shared dispatch
- `tests/desktop-anthropic-adapter.test.ts` (A), adapter parsing, redaction, pass-through/deny, malformed body, SSE fixture, and no-memory-transplant coverage
- `tests/desktop-claude-target.test.ts` (A), Claude host/inference matching and enablement-state coverage
- `tests/desktop-interception-ca.test.ts` (A), CA creation/removal and private key non-exposure coverage
- `tests/desktop-interception-config.test.ts` (A), config defaults/env loading and no old memory/Deeplake switch coverage
- `tests/desktop-interception-egress.test.ts` (A), host allowlist, loopback ownership, IDNA, denied-event redaction coverage
- `tests/desktop-interception-imports.test.ts` (A), import-surface guard for desktop interception modules
- `tests/desktop-interception-transport.test.ts` (A), transport binding/closing, egress denial, hook modification, pass-through SSE streaming, and redacted after-response coverage
- `tests/desktop-interception-trust.test.ts` (A), trust planning, ownership, partial state, and executable owned-cleanup coverage
- `tests/desktop-interception-verify.test.ts` (A), verification fixtures, stale detection, blocked states, and sample redaction coverage
- `tests/desktop-routing-dispatch.test.ts` (A), provider-qualified route selection, consent, passthrough, SDK dispatch, direct dispatch streaming, credential refresh, and redacted route failure coverage
- `tests/server-dashboard.test.ts` (M), dashboard activity/error redaction and native-primary DTO coverage
- `tests/server-router.test.ts` (M), dashboard native verify/start/stop/uninstall endpoint coverage, product-path progressive SSE coverage, stale verification, redaction, and shared dispatch regressions
- `tsup.config.ts` (M), changes build target to Node 24 and externalizes `mockttp`
- `vitest.config.ts` (A), excludes `.tmp` and `rflectr.old` from Vitest discovery

Out-of-scope dirty-tree/branch noise observed but not audited for PRD-022 fidelity: `.tmp/dashboard-smoke-*`, dashboard PRD-014 through PRD-019 documents, PRD-020/021/023 folders, `rflectr.old/`, library index/architecture/security docs outside the two PRD-022 doc AC paths, and earlier dashboard branch changes already present in `main...HEAD`.
