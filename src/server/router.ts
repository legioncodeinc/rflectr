// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isAuthorized } from './auth.js';
import {
  formatGatewayAnthropicModels,
  formatOpenAIModels,
  gatewayDisplayName,
  gatewayProviderId,
  supportsDirectOpenAIChatCompletions,
  type GatewayModelOptions,
  type ModelCatalog,
  type ServerBackendId,
  type ServerModelInfo,
  upstreamModelId,
} from './models.js';
import {
  translateOpenAiRequest,
  generateOpenAiResponse,
  streamOpenAiResponse,
  type OpenAiRequest,
} from '../openai-adapter.js';
import { sendJson, readBody } from '../http-utils.js';
import { postJsonUpstream, relayAnthropicMessages } from '../upstream-forward.js';
import { getServerRequestTracing } from '../config.js';
import { writeSecureLogLine, resetTraceLog, getProxyDebugLogPath } from '../trace-log.js';
import type { LanguageModel } from 'ai';
import {
  translateRequest as sdkTranslateRequest,
  generateAnthropicResponse,
  silenceSdkWarnings,
  type AnthropicRequest,
} from '../sdk-adapter.js';
import {
  dispatchAnthropicMessages,
  getOrInitLanguageModel as getOrInitDispatchLanguageModel,
  type AnthropicDispatchTarget,
} from './anthropic-dispatch.js';
import { CLAUDE_DESKTOP_REQUIRED_HOSTS } from '../desktop-interception/verify.js';
import {
  DASHBOARD_API_PREFIX,
  DASHBOARD_MUTATION_HEADER,
  DASHBOARD_ROUTE_PREFIX,
  DashboardActivityBuffer,
  beginDashboardActivity,
  completeDashboardActivity,
  dashboardActivityPayload,
  dashboardAddProvider,
  dashboardAsset,
  dashboardClaudeDesktopPayload,
  dashboardHtml,
  dashboardImportOpenCode,
  dashboardModels,
  dashboardOverview,
  dashboardProviderTemplates,
  dashboardProviders,
  dashboardRestartPayload,
  dashboardRemoveProvider,
  dashboardUpdateProvider,
  dashboardSettings,
  dashboardRoutes,
  sanitizeDashboardError,
  updateDashboardFavorite,
  updateDashboardSettings,
  type DashboardRuntime,
} from './dashboard.js';
import { startCodexProxy, type CodexProxyRoute } from '../codex-proxy.js';
import { buildAppCatalogFile, serializeCatalog } from '../codex/catalog.js';
import { applyAppConfigPatch } from '../codex/app-config.js';
import { CODEX_APP_PROVIDER_ID, type CodexAppConfigSpec } from '../codex/app-profile.js';
import { backupConfigToml, getAppCatalogPath, getAppRestoreStatePath, getCodexConfigPath, saveAppRestoreStateBeforePatch, writeAppSessionLock } from '../codex/app-session.js';
import { writeOverlayFile } from '../codex/session.js';
import { codexAppInstallHint, codexAppSupported, isCodexAppRunning, openCodexApp } from '../codex/app-launch.js';
import type { LocalProviderModel } from '../types.js';
import {
  detectClaudeDesktopInstall,
  evaluateClaudeNativeEnablement,
  isClaudeDesktopHost,
  isClaudeDesktopInferenceRequest,
} from '../desktop-interception/claude-target.js';
import {
  createObservedClaudeNativeVerification,
  currentClaudeNativeTuple,
  loadClaudeNativeVerification,
  recordedClaudeNativeTuple,
  saveClaudeNativeVerification,
} from '../desktop-interception/claude-native-state.js';
import { startDesktopInterceptionTransport } from '../desktop-interception/transport.js';
import {
  routeClaudeDesktopAnthropicRequest,
  selectNativeRoute,
  type CrossProviderConsent,
  type NativeRoutingRequest,
  type NativeRoutingResult,
} from '../desktop-interception/routing.js';
import type { HookResponse, InterceptedRequest, RequestOutcome } from '../desktop-interception/hooks.js';
import { emptyInstallState } from '../desktop-interception/state.js';
import { createOsProxyAdapter } from '../desktop-interception/os-proxy.js';
import { assertNoRivalAppsRunning } from '../desktop-interception/rival-apps.js';
import { readSessionLock, recoverSession } from '../claude-desktop/app-session.js';
import { restoreCodexAppOverlay } from '../codex/app-session.js';
import { idempotentStopState, uninstallOwnedNativeState } from '../desktop-interception/trust.js';

export interface ServerBackend {
  baseUrl: string;
}

export interface VertexServerConfig {
  project: string;
  location: string;
}

export interface ServerOptions {
  host: string;
  port: number;
  apiKey: string;
  serverPassword: string | null;
  catalog: ModelCatalog;
  refreshCatalog?: () => Promise<ModelCatalog>;
  backends: Record<ServerBackendId, ServerBackend>;
  gateway?: GatewayModelOptions;
  vertex?: VertexServerConfig;
  /** When set, append structured debug lines to this file path. */
  debugLogPath?: string;
  restartSupported?: boolean;
  requestRestart?: () => void;
}

export interface ServerHandle {
  host: string;
  port: number;
  url: string;
  server: Server;
  close: () => Promise<void>;
}

type JsonBody = Record<string, any>;

type PLog = (msg: string | (() => string)) => void;

/**
 * Canonical return-shape guide for dashboard desktop action handlers.
 * The existing handlers already return compatible shapes; the new
 * revert/stop/kill handlers target this interface explicitly.
 */
export type DesktopActionCategory =
  | 'blocked'
  | 'not_owned'
  | 'unsupported'
  | 'verification_required'
  | 'consent_required'
  | 'runtime_error'
  | 'manual_cleanup_required'
  | 'rival_apps_running'
  | 'noop'
  | 'ready'
  | 'stopped'
  | 'reverted'
  | 'killed';

export interface DesktopActionResult {
  ok: boolean;
  status: DesktopActionCategory;
  reason: string;
  message?: string;
}

const CLAUDE_NATIVE_INTERNAL_MESSAGES_PATH = '/_rflectr/desktop/claude-native/messages';

function makeServerLog(debugLogPath: string | undefined): PLog {
  const path = debugLogPath ?? getProxyDebugLogPath();
  let initialized = false;
  return (msg) => {
    if (!debugLogPath && !getServerRequestTracing()) return;
    if (!initialized) {
      resetTraceLog(path);
      initialized = true;
    }
    writeSecureLogLine(path, typeof msg === 'function' ? msg() : msg);
  };
}

