// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { isAuthorized } from './auth.js';
import {
  formatGatewayAnthropicModels,
  formatOpenAIModels,
  gatewayDisplayName,
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
import { createLanguageModel, isSdkMigratedNpm } from '../provider-factory.js';
import {
  translateRequest as sdkTranslateRequest,
  streamAnthropicResponse,
  generateAnthropicResponse,
  silenceSdkWarnings,
  anthropicEffortFromRequest,
  type AnthropicRequest,
} from '../sdk-adapter.js';
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

    if (!isAuthorized(toRequest(req), options.serverPassword)) {
      sendJson(res, 401, { error: { message: 'Unauthorized' } });
      return;
    }

    if (pathname.startsWith(DASHBOARD_API_PREFIX)) {
      await handleDashboardApi(req, res, pathname, options, modelCache, activity, runtime);
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

  sendJson(res, 404, { error: { message: 'Not found' } });
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

async function refreshActiveCatalog(options: ServerOptions, modelCache: Map<string, LanguageModel>): Promise<void> {
  if (!options.refreshCatalog) return;
  options.catalog = await options.refreshCatalog();
  modelCache.clear();
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

  const model = lookupModel(res, options.catalog, body.model);
  if (!model) {
    plog(`model not found: ${body.model}`);
    completeDashboardActivity(activity, activityStart, null, res.statusCode || 400);
    return;
  }

  plog(() => `anthropic-messages model=${body.model} format=${model.modelFormat} npm=${model.npm ?? 'none'} stream=${body.stream}`);

  if (model.modelFormat === 'anthropic') {
    if (model.baseUrl && !/^https?:\/\//i.test(model.baseUrl)) {
      sendJson(res, 400, { error: { message: `Invalid provider baseUrl: must be http:// or https://` } });
      completeDashboardActivity(activity, activityStart, model, 400);
      return;
    }
    const messagesUrl = model.baseUrl
      ? `${model.baseUrl}/v1/messages`
      : `${backendFor(options, model).baseUrl}/v1/messages`;
    const apiKey = model.apiKey ?? options.apiKey;
    const betaHeaderRaw = req.headers['anthropic-beta'];
    const inboundBeta = Array.isArray(betaHeaderRaw) ? betaHeaderRaw.join(',') : betaHeaderRaw;
    plog(() => `anthropic-passthrough → ${messagesUrl}`);
    const upstreamBody = { ...body, model: upstreamModelId(model) };
    if (model.headers && Object.keys(model.headers).length > 0) {
      // Anthropic-format Portkey route: relay with extra routing headers (AC-10)
      await relayAnthropicMessages(res, messagesUrl, upstreamBody, apiKey, Boolean(body.stream), inboundBeta, model.headers);
      completeDashboardActivity(activity, activityStart, model, res.statusCode || 200);
    } else {
      const upstream = await forwardJson(res, messagesUrl, upstreamBody, apiKey, inboundBeta);
      completeDashboardActivity(activity, activityStart, model, upstream.status, upstream.body);
    }
    return;
  }

  if (model.modelFormat === 'openai') {
    if (!isSdkMigratedNpm(model.npm)) {
      sendJson(res, 400, { error: { message: `No SDK provider for model: ${model.id}` } });
      completeDashboardActivity(activity, activityStart, model, 400);
      return;
    }
    const apiKey = model.apiKey ?? options.apiKey;
    const languageModel = await getOrInitLanguageModel(modelCache, model, model.npm!, model.apiBaseUrl, apiKey, options.vertex);
    const params = sdkTranslateRequest(body as unknown as AnthropicRequest, model.npm!, {
      defaultEffort: anthropicEffortFromRequest(body as AnthropicRequest) ? undefined : model.defaultEffort,
      openAiOAuth: model.npm === '@ai-sdk/openai' && model.authType === 'oauth',
      reasoningMetadata: {
        providerId: model.providerId,
        apiBaseUrl: model.apiBaseUrl,
        supportedParameters: model.supportedParameters,
        reasoning: model.reasoning,
        interleavedReasoningField: model.interleavedReasoningField,
      },
    });
    const clientWantsStream = Boolean(body.stream);
    // Use the display name in the response model field when masking is on — Claude
    // Desktop shows the response model field in its status bar chip, so this surfaces
    // human-readable names ("Grok 4.3 (xAI)") instead of the reversed gateway IDs.
    const responseModelId = getResponseModelId(body.model, model, options);

    plog(() => `sdk npm=${model.npm} upstream=${upstreamModelId(model)} responseModel=${responseModelId} stream=${clientWantsStream}`);

    try {
      if (clientWantsStream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        await streamAnthropicResponse(languageModel, params, responseModelId, chunk => res.write(chunk));
        res.end();
        completeDashboardActivity(activity, activityStart, model, 200);
      } else {
        const anthropicResponse = await generateAnthropicResponse(languageModel, params, responseModelId);
        sendJson(res, 200, anthropicResponse);
        completeDashboardActivity(activity, activityStart, model, 200, anthropicResponse);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) sendJson(res, 502, { error: { message } });
      else res.end();
      completeDashboardActivity(activity, activityStart, model, 502, undefined, err);
    }
    return;
  }

  sendJson(res, 400, { error: { message: `Unsupported model format: ${model.modelFormat}` } });
  completeDashboardActivity(activity, activityStart, model, 400);
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
  // Include a stable serialization of routing headers so two Portkey models with
  // the same base URL but different x-portkey-config / x-portkey-virtual-key
  // are not erroneously served from the same cached LanguageModel.
  const headersKey = model.headers && Object.keys(model.headers).length > 0
    ? JSON.stringify(Object.fromEntries(Object.entries(model.headers).sort(([a], [b]) => a.localeCompare(b))))
    : '';
  const cacheKey = [
    model.providerId ?? model.sourceBackend,
    model.id,
    upstreamModelId(model),
    npm,
    baseURL ?? '',
    headersKey,
  ].join('\x1f');
  let languageModel = modelCache.get(cacheKey);
  if (!languageModel) {
    languageModel = await createLanguageModel({
      npm,
      modelId: upstreamModelId(model),
      apiKey,
      baseURL,
      providerId: model.providerId ?? model.sourceBackend,
      authType: model.authType,
      oauthAccountId: model.oauthAccountId,
      headers: model.headers,
      vertex,
    });
    modelCache.set(cacheKey, languageModel);
  }
  return languageModel;
}

function getResponseModelId(bodyModel: unknown, model: ServerModelInfo, options: ServerOptions): string {
  return options.gateway?.maskGatewayIds
    ? gatewayDisplayName(model, options.gateway)
    : (typeof bodyModel === 'string' ? bodyModel : model.id);
}

async function forwardJson(res: ServerResponse, url: string, body: JsonBody, apiKey: string, inboundBeta?: string): Promise<{ status: number; body: unknown }> {
  const upstream = await postJsonUpstream(url, body, apiKey, inboundBeta);
  sendJson(res, upstream.status, upstream.body);
  return upstream;
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