export async function startServer(options: ServerOptions): Promise<ServerHandle> {
  silenceSdkWarnings();
  const languageModelCache = new Map<string, LanguageModel>();
  const activity = new DashboardActivityBuffer();
  const plog = makeServerLog(options.debugLogPath);
  const runtime: DashboardRuntime = {
    startedAt: Date.now(),
    host: options.host,
    port: options.port,
    local: options.host === '127.0.0.1' || options.host === 'localhost',
    gateway: options.gateway,
    restartSupported: options.restartSupported === true,
    requestRestart: options.requestRestart,
    serverPassword: options.serverPassword,
    claudeNativeVerification: loadClaudeNativeVerification(),
    claudeNativeInstallState: emptyInstallState(),
  };

  const server = createServer((req, res) => {
    void routeRequest(req, res, options, languageModelCache, plog, activity, runtime);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server did not bind to a TCP port');
  }
  runtime.port = address.port;

  return {
    host: options.host,
    port: address.port,
    url: `http://${options.host}:${address.port}`,
    server,
    close: () => new Promise<void>((resolve, reject) => {
      try {
        runtime.codexProxy?.close();
        runtime.codexProxy = null;
        runtime.codexProxyStartedAt = undefined;
      } catch { /* ignore dashboard-managed proxy cleanup */ }
      try {
        runtime.claudeNativeTransport?.close();
        runtime.claudeNativeTransport = null;
      } catch { /* ignore dashboard-managed native cleanup */ }
      try {
        runtime.claudeNativeProbe?.transport.close();
        runtime.claudeNativeProbe = null;
      } catch { /* ignore dashboard-managed probe cleanup */ }
      server.close(err => (err ? reject(err) : resolve()));
    }),
  };
}

async function routeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
  plog: PLog,
  activity: DashboardActivityBuffer,
  runtime: DashboardRuntime,
): Promise<void> {
  try {
    const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;
    plog(`${req.method} ${pathname}`);

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && (pathname === DASHBOARD_ROUTE_PREFIX || pathname.startsWith(`${DASHBOARD_ROUTE_PREFIX}/`)) && !pathname.startsWith(DASHBOARD_API_PREFIX)) {
      const asset = dashboardAsset(pathname);
      if (asset) {
        res.writeHead(asset.status, {
          'Content-Type': asset.contentType,
          'Cache-Control': asset.cacheControl,
        });
        res.end(asset.body);
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(dashboardHtml());
      return;
    }

    if (req.method === 'POST' && pathname === CLAUDE_NATIVE_INTERNAL_MESSAGES_PATH) {
      await handleClaudeNativeInternalMessages(req, res, options, modelCache, plog, activity, runtime);
      return;
    }

    if (!isAuthorized(toRequest(req), options.serverPassword)) {
      sendJson(res, 401, { error: { message: 'Unauthorized' } });
      return;
    }

    if (pathname.startsWith(DASHBOARD_API_PREFIX)) {
      await handleDashboardApi(req, res, pathname, options, modelCache, activity, runtime, plog);
      return;
    }

    if (req.method === 'GET' && pathname === '/models') {
      // Strip apiKey and headers — both contain sensitive or routing-internal data
      // that must never be emitted in HTTP responses.
      sendJson(res, 200, { models: options.catalog.list().map(({ apiKey: _apiKey, headers: _headers, ...rest }) => rest) });
      return;
    }

    if (req.method === 'GET' && pathname === '/anthropic/v1/models') {
      sendJson(res, 200, formatGatewayAnthropicModels(options.catalog.list(), options.gateway));
      return;
    }

    if (req.method === 'GET' && pathname === '/openai/v1/models') {
      sendJson(res, 200, formatOpenAIModels(options.catalog.list()));
      return;
    }

    if (req.method === 'POST' && pathname === '/anthropic/v1/messages') {
      await handleAnthropicMessages(req, res, options, modelCache, plog, activity);
      return;
    }

    if (req.method === 'POST' && pathname === '/openai/v1/chat/completions') {
      await handleOpenAIChatCompletions(req, res, options, modelCache, plog, activity);
      return;
    }

    sendJson(res, 404, { error: { message: 'Not found' } });
  } catch (err) {
    sendJson(res, 500, { error: { message: sanitizeDashboardError(err) ?? 'Internal server error' } });
  }
}

async function handleDashboardApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
  activity: DashboardActivityBuffer,
  runtime: DashboardRuntime,
  plog: PLog,
): Promise<void> {
  const models = options.catalog.list();
  const events = activity.list();
  if (isDashboardMutation(req) && req.headers[DASHBOARD_MUTATION_HEADER] !== '1') {
    sendJson(res, 403, { error: { message: 'Dashboard mutation header required' } });
    return;
  }

  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/bootstrap`) {
    sendJson(res, 200, {
      overview: dashboardOverview(models, events),
      providers: dashboardProviders(models),
      models: dashboardModels(models, options.gateway),
      settings: dashboardSettings(runtime),
    });
    return;
  }
  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/overview`) {
    sendJson(res, 200, dashboardOverview(models, events));
    return;
  }
  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/routes`) {
    sendJson(res, 200, { routes: dashboardRoutes(models) });
    return;
  }
  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/providers`) {
    sendJson(res, 200, { providers: dashboardProviders(models) });
    return;
  }
  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/providers/templates`) {
    sendJson(res, 200, { templates: dashboardProviderTemplates() });
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/providers/import-opencode`) {
    const result = await dashboardImportOpenCode();
    if (isSuccessStatus(result.status)) await refreshActiveCatalog(options, modelCache);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/providers`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = await dashboardAddProvider(body);
    if (isSuccessStatus(result.status)) await refreshActiveCatalog(options, modelCache);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/providers/update`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = await dashboardUpdateProvider(body);
    if (isSuccessStatus(result.status)) await refreshActiveCatalog(options, modelCache);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'DELETE' && pathname === `${DASHBOARD_API_PREFIX}/providers`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = await dashboardRemoveProvider(body);
    if (isSuccessStatus(result.status)) await refreshActiveCatalog(options, modelCache);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/models`) {
    sendJson(res, 200, { models: dashboardModels(models, options.gateway) });
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/models/favorite`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = updateDashboardFavorite(body);
    if (isSuccessStatus(result.status)) await refreshActiveCatalog(options, modelCache);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/test`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = await runDashboardModelTest(body, options, modelCache, activity);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/activity`) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    sendJson(res, 200, dashboardActivityPayload(events, url.searchParams.get('filter')));
    return;
  }
  if (req.method === 'GET' && pathname === `${DASHBOARD_API_PREFIX}/settings`) {
    sendJson(res, 200, dashboardSettings(runtime));
    return;
  }
  if ((req.method === 'PATCH' || req.method === 'POST') && pathname === `${DASHBOARD_API_PREFIX}/settings`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = updateDashboardSettings(body);
    if (isSuccessStatus(result.status)) await refreshActiveCatalog(options, modelCache);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/restart`) {
    const result = dashboardRestartPayload(runtime);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/claude-desktop/connect`) {
    const body = await readJson(req);
    const result = dashboardClaudeDesktopPayload(runtime, body ?? {});
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/claude-desktop/native/verify/start`) {
    const result = await dashboardClaudeNativeVerifyStart(runtime);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/claude-desktop/native/verify/complete`) {
    const result = await dashboardClaudeNativeVerifyComplete(runtime);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/claude-desktop/native/start`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = await dashboardClaudeNativeStart(runtime, body, options, modelCache, activity, plog);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/claude-desktop/native/stop`) {
    const result = await dashboardClaudeNativeStop(runtime);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/claude-desktop/native/uninstall`) {
    const body = await readJson(req);
    const result = await dashboardClaudeNativeUninstall(runtime, body ?? {});
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/codex-desktop/connect`) {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    const result = await dashboardCodexDesktopPayload(runtime, body, options);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/claude-desktop/revert`) {
    const result = await dashboardClaudeDesktopRevert(runtime);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/codex-desktop/revert`) {
    const result = await dashboardCodexDesktopRevert(runtime);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/codex-desktop/stop`) {
    const result = await dashboardCodexDesktopStop(runtime);
    sendJson(res, result.status, result.body);
    return;
  }
  if (req.method === 'POST' && pathname === `${DASHBOARD_API_PREFIX}/server/kill`) {
    const result = await dashboardServerKill(runtime);
    sendJson(res, result.status, result.body);
    return;
  }

  sendJson(res, 404, { error: { message: 'Not found' } });
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

async function dashboardClaudeNativeVerifyStart(
  runtime: DashboardRuntime,
): Promise<{ status: number; body: unknown }> {
  const detection = detectClaudeDesktopInstall();
  await runtime.claudeNativeProbe?.transport.close().catch(() => undefined);

  const observedHosts = new Set<string>();
  const transport = await startDesktopInterceptionTransport({
    allowedHosts: claudeDesktopAllowedHosts(),
    hooks: {
      beforeRequest(req) {
        if (isClaudeDesktopHost(req.host)) observedHosts.add(req.host.toLowerCase());
        if (isClaudeDesktopInferenceRequest({ host: req.host, method: req.method, path: req.path })) {
          return {
            action: 'respond',
            response: jsonHookResponse(200, {
              id: 'rflectr-claude-native-verification',
              type: 'message',
              role: 'assistant',
              model: 'rflectr-verification',
              content: [{ type: 'text', text: 'rflectr verification observed Claude Desktop traffic.' }],
              stop_reason: 'end_turn',
              usage: { input_tokens: 0, output_tokens: 0 },
            }),
          };
        }
        return { action: 'allow' };
      },
    },
  });

  runtime.claudeNativeProbe = {
    transport,
    observedHosts,
    startedAt: new Date().toISOString(),
    installed: detection.installed,
  };

  return {
    status: 200,
    body: {
      ok: true,
      installed: detection.installed,
      appPath: detection.path,
      proxyPort: transport.port,
      supportedHosts: CLAUDE_DESKTOP_REQUIRED_HOSTS,
      instructions: 'Send a Claude Desktop test turn while the native verification proxy is active, then complete verification.',
    },
  };
}

async function dashboardClaudeNativeVerifyComplete(
  runtime: DashboardRuntime,
): Promise<{ status: number; body: unknown }> {
  const probe = runtime.claudeNativeProbe;
  if (!probe) {
    return { status: 409, body: { error: { message: 'Claude Desktop native verification is not running' } } };
  }

  await probe.transport.close().catch(() => undefined);
  runtime.claudeNativeProbe = null;
  const verification = createObservedClaudeNativeVerification({
    observedHosts: probe.observedHosts,
    installed: probe.installed || probe.observedHosts.size > 0,
  });
  runtime.claudeNativeVerification = verification;
  saveClaudeNativeVerification(verification);
  const enablement = evaluateClaudeNativeEnablement({
    verification,
    recorded: recordedClaudeNativeTuple(verification),
    current: currentClaudeNativeTuple(),
  });

  return {
    status: 200,
    body: {
      ok: true,
      verification,
      nativeEnabled: enablement.nativeEnabled,
      state: enablement.state,
      legacyGatewayAvailable: enablement.legacyGatewayAvailable,
      reason: enablement.reason,
    },
  };
}

async function dashboardClaudeNativeStart(
  runtime: DashboardRuntime,
  body: JsonBody,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
  activity: DashboardActivityBuffer,
  plog: PLog,
): Promise<{ status: number; body: unknown }> {
  // Rival-app guard: native interception installs a global OS proxy that would
  // capture traffic from ChatGPT/Codex Desktop if they are running. Block unless
  // the caller passes rivalOverride: true.
  const override = body?.rivalOverride === true;
  try {
    assertNoRivalAppsRunning(override);
  } catch (error) {
    return {
      status: 409,
      body: { ok: false, status: 'rival_apps_running', reason: 'rival_apps_running', message: String((error as Error).message) },
    };
  }

  const verification = runtime.claudeNativeVerification;
  const enablement = evaluateClaudeNativeEnablement({
    verification,
    recorded: verification ? recordedClaudeNativeTuple(verification) : undefined,
    current: currentClaudeNativeTuple(),
  });
  if (!enablement.nativeEnabled) {
    return {
      status: 409,
      body: {
        error: { message: enablement.reason, category: enablement.state },
        legacyGatewayAvailable: enablement.legacyGatewayAvailable,
      },
    };
  }

  const providerId = typeof body.providerId === 'string' ? body.providerId : '';
  const modelId = typeof body.modelId === 'string' ? body.modelId : '';
  if (!providerId || !modelId) {
    return { status: 400, body: { error: { message: 'providerId and modelId are required' } } };
  }

  const consent = parseCrossProviderConsent(body);
  const route: NativeRoutingRequest = { providerId, modelId, crossProviderConsent: consent };
  const selected = selectNativeRoute(options.catalog.list(), route);
  if (!selected.ok) {
    return {
      status: selected.reason === 'consent_required' ? 409 : 404,
      body: { error: { message: selected.message, category: selected.reason } },
    };
  }

  await runtime.claudeNativeTransport?.close().catch(() => undefined);
  runtime.claudeNativeRouteToken = randomUUID();
  runtime.claudeNativeRoute = {
    ...selected.route,
    consentedAt: consent?.consentedAt,
  };
  const transport = await startDesktopInterceptionTransport({
    allowedHosts: claudeDesktopAllowedHosts(),
    hooks: {
      beforeRequest: req => routeNativeInterceptedRequest(req, runtime),
    },
  });

  runtime.claudeNativeTransport = transport;
  runtime.claudeNativeStartedAt = new Date().toISOString();
  runtime.claudeNativeLastError = undefined;
  runtime.claudeNativeInstallState = {
    ...(runtime.claudeNativeInstallState ?? emptyInstallState()),
    proxyConfigured: false,
    recoverablePartialState: false,
  };

  return {
    status: 200,
    body: {
      ok: true,
      running: true,
      proxyPort: transport.port,
      route: runtime.claudeNativeRoute,
      supportedHosts: CLAUDE_DESKTOP_REQUIRED_HOSTS,
      note: `Claude Desktop native interception is running on 127.0.0.1:${transport.port}. Keep this rflectr server running.`,
    },
  };
}

async function dashboardClaudeNativeStop(
  runtime: DashboardRuntime,
): Promise<{ status: number; body: unknown }> {
  const active = Boolean(runtime.claudeNativeTransport);
  const plan = idempotentStopState(active);
  if (!runtime.claudeNativeTransport) {
    return { status: 200, body: { ok: true, status: plan.status, reason: plan.reason } };
  }

  try {
    await runtime.claudeNativeTransport.close();
    runtime.claudeNativeTransport = null;
    runtime.claudeNativeStartedAt = undefined;
    runtime.claudeNativeRouteToken = undefined;
    return { status: 200, body: { ok: true, status: 'stopped', reason: 'native_runtime_stopped' } };
  } catch (error) {
    runtime.claudeNativeLastError = sanitizeDashboardError(error);
    return { status: 500, body: { error: { message: runtime.claudeNativeLastError ?? 'Native stop failed' } } };
  }
}

async function dashboardClaudeNativeUninstall(
  runtime: DashboardRuntime,
  body: JsonBody,
): Promise<{ status: number; body: unknown }> {
  await dashboardClaudeNativeStop(runtime);
  const consentedAt = typeof body.consentedAt === 'string' ? body.consentedAt : new Date().toISOString();
  const result = await uninstallOwnedNativeState({
    installState: runtime.claudeNativeInstallState ?? emptyInstallState(),
    consent: body.confirm === true ? { action: 'uninstall', consentedAt } : undefined,
    proxyAdapter: createOsProxyAdapter(),
  });
  if (result.status === 'ready' || result.status === 'noop') {
    runtime.claudeNativeInstallState = result.installState;
    return {
      status: 200,
      body: {
        ok: true,
        status: result.status,
        reason: result.reason,
        installState: result.installState,
        legacyGatewayUntouched: true,
      },
    };
  }
  return {
    status: result.status === 'blocked' ? 409 : result.status === 'not_owned' ? 423 : 501,
    body: {
      ok: false,
      status: result.status,
      reason: result.reason,
      manualRecovery: result.manualRecovery,
      legacyGatewayUntouched: true,
    },
  };
}

/**
 * POST /dashboard/api/claude-desktop/revert
 * Delegates legacy-gateway config cleanup to the Claude Desktop app-session
 * restore path. Does NOT touch claude-native runtime fields (lane isolation):
 * the native uninstall endpoint owns those.
 */
async function dashboardClaudeDesktopRevert(
  runtime: DashboardRuntime,
): Promise<{ status: number; body: unknown }> {
  void runtime; // claude-native lane is untouched here; param kept for signature parity.
  try {
    const lock = readSessionLock();
    if (!lock) {
      const noop: DesktopActionResult = { ok: true, status: 'noop', reason: 'no_owned_legacy_config' };
      return { status: 200, body: noop };
    }
    recoverSession();
    const result: DesktopActionResult = { ok: true, status: 'reverted', reason: 'legacy_gateway_config_restored' };
    return { status: 200, body: result };
  } catch (error) {
    const message = sanitizeDashboardError(error) ?? 'Claude Desktop revert failed';
    return {
      status: 500,
      body: {
        ok: false,
        status: 'runtime_error',
        reason: 'claude_desktop_revert_failed',
        message,
      },
    };
  }
}

/**
 * POST /dashboard/api/codex-desktop/revert
 * Delegates overlay/config restore to the Codex app-session restore path.
 * MUST NOT touch runtime.claudeNative* fields (lane isolation).
 */
async function dashboardCodexDesktopRevert(
  runtime: DashboardRuntime,
): Promise<{ status: number; body: unknown }> {
  void runtime;
  try {
    const restored = restoreCodexAppOverlay();
    const status: DesktopActionCategory = restored.restored ? 'reverted' : 'noop';
    const reason = restored.restored ? 'codex_overlay_config_restored' : 'no_owned_codex_config';
    const result: DesktopActionResult = { ok: true, status, reason };
    return { status: 200, body: result };
  } catch (error) {
    const message = sanitizeDashboardError(error) ?? 'Codex Desktop revert failed';
    return {
      status: 500,
      body: {
        ok: false,
        status: 'runtime_error',
        reason: 'codex_desktop_revert_failed',
        message,
      },
    };
  }
}

/**
 * POST /dashboard/api/codex-desktop/stop
 * Closes the runtime-registered Codex proxy handle, if any. Idempotent.
 * MUST NOT touch claude-native fields.
 */
async function dashboardCodexDesktopStop(
  runtime: DashboardRuntime,
): Promise<{ status: number; body: unknown }> {
  if (!runtime.codexProxy) {
    const noop: DesktopActionResult = { ok: true, status: 'noop', reason: 'codex_proxy_not_running' };
    return { status: 200, body: noop };
  }
  try {
    runtime.codexProxy.close();
  } catch {
    /* best-effort close of dashboard-managed proxy */
  }
  runtime.codexProxy = null;
  runtime.codexProxyStartedAt = undefined;
  const result: DesktopActionResult = { ok: true, status: 'stopped', reason: 'codex_proxy_stopped' };
  return { status: 200, body: result };
}

/**
 * POST /dashboard/api/server/kill
 * Closes ONLY the runtime-registered handles (codex proxy, claude-native
 * transport, claude-native probe transport). Does NOT call server.close() — the
 * dashboard JS warns the user the browser may disconnect. Never kills
 * Claude/Codex/OS processes.
 */
async function dashboardServerKill(
  runtime: DashboardRuntime,
): Promise<{ status: number; body: unknown }> {
  try {
    runtime.codexProxy?.close();
  } catch { /* ignore dashboard-managed proxy cleanup */ }
  runtime.codexProxy = null;
  runtime.codexProxyStartedAt = undefined;

  try {
    runtime.claudeNativeTransport?.close();
  } catch { /* ignore dashboard-managed native cleanup */ }
  runtime.claudeNativeTransport = null;
  runtime.claudeNativeStartedAt = undefined;

  try {
    runtime.claudeNativeProbe?.transport.close();
  } catch { /* ignore dashboard-managed probe cleanup */ }
  runtime.claudeNativeProbe = null;

  return {
    status: 200,
    body: {
      ok: true,
      status: 'killed',
      reason: 'runtime_handles_closed',
      browserMayDisconnect: true,
    } satisfies DesktopActionResult & { browserMayDisconnect: true },
  };
}

async function handleClaudeNativeInternalMessages(
  req: IncomingMessage,
  res: ServerResponse,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
  plog: PLog,
  activity: DashboardActivityBuffer,
  runtime: DashboardRuntime,
): Promise<void> {
  const token = headerString(req.headers['x-rflectr-native-token']);
  if (
    !runtime.claudeNativeTransport
    || !runtime.claudeNativeRouteToken
    || token !== runtime.claudeNativeRouteToken
    || !isLoopbackRemote(req.socket.remoteAddress)
  ) {
    sendJson(res, 403, { error: { message: 'Forbidden' } });
    return;
  }

  const activeRoute = runtime.claudeNativeRoute;
  if (!activeRoute) {
    sendJson(res, 409, { error: { message: 'Claude Desktop native route is not running' } });
    return;
  }

  const rawBody = await readBody(req);
  const originalHost = headerString(req.headers['x-rflectr-original-host']) ?? 'api.anthropic.com';
  const originalPath = headerString(req.headers['x-rflectr-original-path']) ?? '/v1/messages';
  const originalPort = Number.parseInt(headerString(req.headers['x-rflectr-original-port']) ?? '', 10);
  const intercepted: InterceptedRequest = {
    app: 'Claude Desktop',
    host: originalHost,
    port: Number.isFinite(originalPort) ? originalPort : 443,
    method: req.method ?? 'POST',
    path: originalPath,
    url: `https://${originalHost}${originalPath}`,
    headers: stripInternalNativeHeaders(req.headers as Record<string, string | string[] | undefined>),
    body: Buffer.from(rawBody),
  };
  const route: NativeRoutingRequest = {
    providerId: activeRoute.providerId,
    modelId: activeRoute.modelId,
    crossProviderConsent: activeRoute.consentedAt ? {
      destinationProviderId: activeRoute.providerId,
      consentedAt: activeRoute.consentedAt,
    } : undefined,
  };

  const activityStart = beginDashboardActivity('anthropic', route.modelId);
  const result = await routeClaudeDesktopAnthropicRequest({
    intercepted,
    route,
    models: options.catalog.list(),
    modelCache,
    apiKey: options.apiKey,
    backends: options.backends,
    gateway: options.gateway,
    vertex: options.vertex,
    target: serverResponseTarget(res),
    log: plog,
  });

  if (result.decision === 'routed') {
    completeDashboardActivity(activity, activityStart, result.dispatch.model, result.dispatch.status, result.dispatch.responseBody);
    return;
  }

  const errorBody = errorBodyForNativeRoutingResult(result);
  completeDashboardActivity(activity, activityStart, null, result.status, errorBody, result.reason);
  if (!res.headersSent) sendJson(res, result.status, errorBody);
  else res.end();
}

function routeNativeInterceptedRequest(req: InterceptedRequest, runtime: DashboardRuntime): RequestOutcome {
  const route = runtime.claudeNativeRoute;
  const token = runtime.claudeNativeRouteToken;
  if (!route || !token) return { action: 'deny', reason: 'native-route-not-running' };
  if (!isClaudeDesktopInferenceRequest({ host: req.host, method: req.method, path: req.path })) {
    return { action: 'allow' };
  }
  return {
    action: 'allow',
    upstreamUrl: `http://127.0.0.1:${runtime.port}${CLAUDE_NATIVE_INTERNAL_MESSAGES_PATH}`,
    headers: {
      ...req.headers,
      'x-rflectr-native-token': token,
      'x-rflectr-original-host': req.host,
      'x-rflectr-original-port': String(req.port),
      'x-rflectr-original-path': req.path,
      'x-rflectr-route-provider': route.providerId,
      'x-rflectr-route-model': route.modelId,
      'x-rflectr-route-consent-provider': route.consentedAt ? route.providerId : '',
      'x-rflectr-route-consented-at': route.consentedAt ?? '',
    },
  };
}

function stripInternalNativeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const output: Record<string, string | string[] | undefined> = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower === 'host' || lower.startsWith('x-rflectr-')) continue;
    output[name] = value;
  }
  return output;
}

function headerString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isLoopbackRemote(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function errorBodyForNativeRoutingResult(result: Exclude<NativeRoutingResult, { decision: 'routed' }>): unknown {
  if (result.decision === 'malformed' && result.classification?.decision === 'malformed') {
    return result.classification.errorBody;
  }
  return {
    type: 'error',
    error: {
      type: result.decision === 'consent_required' ? 'permission_error' : 'invalid_request_error',
      message: result.reason,
    },
  };
}

function jsonHookResponse(statusCode: number, body: unknown): HookResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function claudeDesktopAllowedHosts() {
  return CLAUDE_DESKTOP_REQUIRED_HOSTS.map(host => ({
    host,
    label: 'Claude Desktop',
    reason: 'claude-native-routing',
  }));
}

function parseCrossProviderConsent(body: JsonBody): CrossProviderConsent | undefined {
  const destinationProviderId = typeof body.consentDestinationProviderId === 'string'
    ? body.consentDestinationProviderId
    : typeof body.crossProviderConsent === 'object' && body.crossProviderConsent
      ? (body.crossProviderConsent as { destinationProviderId?: unknown }).destinationProviderId
      : undefined;
  if (typeof destinationProviderId !== 'string' || !destinationProviderId) return undefined;
  const consentedAt = typeof body.consentedAt === 'string'
    ? body.consentedAt
    : typeof body.crossProviderConsent === 'object' && body.crossProviderConsent
      ? (body.crossProviderConsent as { consentedAt?: unknown }).consentedAt
      : undefined;
  return {
    destinationProviderId,
    consentedAt: typeof consentedAt === 'string' ? consentedAt : new Date().toISOString(),
  };
}

async function dashboardCodexDesktopPayload(
  runtime: DashboardRuntime,
  body: JsonBody,
  options: ServerOptions,
): Promise<{ status: number; body: unknown }> {
  try {
    codexAppSupported();
  } catch (error) {
    return {
      status: 400,
      body: {
        ok: false,
        supported: false,
        message: error instanceof Error ? error.message : String(error),
        hint: codexAppInstallHint(),
      },
    };
  }

  const models = options.catalog.list().filter(model => model.modelFormat !== 'unsupported');
  if (models.length === 0) {
    return { status: 400, body: { error: { message: 'No supported models are available for Codex Desktop' } } };
  }

  const selectedModel = models[0]!;
  const routes = models.map(model => serverModelToCodexRoute(model, options));
  const localModels = models.map(serverModelToLocalProviderModel);
  const catalogPath = getAppCatalogPath('dashboard');

  try {
    runtime.codexProxy?.close();
  } catch { /* ignore stale dashboard proxy */ }

  try {
    const proxyHandle = await startCodexProxy(routes, { requireAuth: false });
    runtime.codexProxy = proxyHandle;
    runtime.codexProxyStartedAt = new Date().toISOString();

    writeOverlayFile(catalogPath, serializeCatalog(buildAppCatalogFile(localModels, 'rflectr dashboard', selectedModel.id)));

    const firstRoute = routeForSpec(selectedModel, routes[0]!);
    const spec: CodexAppConfigSpec = {
      route: firstRoute,
      proxyPort: proxyHandle.port,
      catalogPath,
    };

    saveAppRestoreStateBeforePatch();
    const backupPath = backupConfigToml();
    applyAppConfigPatch(spec);
    writeAppSessionLock({
      pid: process.pid,
      startedAt: runtime.codexProxyStartedAt,
      configPath: getCodexConfigPath(),
      catalogPaths: [catalogPath],
      restoreStatePath: getAppRestoreStatePath(),
      backupPath,
      proxyPort: proxyHandle.port,
    });

    let launchError: string | undefined;
    let note = `Codex Desktop configured for ${localModels.length} model(s) through 127.0.0.1:${proxyHandle.port}. Keep this rflectr server running.`;
    if (body.launch === true) {
      if (isCodexAppRunning()) {
        note += ' Codex is already running; quit and reopen it if it does not pick up the new config.';
      } else {
        try {
          openCodexApp();
          note += ' Codex Desktop opened.';
        } catch (error) {
          launchError = sanitizeDashboardError(error);
          note += ` ${codexAppInstallHint()}`;
        }
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        supported: true,
        baseUrl: `http://127.0.0.1:${proxyHandle.port}/v1`,
        proxyPort: proxyHandle.port,
        configPath: getCodexConfigPath(),
        catalogPath,
        modelCount: localModels.length,
        selectedModelId: selectedModel.id,
        note,
        launchError,
      },
    };
  } catch (error) {
    try {
      runtime.codexProxy?.close();
    } catch { /* ignore */ }
    runtime.codexProxy = null;
    runtime.codexProxyStartedAt = undefined;
    return { status: 500, body: { error: { message: sanitizeDashboardError(error) ?? 'Codex Desktop setup failed' } } };
  }
}

function routeForSpec(model: ServerModelInfo, route: CodexProxyRoute): CodexAppConfigSpec['route'] {
  return {
    tier: 'proxy',
    npm: route.npm,
    baseURL: route.baseURL,
    upstreamModelId: route.upstreamModelId,
    apiKey: route.apiKey,
    contextWindow: route.contextWindow,
    modelId: route.modelId,
    providerId: route.providerId ?? gatewayProviderId(model),
    authType: route.authType,
    oauthAccountId: route.oauthAccountId,
    supportedParameters: route.supportedParameters,
    reasoning: route.reasoning,
    interleavedReasoningField: route.interleavedReasoningField,
  };
}

function serverModelToCodexRoute(model: ServerModelInfo, options: ServerOptions): CodexProxyRoute {
  const npm = model.npm ?? (model.modelFormat === 'anthropic' ? '@ai-sdk/anthropic' : '@ai-sdk/openai-compatible');
  return {
    modelId: model.id,
    npm,
    apiKey: model.apiKey ?? options.apiKey,
    baseURL: codexBaseUrlForModel(model, options),
    upstreamModelId: upstreamModelId(model),
    providerId: gatewayProviderId(model),
    authType: model.authType,
    oauthAccountId: model.oauthAccountId,
    supportedParameters: model.supportedParameters,
    reasoning: model.reasoning,
    interleavedReasoningField: model.interleavedReasoningField,
    contextWindow: model.contextWindow,
    headers: model.headers,
  };
}

function codexBaseUrlForModel(model: ServerModelInfo, options: ServerOptions): string | undefined {
  if (model.sourceBackend === 'zen' || model.sourceBackend === 'go') {
    const baseUrl = backendFor(options, model).baseUrl;
    return model.modelFormat === 'anthropic' ? baseUrl : `${baseUrl}/v1`;
  }
  return model.apiBaseUrl
    ?? model.completionsUrl?.replace(/\/chat\/completions$/, '')
    ?? model.baseUrl;
}

function serverModelToLocalProviderModel(model: ServerModelInfo): LocalProviderModel {
  return {
    id: model.id,
    name: model.name,
    family: model.brand,
    brand: model.brand,
    modelFormat: model.modelFormat === 'anthropic' ? 'anthropic' : 'openai',
    upstreamModelId: upstreamModelId(model),
    baseUrl: model.baseUrl,
    completionsUrl: model.completionsUrl,
    npm: model.npm,
    apiBaseUrl: model.apiBaseUrl,
    cost: model.cost,
    contextWindow: model.contextWindow,
    supportedParameters: model.supportedParameters,
    reasoning: model.reasoning,
    interleavedReasoningField: model.interleavedReasoningField,
    headers: model.headers,
  };
}

async function refreshActiveCatalog(options: ServerOptions, modelCache: Map<string, LanguageModel>): Promise<void> {
  if (!options.refreshCatalog) return;
  options.catalog = await options.refreshCatalog();
  modelCache.clear();
}

async function runDashboardModelTest(
  body: JsonBody,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
  activity: DashboardActivityBuffer,
): Promise<{ status: number; body: unknown }> {
  const providerId = typeof body.providerId === 'string' ? body.providerId : '';
  const requestedModelId = typeof body.modelId === 'string' ? body.modelId : '';
  const models = options.catalog.list();
  const model = requestedModelId
    ? options.catalog.get(requestedModelId)
    : models.find(entry => gatewayProviderId(entry) === providerId && entry.modelFormat !== 'unsupported');
  if (!model) {
    return {
      status: 404,
      body: { error: { message: requestedModelId ? `Unknown model: ${requestedModelId}` : `No supported models for provider: ${providerId}` } },
    };
  }
  if (model.modelFormat === 'unsupported') {
    return { status: 400, body: { error: { message: `Unsupported model format: ${model.modelFormat}` } } };
  }

  const startedAt = Date.now();
  const tool: 'anthropic' | 'openai' = model.modelFormat === 'anthropic' ? 'anthropic' : 'openai';
  const activityStart = beginDashboardActivity(tool, model.id);
  try {
    let response: unknown;
    if (model.modelFormat === 'anthropic') {
      response = await testAnthropicModel(model, options, modelCache);
    } else {
      response = await testOpenAiModel(model, options, modelCache);
    }
    completeDashboardActivity(activity, activityStart, model, 200, response);
    return {
      status: 200,
      body: {
        ok: true,
        providerId: gatewayProviderId(model),
        providerLabel: model.providerLabel ?? gatewayProviderId(model),
        modelId: model.id,
        modelName: model.name,
        format: model.modelFormat,
        latencyMs: Math.max(0, Date.now() - startedAt),
        preview: extractTestPreview(response),
        usage: extractTestUsage(response),
      },
    };
  } catch (error) {
    const status = error instanceof DashboardTestHttpError ? error.status : 502;
    const responseBody = error instanceof DashboardTestHttpError ? error.body : undefined;
    completeDashboardActivity(activity, activityStart, model, status, responseBody, error);
    return {
      status,
      body: {
        ok: false,
        providerId: gatewayProviderId(model),
        modelId: model.id,
        error: { message: sanitizeDashboardError(error) ?? 'Provider test failed' },
      },
    };
  }
}

async function testAnthropicModel(
  model: ServerModelInfo,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
): Promise<unknown> {
  const body = {
    model: upstreamModelId(model),
    max_tokens: 8,
    temperature: 0,
    stream: false,
    messages: [{ role: 'user', content: 'Reply with exactly: rflectr ok' }],
  };

  if (model.modelFormat === 'anthropic' && (!model.npm || model.baseUrl || model.sourceBackend === 'zen' || model.sourceBackend === 'go')) {
    if (model.baseUrl && !/^https?:\/\//i.test(model.baseUrl)) {
      throw new Error('Invalid provider baseUrl: must be http:// or https://');
    }
    const messagesUrl = model.baseUrl
      ? `${model.baseUrl}/v1/messages`
      : `${backendFor(options, model).baseUrl}/v1/messages`;
    const upstream = await postJsonUpstream(messagesUrl, body, model.apiKey ?? options.apiKey);
    if (upstream.status < 200 || upstream.status >= 300) throw new DashboardTestHttpError(upstream.status, upstream.body);
    return upstream.body;
  }

  const npm = model.npm || '@ai-sdk/anthropic';
  const languageModel = await getOrInitLanguageModel(modelCache, model, npm, model.baseUrl, model.apiKey ?? options.apiKey, options.vertex);
  const params = sdkTranslateRequest(body as AnthropicRequest, npm);
  return generateAnthropicResponse(languageModel, params, model.id);
}

async function testOpenAiModel(
  model: ServerModelInfo,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
): Promise<unknown> {
  const body = {
    model: upstreamModelId(model),
    messages: [{ role: 'user', content: 'Reply with exactly: rflectr ok' }],
    temperature: 0,
    max_tokens: 8,
    stream: false,
  };

  if (supportsDirectOpenAIChatCompletions(model)) {
    if (model.completionsUrl && !/^https?:\/\//i.test(model.completionsUrl)) {
      throw new Error('Invalid provider completionsUrl: must be http:// or https://');
    }
    const completionsUrl = model.completionsUrl
      ? model.completionsUrl
      : `${backendFor(options, model).baseUrl}/v1/chat/completions`;
    const upstream = await postJsonUpstream(completionsUrl, body, model.apiKey ?? options.apiKey);
    if (upstream.status < 200 || upstream.status >= 300) throw new DashboardTestHttpError(upstream.status, upstream.body);
    return upstream.body;
  }

  const npm = model.npm;
  if (!npm) throw new Error(`No SDK provider for model: ${model.id}`);
  const languageModel = await getOrInitLanguageModel(modelCache, model, npm, model.apiBaseUrl, model.apiKey ?? options.apiKey, options.vertex);
  const params = translateOpenAiRequest(body as OpenAiRequest);
  return generateOpenAiResponse(languageModel, params, model.id);
}

class DashboardTestHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(extractProviderErrorMessage(body) ?? `Provider returned HTTP ${status}`);
  }
}

function extractProviderErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const error = (body as { error?: unknown }).error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return undefined;
}

function extractTestPreview(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const content = (body as { content?: unknown }).content;
  if (Array.isArray(content)) {
    const text = content.map(part => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') return (part as { text: string }).text;
      return '';
    }).join('').trim();
    if (text) return text.slice(0, 160);
  }
  const choices = (body as { choices?: unknown }).choices;
  if (Array.isArray(choices)) {
    const first = choices[0];
    if (first && typeof first === 'object') {
      const message = (first as { message?: { content?: unknown } }).message;
      if (typeof message?.content === 'string') return message.content.slice(0, 160);
      const text = (first as { text?: unknown }).text;
      if (typeof text === 'string') return text.slice(0, 160);
    }
  }
  return null;
}

function extractTestUsage(body: unknown): { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } {
  if (!body || typeof body !== 'object') return { inputTokens: null, outputTokens: null, totalTokens: null };
  const usage = (body as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== 'object') return { inputTokens: null, outputTokens: null, totalTokens: null };
  const inputTokens = testNumberOrNull(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = testNumberOrNull(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = testNumberOrNull(usage.total_tokens) ?? (inputTokens !== null || outputTokens !== null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null);
  return { inputTokens, outputTokens, totalTokens };
}

function testNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isDashboardMutation(req: IncomingMessage): boolean {
  return req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE';
}

async function handleAnthropicMessages(
  req: IncomingMessage,
  res: ServerResponse,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
  plog: PLog,
  activity: DashboardActivityBuffer,
): Promise<void> {
  const body = await readJson(req);
  if (!body) {
    sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
    return;
  }
  const activityStart = beginDashboardActivity('anthropic', body.model);
  const betaHeaderRaw = req.headers['anthropic-beta'];
  const inboundBeta = Array.isArray(betaHeaderRaw) ? betaHeaderRaw.join(',') : betaHeaderRaw;
  const result = await dispatchAnthropicMessages({
    body,
    inboundBeta,
    catalog: options.catalog,
    modelCache,
    apiKey: options.apiKey,
    backends: options.backends,
    gateway: options.gateway,
    vertex: options.vertex,
    target: serverResponseTarget(res),
    log: plog,
  });
  if (result.decision === 'model_not_found') {
    plog(`model not found: ${String(body.model)}`);
  }
  completeDashboardActivity(
    activity,
    activityStart,
    result.model,
    result.status,
    result.responseBody,
    result.decision === 'routed' ? undefined : result.safeDiagnostic,
  );
  return;

}

async function handleOpenAIChatCompletions(
  req: IncomingMessage,
  res: ServerResponse,
  options: ServerOptions,
  modelCache: Map<string, LanguageModel>,
  plog: PLog,
  activity: DashboardActivityBuffer,
): Promise<void> {
  const body = await readJson(req);
  if (!body) {
    sendJson(res, 400, { error: { message: 'Invalid JSON body' } });
    return;
  }
  const activityStart = beginDashboardActivity('openai', body.model);

  const model = lookupModel(res, options.catalog, body.model);
  if (!model) {
    completeDashboardActivity(activity, activityStart, null, res.statusCode || 400);
    return;
  }

  if (supportsDirectOpenAIChatCompletions(model)) {
    if (model.completionsUrl && !/^https?:\/\//i.test(model.completionsUrl)) {
      sendJson(res, 400, { error: { message: `Invalid provider completionsUrl: must be http:// or https://` } });
      completeDashboardActivity(activity, activityStart, model, 400);
      return;
    }
    const completionsUrl = model.completionsUrl
      ? model.completionsUrl
      : `${backendFor(options, model).baseUrl}/v1/chat/completions`;
    const apiKey = model.apiKey ?? options.apiKey;
    await relayAnthropicMessages(res, completionsUrl, body, apiKey, Boolean(body.stream));
    completeDashboardActivity(activity, activityStart, model, res.statusCode || 200);
    return;
  }

  // SDK Translation Path
  const npm = model.npm || (model.modelFormat === 'anthropic' ? '@ai-sdk/anthropic' : undefined);
  if (!npm) {
    sendJson(res, 400, { error: { message: `No SDK provider for model: ${model.id}` } });
    completeDashboardActivity(activity, activityStart, model, 400);
    return;
  }

  const apiKey = model.apiKey ?? options.apiKey;
  const baseURL = model.modelFormat === 'anthropic' ? model.baseUrl : model.apiBaseUrl;
  const languageModel = await getOrInitLanguageModel(modelCache, model, npm, baseURL, apiKey, options.vertex);
  const params = translateOpenAiRequest(body as unknown as OpenAiRequest);
  const clientWantsStream = Boolean(body.stream);
  const responseModelId = getResponseModelId(body.model, model, options);

  plog(() => `sdk-openai npm=${npm} upstream=${upstreamModelId(model)} responseModel=${responseModelId} stream=${clientWantsStream}`);

  try {
    if (clientWantsStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      await streamOpenAiResponse(languageModel, params, responseModelId, chunk => res.write(chunk));
      res.end();
      completeDashboardActivity(activity, activityStart, model, 200);
    } else {
      const response = await generateOpenAiResponse(languageModel, params, responseModelId);
      sendJson(res, 200, response);
      completeDashboardActivity(activity, activityStart, model, 200, response);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) sendJson(res, 502, { error: { message } });
    else res.end();
    completeDashboardActivity(activity, activityStart, model, 502, undefined, err);
  }
}

function serverResponseTarget(res: ServerResponse): AnthropicDispatchTarget {
  return {
    get headersSent() {
      return res.headersSent;
    },
    writeHead(status, headers) {
      res.writeHead(status, headers);
    },
    write(chunk) {
      res.write(chunk);
    },
    end(chunk) {
      res.end(chunk);
    },
  };
}

function lookupModel(res: ServerResponse, catalog: ModelCatalog, modelId: unknown): ServerModelInfo | null {
  if (typeof modelId !== 'string') {
    sendJson(res, 400, { error: { message: 'Request body must include a model string' } });
    return null;
  }

  const model = catalog.get(modelId);
  if (!model) {
    sendJson(res, 400, { error: { message: `Unknown model: ${modelId}` } });
    return null;
  }

  return model;
}

function backendFor(options: ServerOptions, model: ServerModelInfo): ServerBackend {
  if (model.sourceBackend === 'vertex') {
    throw new Error(`Vertex models route through the SDK adapter, not cloud backends: ${model.id}`);
  }
  if (model.sourceBackend === 'zen') return options.backends.zen;
  if (model.sourceBackend === 'go') return options.backends.go;
  throw new Error(`Provider ${model.sourceBackend} is not a cloud backend — model must set baseUrl/completionsUrl`);
}

async function getOrInitLanguageModel(
  modelCache: Map<string, LanguageModel>,
  model: ServerModelInfo,
  npm: string,
  baseURL: string | undefined,
  apiKey: string,
  vertex: VertexServerConfig | undefined,
): Promise<LanguageModel> {
  return getOrInitDispatchLanguageModel(modelCache, model, npm, baseURL, apiKey, vertex);
}

function getResponseModelId(bodyModel: unknown, model: ServerModelInfo, options: ServerOptions): string {
  return options.gateway?.maskGatewayIds
    ? gatewayDisplayName(model, options.gateway)
    : (typeof bodyModel === 'string' ? bodyModel : model.id);
}

async function readJson(req: IncomingMessage): Promise<JsonBody | null> {
  try {
    const raw = await readBody(req);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
}

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, sanitizeIncomingHeaderValue(item));
    } else if (value !== undefined) {
      headers.set(name, sanitizeIncomingHeaderValue(value));
    }
  }

  return new Request('http://localhost/', { headers });
}

/** HTTP headers cannot contain CR/LF — common when a multi-line secret is pasted into a client. */
function sanitizeIncomingHeaderValue(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim();
}
