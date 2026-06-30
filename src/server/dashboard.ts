// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSION } from '../constants.js';
import { saveProviderCredential } from '../env.js';
import {
  getServerFavoritesOnly,
  getServerMaskGatewayIds,
  getServerRequestTracing,
  loadPreferences,
  savePreferences,
  setServerFavoritesOnly,
  setServerMaskGatewayIds,
  setServerRequestTracing,
} from '../config.js';
import { addFavorite, removeFavorite } from '../favorites.js';
import { addProviderFromTemplate } from '../registry/add-template.js';
import { removeProviderFromRegistry } from '../registry/crud.js';
import { importFromOpencode } from '../registry/import-opencode.js';
import { loadRegistry, saveRegistry } from '../registry/io.js';
import { validateCustomEndpointUrl } from '../registry/url-security.js';
import type { RegistrySubscriptionFilter } from '../registry/types.js';
import { getTemplateById, listAddableTemplates } from '../provider-templates.js';
import type { FavoriteModel, UserPreferences } from '../types.js';
import type { GatewayModelOptions, ServerModelInfo } from './models.js';
import { gatewayProviderId, gatewayProviderLabel, exposedGatewayAliasId } from './models.js';
import { getConfigLibraryPath, writeRflectrConfig } from '../claude-desktop/app-config.js';
import { claudeAppSupported, isClaudeAppRunning, openClaudeApp } from '../claude-desktop/app-launch.js';
import { evaluateClaudeNativeEnablement } from '../desktop-interception/claude-target.js';
import { DESKTOP_APP_LANES, type LaneId } from '../desktop-interception/app-targets.js';
import { currentClaudeNativeTuple, recordedClaudeNativeTuple } from '../desktop-interception/claude-native-state.js';
import type { VerificationResult } from '../desktop-interception/verify.js';
import type { CodexProxyHandle } from '../codex-proxy.js';
import type { DesktopInterceptionTransport } from '../desktop-interception/transport.js';
import type { NativeInstallState } from '../desktop-interception/state.js';

export const DASHBOARD_ROUTE_PREFIX = '/dashboard';
export const DASHBOARD_API_PREFIX = '/dashboard/api';
export const DASHBOARD_MUTATION_HEADER = 'x-rflectr-dashboard';
export const DEFAULT_ACTIVITY_LIMIT = 500;

type DashboardStatus = 'success' | 'error' | 'retry';
type DashboardTool = 'anthropic' | 'openai' | 'unknown';
type DashboardDefaultTool = NonNullable<UserPreferences['defaultTool']>;

export interface DashboardRuntime {
  startedAt: number;
  host: string;
  port: number;
  local: boolean;
  gateway?: GatewayModelOptions;
  restartSupported?: boolean;
  requestRestart?: () => void;
  serverPassword?: string | null;
  codexProxy?: CodexProxyHandle | null;
  codexProxyStartedAt?: string;
  claudeNativeVerification?: VerificationResult;
  claudeNativeProbe?: {
    transport: DesktopInterceptionTransport;
    observedHosts: Set<string>;
    startedAt: string;
    installed: boolean;
  } | null;
  claudeNativeTransport?: DesktopInterceptionTransport | null;
  claudeNativeStartedAt?: string;
  claudeNativeInstallState?: NativeInstallState;
  claudeNativeRoute?: {
    providerId: string;
    modelId: string;
    routeModelId?: string;
    providerLabel?: string;
    consentedAt?: string;
  };
  claudeNativeRouteToken?: string;
  claudeNativeLastError?: string;
  /** PRD-023e per-lane state. Keys are LaneId. */
  lanes?: Partial<Record<LaneId, LaneRuntimeState>>;
}

export interface LaneRuntimeState {
  readonly laneId: LaneId;
  readonly attachMechanism: 'native-interception' | 'config-profile';
  readonly isolation: 'app-scoped-proxy' | 'config-only';
  running: boolean;
  startedAt?: string;
  /** OS proxy/trust snapshot captured before any mutation (hard rollback). */
  proxySnapshot?: { mode: 'unknown' | 'direct' | 'manual'; host?: string; port?: number };
  lastError?: string;
}

/** Desktop-app lane status DTO surfaced to the dashboard UI (PRD-023e). */
export interface DesktopLaneStatusDto {
  laneId: LaneId;
  appName: string;
  attachMechanism: 'native-interception' | 'config-profile';
  isolation: 'app-scoped-proxy' | 'config-only';
  preferred: boolean;
  running: boolean;
  status: string; // human-readable lane status
  controls: readonly string[];
}

export interface DesktopAppsStatusDto {
  lanes: DesktopLaneStatusDto[];
}

export interface DashboardClaudeDesktopBody {
  launch?: unknown;
}

export interface DashboardCodexDesktopBody {
  launch?: unknown;
}

export interface DashboardActivityEvent {
  id: string;
  startedAt: string;
  endedAt: string;
  tool: DashboardTool;
  model: string;
  upstreamModel?: string;
  providerId: string;
  providerLabel: string;
  backend: string;
  status: DashboardStatus;
  httpStatus: number;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  error?: string;
}

export interface ActivityStart {
  startedAt: number;
  tool: DashboardTool;
  requestedModel: unknown;
}

export class DashboardActivityBuffer {
  private readonly events: DashboardActivityEvent[] = [];

  constructor(private readonly maxEvents = DEFAULT_ACTIVITY_LIMIT) {}

  append(event: DashboardActivityEvent): void {
    this.events.push(redactActivityEvent(event));
    while (this.events.length > this.maxEvents) this.events.shift();
  }

  list(): DashboardActivityEvent[] {
    return [...this.events].reverse();
  }
}

export function beginDashboardActivity(tool: DashboardTool, requestedModel: unknown): ActivityStart {
  return {
    startedAt: Date.now(),
    tool,
    requestedModel,
  };
}

export function completeDashboardActivity(
  buffer: DashboardActivityBuffer,
  start: ActivityStart,
  model: ServerModelInfo | null,
  httpStatus: number,
  responseBody?: unknown,
  error?: unknown,
): void {
  const endedAt = Date.now();
  const usage = extractUsage(responseBody);
  const status: DashboardStatus = httpStatus === 429 || httpStatus >= 500 ? 'retry' : httpStatus >= 400 || error ? 'error' : 'success';
  const providerId = model ? gatewayProviderId(model) : 'unknown';
  const providerLabel = model ? gatewayProviderLabel(model) : 'Unknown';
  const modelId = model?.id ?? (typeof start.requestedModel === 'string' ? start.requestedModel : 'unknown');

  buffer.append({
    id: `${endedAt}-${Math.random().toString(36).slice(2, 10)}`,
    startedAt: new Date(start.startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    tool: start.tool,
    model: modelId,
    upstreamModel: model?.upstreamModelId,
    providerId,
    providerLabel,
    backend: providerId,
    status,
    httpStatus,
    latencyMs: Math.max(0, endedAt - start.startedAt),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    error: sanitizeDashboardError(error),
  });
}

export function redactActivityEvent(event: DashboardActivityEvent): DashboardActivityEvent {
  return {
    id: String(event.id),
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    tool: event.tool,
    model: event.model,
    upstreamModel: event.upstreamModel,
    providerId: event.providerId,
    providerLabel: event.providerLabel,
    backend: event.backend,
    status: event.status,
    httpStatus: event.httpStatus,
    latencyMs: event.latencyMs,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    totalTokens: event.totalTokens,
    error: event.error ? sanitizeDashboardError(event.error) : undefined,
  };
}

export function dashboardOverview(models: ServerModelInfo[], activity: DashboardActivityEvent[]) {
  const recent = [...activity].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const completed = recent.filter(event => event.status === 'success' || event.status === 'error');
  const successes = completed.filter(event => event.status === 'success').length;
  const latencies = completed.map(event => event.latencyMs).filter(n => Number.isFinite(n));
  return {
    kpis: {
      requestsToday: recent.filter(event => isToday(event.startedAt)).length,
      successRate: completed.length === 0 ? 1 : successes / completed.length,
      activeRoutes: models.length,
      averageLatencyMs: latencies.length === 0 ? 0 : Math.round(latencies.reduce((sum, n) => sum + n, 0) / latencies.length),
    },
    routes: dashboardRoutes(models),
    recentActivity: recent.slice(0, 6),
    volumeBuckets: buildVolumeBuckets(recent),
  };
}

export function dashboardRoutes(models: ServerModelInfo[]) {
  return models.map(model => ({
    tool: model.modelFormat === 'anthropic' ? 'Claude / Anthropic' : 'OpenAI-compatible',
    gateway: 'rflectr',
    model: model.name,
    modelId: model.id,
    backend: gatewayProviderLabel(model),
    providerId: gatewayProviderId(model),
    status: model.modelFormat === 'unsupported' ? 'unsupported' : 'ready',
    latencyMs: null,
  }));
}

export function dashboardActivityPayload(activity: DashboardActivityEvent[], filter: string | null) {
  const events = filter === 'errors'
    ? activity.filter(event => event.status === 'error')
    : filter === 'retries'
    ? activity.filter(event => event.status === 'retry')
    : activity;
  return {
    counts: {
      succeeded: activity.filter(event => event.status === 'success').length,
      retried: activity.filter(event => event.status === 'retry').length,
      errored: activity.filter(event => event.status === 'error').length,
    },
    events,
    costCaveat: 'Costs for non-Anthropic translated providers are estimates.',
  };
}

export function dashboardProviders(models: ServerModelInfo[]) {
  const registry = loadRegistry();
  const configuredProviderIds = new Set(registry.providers.map(provider => provider.id));
  const byProvider = new Map<string, ServerModelInfo[]>();
  for (const model of models) {
    const id = gatewayProviderId(model);
    if (isOpenCodeProviderId(id) && !configuredProviderIds.has(id)) continue;
    byProvider.set(id, [...(byProvider.get(id) ?? []), model]);
  }

  const providerIds = new Set([...byProvider.keys(), ...registry.providers.map(p => p.id)]);
  return [...providerIds].sort().map(id => {
    const registryProvider = registry.providers.find(p => p.id === id);
    const providerModels = byProvider.get(id) ?? [];
    const sample = providerModels[0];
    return {
      id,
      name: registryProvider?.name ?? sample?.providerLabel ?? (id === 'zen' ? 'OpenCode Zen' : id === 'go' ? 'OpenCode Go' : id),
      enabled: registryProvider?.enabled ?? true,
      status: providerStatus(registryProvider?.authType, registryProvider?.authRef),
      auth: credentialSummary(registryProvider?.authType, registryProvider?.authRef, sample?.authType),
      modelCount: providerModels.length || registryProvider?.modelsCache?.models.length || 0,
      source: registryProvider ? 'registry' : 'runtime',
      templateId: registryProvider?.templateId ?? null,
      baseUrl: registryProvider?.api?.url ?? null,
      refreshedAt: registryProvider?.refreshedAt ?? registryProvider?.modelsCache?.fetchedAt ?? null,
    };
  });
}

export function dashboardProviderTemplates() {
  const registry = loadRegistry();
  return listAddableTemplates(registry.providers.map(provider => provider.id)).map(template => ({
    id: template.id,
    name: template.name,
    npm: template.npm,
    authType: template.authType,
    defaultBaseUrl: template.defaultBaseUrl ?? null,
    signupUrl: template.signupUrl ?? null,
    apiKeyOptional: template.apiKeyOptional === true,
    urlPrompt: template.urlPrompt ?? null,
  }));
}

export async function dashboardImportOpenCode(): Promise<{ status: number; body: unknown }> {
  const result = await importFromOpencode({
    resolveConflict: async () => 'import',
  });
  if (result.error) {
    return { status: 502, body: { error: { message: result.error }, result } };
  }
  return {
    status: 200,
    body: {
      imported: result.imported.map(provider => ({ id: provider.id, name: provider.name })),
      skipped: result.skipped,
      keysSaved: result.keysSaved,
      oauthImported: result.oauthImported,
      authFileWarning: result.authFileWarning,
    },
  };
}

export async function dashboardAddProvider(body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
  const templateId = typeof body.templateId === 'string' ? body.templateId : '';
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey : '';
  const baseUrl = typeof body.baseUrl === 'string' && body.baseUrl.trim() ? body.baseUrl.trim() : undefined;
  const template = getTemplateById(templateId);
  if (!template) {
    return { status: 400, body: { error: { message: 'Unknown provider template' } } };
  }
  if (!template.apiKeyOptional && !apiKey.trim()) {
    return { status: 400, body: { error: { message: 'API key is required' } } };
  }

  const result = await addProviderFromTemplate(template, template.apiKeyOptional && !apiKey.trim() ? template.id : apiKey, { baseUrl });
  if (!result.added) {
    return { status: 400, body: { error: { message: result.error ?? 'Could not add provider', hint: result.hint } } };
  }
  return {
    status: 200,
    body: {
      provider: result.provider ? { id: result.provider.id, name: result.provider.name } : null,
      modelCount: result.modelCount ?? 0,
    },
  };
}

export async function dashboardUpdateProvider(body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
  const providerId = typeof body.providerId === 'string' ? body.providerId : '';
  if (!providerId) return { status: 400, body: { error: { message: 'providerId is required' } } };

  const registry = loadRegistry();
  const provider = registry.providers.find(entry => entry.id === providerId);
  if (!provider) return { status: 404, body: { error: { message: 'Provider not found' } } };

  if (body.enabled !== undefined) provider.enabled = Boolean(body.enabled);
  if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
    const template = getTemplateById(provider.templateId ?? provider.id);
    const urlCheck = await validateCustomEndpointUrl(body.baseUrl, {
      allowInsecureLocal: template?.apiKeyOptional === true,
    });
    if (!urlCheck.ok || !urlCheck.normalizedUrl) {
      return { status: 400, body: { error: { message: urlCheck.error ?? 'Invalid base URL', hint: urlCheck.hint } } };
    }
    provider.api = { ...provider.api, url: urlCheck.normalizedUrl };
  }
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    if (!provider.authRef) provider.authRef = `keyring:provider:${provider.id}`;
    const saved = await saveProviderCredential(provider.authRef, body.apiKey.trim());
    if (!saved) return { status: 400, body: { error: { message: 'Could not save credential' } } };
  }

  saveRegistry(registry);
  return {
    status: 200,
    body: {
      provider: {
        id: provider.id,
        name: provider.name,
        enabled: provider.enabled,
      },
      credentialChanged: typeof body.apiKey === 'string' && Boolean(body.apiKey.trim()),
    },
  };
}

export async function dashboardRemoveProvider(body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
  const providerId = typeof body.providerId === 'string' ? body.providerId : '';
  if (!providerId) return { status: 400, body: { error: { message: 'providerId is required' } } };

  const registry = loadRegistry();
  const provider = registry.providers.find(entry => entry.id === providerId);
  if (!provider) return { status: 404, body: { error: { message: 'Provider not found' } } };

  const result = await removeProviderFromRegistry(providerId, {
    deleteCredential: body.deleteCredential !== false,
  });
  if (!result.removed) {
    return { status: 404, body: { error: { message: result.error ?? 'Provider not found' } } };
  }
  return {
    status: 200,
    body: {
      provider: { id: result.id, name: result.name ?? provider.name },
      credentialDeleted: result.credentialDeleted,
    },
  };
}

export function dashboardModels(models: ServerModelInfo[], gateway?: GatewayModelOptions) {
  const favorites = loadPreferences().favoriteModels ?? [];
  const configuredProviderIds = new Set(loadRegistry().providers.map(provider => provider.id));
  return models.filter(model => {
    const providerId = gatewayProviderId(model);
    return !isOpenCodeProviderId(providerId) || configuredProviderIds.has(providerId);
  }).map(model => {
    const providerId = gatewayProviderId(model);
    const favorite = favorites.some(f => f.providerId === providerId && f.modelId === model.id);
    return {
      id: model.id,
      name: model.name,
      family: model.brand,
      providerId,
      providerLabel: gatewayProviderLabel(model),
      backend: providerId,
      format: model.modelFormat === 'anthropic' ? 'native' : model.modelFormat === 'openai' ? 'translated' : 'unsupported',
      supported: model.modelFormat !== 'unsupported',
      contextWindow: model.contextWindow ?? null,
      cost: model.cost ?? null,
      isFree: model.isFree,
      favorite,
      favoriteKey: { providerId, modelId: model.id },
      anthropicAlias: exposedGatewayAliasId(model, gateway),
    };
  });
}

function isOpenCodeProviderId(id: string): boolean {
  return id === 'zen' || id === 'go';
}

export function updateDashboardFavorite(body: Record<string, unknown>): { status: number; body: unknown } {
  const providerId = typeof body.providerId === 'string' ? body.providerId : '';
  const modelId = typeof body.modelId === 'string' ? body.modelId : '';
  const favorite = Boolean(body.favorite);
  if (!providerId || !modelId) {
    return { status: 400, body: { error: { message: 'providerId and modelId are required' } } };
  }

  const prefs = loadPreferences();
  const current = prefs.favoriteModels ?? [];
  let next: FavoriteModel[];
  if (favorite) {
    const result = addFavorite(current, { providerId, modelId });
    if (!result.ok && result.reason === 'cap') {
      return { status: 400, body: { error: { message: 'Favorite model limit reached' } } };
    }
    next = result.ok ? result.list : current;
  } else {
    next = removeFavorite(current, { providerId, modelId });
  }
  savePreferences({ favoriteModels: next });
  return { status: 200, body: { favoriteModels: next } };
}

export function dashboardSettings(runtime: DashboardRuntime) {
  const prefs = loadPreferences();
  const registry = loadRegistry();
  const openCodeProviders = registry.providers.filter(provider => provider.id === 'zen' || provider.id === 'go');
  const zenProvider = openCodeProviders.find(provider => provider.id === 'zen');
  const nativeClaude = evaluateClaudeNativeEnablement({
    verification: runtime.claudeNativeVerification,
    recorded: runtime.claudeNativeVerification ? recordedClaudeNativeTuple(runtime.claudeNativeVerification) : undefined,
    current: currentClaudeNativeTuple(),
  });
  return {
    modelSource: openCodeProviders.length > 0 ? (zenProvider?.subscriptionFilter ?? 'zen') : null,
    modelSourceAvailable: openCodeProviders.length > 0,
    defaultTool: prefs.defaultTool ?? null,
    routing: {
      favoritesOnly: getServerFavoritesOnly(),
      maskGatewayIds: getServerMaskGatewayIds(),
      requestTracing: getServerRequestTracing(),
      autoReroute: false,
      autoRerouteSupported: false,
    },
    gateway: {
      address: `http://${runtime.host}:${runtime.port}`,
      version: VERSION,
      uptimeSeconds: Math.max(0, Math.floor((Date.now() - runtime.startedAt) / 1000)),
      local: runtime.local,
      restartSupported: runtime.restartSupported === true,
    },
    claudeDesktop: {
      supported: process.platform === 'darwin' || process.platform === 'win32',
      baseUrl: dashboardClaudeDesktopBaseUrl(runtime),
      authScheme: 'bearer',
      apiKeyLabel: runtime.serverPassword ? 'Server password is written to Desktop config' : 'Any non-empty local value',
      nativeInterception: {
        available: nativeClaude.nativeEnabled,
        primary: nativeClaude.nativeEnabled,
        status: nativeClaude.state,
        reason: nativeClaude.reason,
        running: Boolean(runtime.claudeNativeTransport),
        port: runtime.claudeNativeTransport?.port ?? null,
        startedAt: runtime.claudeNativeStartedAt ?? null,
        selectedRoute: runtime.claudeNativeRoute ?? null,
        installState: runtime.claudeNativeInstallState ?? null,
        verificationProbe: runtime.claudeNativeProbe ? {
          port: runtime.claudeNativeProbe.transport.port,
          startedAt: runtime.claudeNativeProbe.startedAt,
          observedHosts: [...runtime.claudeNativeProbe.observedHosts],
        } : null,
        lastError: runtime.claudeNativeLastError ?? null,
        verification: runtime.claudeNativeVerification ? {
          appVersion: runtime.claudeNativeVerification.appVersion ?? null,
          osName: runtime.claudeNativeVerification.osName,
          osVersion: runtime.claudeNativeVerification.osVersion,
          verifiedAt: runtime.claudeNativeVerification.verifiedAt,
          evidenceSource: runtime.claudeNativeVerification.evidenceSource,
          hosts: runtime.claudeNativeVerification.hosts,
        } : null,
      },
      legacyGateway: {
        available: true,
        primary: !nativeClaude.nativeEnabled,
        mode: 'legacy_gateway',
        note: nativeClaude.nativeEnabled
          ? 'Legacy third-party gateway mode remains available as a secondary fallback.'
          : 'Legacy third-party gateway mode is available while native interception is not verified.',
      },
    },
    codexDesktop: {
      supported: process.platform === 'darwin' || process.platform === 'win32',
      configureAvailable: true,
      command: 'rflectr codex-app',
      proxyActive: Boolean(runtime.codexProxy),
      proxyPort: runtime.codexProxy?.port ?? null,
      proxyStartedAt: runtime.codexProxyStartedAt ?? null,
      note: runtime.codexProxy
        ? `Dashboard-managed Responses proxy is running on 127.0.0.1:${runtime.codexProxy.port}.`
        : 'Configures Codex Desktop with a dashboard-managed Responses proxy for this running gateway.',
    },
    lanes: buildDesktopLaneStatuses(runtime),
  };
}

/**
 * PRD-023e: derive the desktop-app lane status DTOs from the runtime.
 * Iterates `DESKTOP_APP_LANES` (order = resolution preference) so the UI
 * gets a stable, lane-distinct view of Claude-native / Claude-legacy /
 * Codex-desktop. `running` falls back to the legacy runtime fields when a
 * lane has no explicit per-lane state yet.
 */
export function buildDesktopLaneStatuses(runtime: DashboardRuntime): DesktopLaneStatusDto[] {
  return DESKTOP_APP_LANES.map(lane => {
    const laneState = runtime.lanes?.[lane.laneId];
    const running = laneState?.running
      ?? (lane.laneId === 'claude-native' ? Boolean(runtime.claudeNativeTransport)
        : lane.laneId === 'codex-desktop' ? Boolean(runtime.codexProxy)
        : false);
    return {
      laneId: lane.laneId,
      appName: lane.appName,
      attachMechanism: lane.attachMechanism,
      isolation: lane.isolation,
      preferred: lane.preferred,
      running,
      status: laneStatusString(runtime, lane.laneId, running),
      controls: lane.controls,
    };
  });
}

function laneStatusString(runtime: DashboardRuntime, laneId: LaneId, running: boolean): string {
  if (laneId === 'claude-native') {
    if (runtime.claudeNativeLastError) return `error: ${runtime.claudeNativeLastError}`;
    if (running) return `running on 127.0.0.1:${runtime.claudeNativeTransport?.port ?? '-'}`;
    return 'stopped';
  }
  if (laneId === 'codex-desktop') {
    if (running) return `proxy listening on 127.0.0.1:${runtime.codexProxy?.port ?? '-'}`;
    return runtime.codexProxy ? 'proxy idle' : 'not running';
  }
  // claude-legacy-gateway
  return dashboardClaudeDesktopBaseUrl(runtime) ? 'configured' : 'unconfigured';
}

export function updateDashboardSettings(body: Record<string, unknown>): { status: number; body: unknown } {
  if (body.defaultTool !== undefined) {
    if (!isDefaultTool(body.defaultTool)) {
      return { status: 400, body: { error: { message: 'Invalid defaultTool' } } };
    }
    savePreferences({ defaultTool: body.defaultTool });
  }

  const sourceFilter = body.modelSource ?? body.subscription;
  if (sourceFilter !== undefined) {
    if (!isModelSourceFilter(sourceFilter)) {
      return { status: 400, body: { error: { message: 'Invalid model source filter' } } };
    }
    const registry = loadRegistry();
    const provider = registry.providers.find(entry => entry.id === 'zen');
    if (!provider) {
      return { status: 400, body: { error: { message: 'OpenCode is not configured' } } };
    }
    provider.subscriptionFilter = sourceFilter;
    saveRegistry(registry);
  }

  if (body.favoritesOnly !== undefined) setServerFavoritesOnly(Boolean(body.favoritesOnly));
  if (body.maskGatewayIds !== undefined) setServerMaskGatewayIds(Boolean(body.maskGatewayIds));
  if (body.requestTracing !== undefined) setServerRequestTracing(Boolean(body.requestTracing));

  return { status: 200, body: { ok: true } };
}

export function dashboardRestartPayload(runtime: DashboardRuntime): { status: number; body: unknown } {
  if (runtime.restartSupported !== true) {
    return {
      status: 501,
      body: {
        ok: false,
        supported: false,
        message: 'Restart is not supported by the current foreground server process. Stop and rerun rflectr server to restart.',
      },
    };
  }
  runtime.requestRestart?.();
  return { status: 202, body: { ok: true, supported: true } };
}

export function dashboardClaudeDesktopPayload(runtime: DashboardRuntime, body: DashboardClaudeDesktopBody = {}): { status: number; body: unknown } {
  try {
    claudeAppSupported();
  } catch (error) {
    return {
      status: 400,
      body: {
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      },
    };
  }

  const baseUrl = dashboardClaudeDesktopBaseUrl(runtime);
  const uuid = writeRflectrConfig(runtime.port, baseUrl, runtime.serverPassword ?? 'dummy');
  let opened = false;
  let alreadyRunning = false;
  let launchError: string | undefined;

  if (body.launch === true) {
    try {
      alreadyRunning = isClaudeAppRunning();
      if (!alreadyRunning) {
        openClaudeApp();
        opened = true;
      }
    } catch (error) {
      launchError = sanitizeDashboardError(error);
    }
  }

  return {
    status: 200,
    body: {
      configured: true,
      uuid,
      baseUrl,
      configPath: join(getConfigLibraryPath(), `${uuid}.json`),
      opened,
      alreadyRunning,
      needsRestart: alreadyRunning,
      launchError,
      note: alreadyRunning
        ? 'Claude Desktop is already running. Quit and reopen it to pick up the rflectr gateway profile.'
        : 'Claude Desktop is configured for rflectr third-party inference. Use Cowork or Code; Chat is not available in gateway mode.',
    },
  };
}

export function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>rflectr dashboard</title>
  <link rel="stylesheet" href="/dashboard/assets/dashboard.css">
</head>
<body>
  <div id="app"></div>
  <script src="/dashboard/assets/dashboard.js"></script>
</body>
</html>`;
}

export function dashboardAsset(pathname: string): { status: number; contentType: string; body: string | Buffer; cacheControl: string } | null {
  if (pathname === '/dashboard/assets/dashboard.css') {
    return {
      status: 200,
      contentType: 'text/css; charset=utf-8',
      cacheControl: 'no-cache',
      body: DASHBOARD_CSS,
    };
  }
  if (pathname === '/dashboard/assets/dashboard.js') {
    return {
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      cacheControl: 'no-cache',
      body: DASHBOARD_JS,
    };
  }
  if (pathname === '/dashboard/assets/rflectr-no-bg.png') {
    try {
      return {
        status: 200,
        contentType: 'image/png',
        cacheControl: 'public, max-age=86400',
        body: readFileSync(join(process.cwd(), 'assets', 'rflectr-no-bg.png')),
      };
    } catch {
      return null;
    }
  }
  return null;
}

const DASHBOARD_CSS = `
:root{color-scheme:dark;--bg:#090a0d;--surface:#111319;--elev:#171a22;--border:#2a2f3a;--text:#f5f2e8;--muted:#9ca3af;--relay:#f0b429;--ok:#49d17d;--warn:#f2a23c;--bad:#ff5c7a;--tool:#8ab4ff}html[data-theme=light]{color-scheme:light;--bg:#f7f7f5;--surface:#fff;--elev:#f0f1f4;--border:#d8dbe2;--text:#111319;--muted:#606774}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px Inter,ui-sans-serif,system-ui,sans-serif}button,input,select{font:inherit}.app{display:flex;min-height:100vh}.sidebar{width:230px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:width .16s ease}.sidebar.collapsed{width:64px}.brand{height:60px;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:1px solid var(--border);font-weight:800;font-size:21px}.mark{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--relay),#9ff0d0)}nav{display:flex;flex-direction:column;gap:4px;padding:12px;flex:1}.nav{height:38px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--muted);display:flex;align-items:center;gap:11px;padding:0 12px;cursor:pointer;text-align:left}.nav.active{border-color:rgba(240,180,41,.5);background:rgba(240,180,41,.12);color:var(--relay)}.svgicon{width:16px;height:16px;display:inline-block;flex:0 0 16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.collapsed .nav{justify-content:center;padding:0}.collapsed .label,.collapsed .word,.collapsed .user-meta,.collapsed .local-text{display:none}.side-foot{padding:12px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px}.local{border:1px solid rgba(73,209,125,.4);background:rgba(73,209,125,.1);color:var(--ok);border-radius:8px;padding:8px 10px;font:11px ui-monospace,monospace}.main{flex:1;min-width:0;display:flex;flex-direction:column}.top{height:60px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;padding:0 24px;background:color-mix(in oklab,var(--bg) 86%,transparent);backdrop-filter:blur(8px);position:sticky;top:0;z-index:5}.title{font-weight:700;font-size:17px}.grow{flex:1}.iconbtn,.btn,.seg{border:1px solid var(--border);background:transparent;color:var(--text);height:34px;border-radius:8px;padding:0 12px;cursor:pointer}.iconbtn{display:inline-flex;align-items:center;justify-content:center}.btn.primary{background:var(--relay);color:#16120a;border-color:var(--relay);font-weight:700}.btn.danger{border-color:rgba(255,92,122,.55);color:var(--bad)}.btn:disabled,.seg:disabled{opacity:.55;cursor:not-allowed}.search,.field input,.field select{height:36px;border:1px solid var(--border);border-radius:8px;background:var(--elev);color:var(--text);padding:0 12px}.search{width:230px}.content{max-width:1480px;margin:0 auto;padding:28px 40px 64px;width:100%}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px}.kpi .value,.value{font:600 26px ui-monospace,monospace}.eyebrow{font:700 11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.routes{display:grid;grid-template-columns:1fr 1fr;gap:14px}.route{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}.mono{font-family:ui-monospace,monospace}.pill{border-radius:999px;padding:3px 8px;font:11px ui-monospace,monospace}.ok,.success,.connected,.localstatus{color:var(--ok)}.retry,.warn,.oauth{color:var(--warn)}.error,.bad,.missing,.unsupported{color:var(--bad)}.ready,.native,.translated{color:var(--ok)}.table{width:100%;border-collapse:collapse}.table th{color:var(--muted);font:10px ui-monospace,monospace;text-transform:uppercase;text-align:left}.table td,.table th{padding:9px 10px;border-bottom:1px solid rgba(128,128,128,.12)}.providers{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}.provider{text-align:left}.provider.selected{outline:1px solid var(--relay)}.modelrow{display:grid;grid-template-columns:minmax(220px,2fr) minmax(140px,1fr) minmax(110px,.8fr) minmax(90px,.7fr) minmax(110px,.8fr) minmax(110px,.8fr) minmax(180px,auto);gap:10px;align-items:center;margin-bottom:8px}.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px}.modelrow .toolbar{margin-bottom:0;justify-content:flex-end}.seg.active{border-color:var(--relay);color:var(--relay);background:rgba(240,180,41,.12)}.empty{text-align:center;color:var(--muted);padding:32px}.notice{background:rgba(242,162,60,.12);border:1px solid rgba(242,162,60,.35);border-radius:8px;padding:12px 14px;color:var(--muted)}.testline{min-height:18px;margin-top:10px;color:var(--muted);font:12px ui-monospace,monospace;overflow-wrap:anywhere}.form{display:grid;gap:14px;margin-bottom:18px}.field{display:grid;gap:6px}.field label{color:var(--muted);font:11px ui-monospace,monospace;text-transform:uppercase}.field input,.field select{width:100%}.field input[type=checkbox]{width:16px;height:16px;padding:0;vertical-align:middle}.checklabel{display:flex;align-items:center;gap:8px;text-transform:none!important;font:14px ui-monospace,monospace!important;color:var(--text)!important}.formgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-actions{display:flex;gap:8px;justify-content:flex-end}.statusline{min-height:18px;color:var(--muted)}@media(max-width:900px){.content{padding:22px 18px 48px}.grid4{grid-template-columns:1fr 1fr}.routes{grid-template-columns:1fr}.providers{grid-template-columns:1fr}.search{display:none}.modelrow,.formgrid{grid-template-columns:1fr}.modelrow .toolbar{justify-content:flex-start}.hide-sm{display:none}}
`;

const DASHBOARD_JS = `
function safeGet(k){try{return localStorage.getItem(k)}catch{return null}}function safeSet(k,v){try{localStorage.setItem(k,v)}catch{}}function clean(s){return String(s??'').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').replace(/Bearer\\s+[A-Za-z0-9._~+/=-]+/gi,'Bearer [redacted]')}
let DATA=null,route=safeGet('rflectr-dashboard-route')||'overview',collapsed=safeGet('rflectr-dashboard-collapsed')==='1',query='',modelFilter='all',activityFilter='all',importBusy=false,saveBusy=false,providerForm=null,providerTemplates=null,providerBusy=false,providerStatus='',desktopBusy=false,desktopStatus='',claudeNativeBusy=false,claudeNativeStatus='',claudeNativeModel=safeGet('rflectr-claude-native-model')||'',codexDesktopBusy=false,codexDesktopStatus='',killServerBusy=false,testBusyKey='',testResults={};
const app=document.getElementById('app');
function js(s){return JSON.stringify(String(s??'')).replace(/[<>&']/g,c=>({'<':'\\\\u003c','>':'\\\\u003e','&':'\\\\u0026',"'":'\\\\u0027'}[c]))}
async function api(path,init){const opts=init?{...init,headers:{...(init.headers||{})}}:{};if(opts.method&&opts.method.toUpperCase()!=='GET')opts.headers['${DASHBOARD_MUTATION_HEADER}']='1';const res=await fetch(path,opts);if(!res.ok)throw new Error(clean((await res.text()).slice(0,200)));return res.json();}
async function load(){try{const [overview,providers,models,activity,settings]=await Promise.all([api('/dashboard/api/overview'),api('/dashboard/api/providers'),api('/dashboard/api/models'),api('/dashboard/api/activity'),api('/dashboard/api/settings')]);DATA={overview,providers,models,activity,settings};render();}catch(e){app.innerHTML='<main class="content"><div class="card"><h2>Dashboard unavailable</h2><p>'+esc(e.message)+'</p><button class="btn" onclick="load()">Retry</button></div></main>';}}
function svg(paths){return '<svg class="svgicon" viewBox="0 0 24 24" aria-hidden="true">'+paths+'</svg>'}
function icon(name){const icons={overview:'<path d="M4 4h7v7H4z"></path><path d="M13 4h7v7h-7z"></path><path d="M4 13h7v7H4z"></path><path d="M13 13h7v7h-7z"></path>',providers:'<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path><circle cx="8" cy="7" r="1.5"></circle><circle cx="14" cy="12" r="1.5"></circle><circle cx="10" cy="17" r="1.5"></circle>',models:'<rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M8 8h8"></path><path d="M8 12h8"></path><path d="M8 16h5"></path>',activity:'<path d="M3 12h4l3 7 4-14 3 7h4"></path>',desktop:'<rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path>',settings:'<circle cx="12" cy="12" r="3"></circle><path d="M12 2v3"></path><path d="M12 19v3"></path><path d="M4.9 4.9l2.1 2.1"></path><path d="M17 17l2.1 2.1"></path><path d="M2 12h3"></path><path d="M19 12h3"></path><path d="M4.9 19.1L7 17"></path><path d="M17 7l2.1-2.1"></path>',menu:'<path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path>',theme:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M4.93 19.07l1.41-1.41"></path><path d="M17.66 6.34l1.41-1.41"></path>'};return svg(icons[name]||icons.models)}
function nav(id,label,iconName){return '<button title="'+label+'" class="nav '+(route===id?'active':'')+'" onclick="go(\\''+id+'\\')">'+icon(iconName)+'<span class="label">'+label+'</span></button>'}
function shell(body){const g=DATA.settings.gateway,sourceMeta=DATA.settings.modelSourceAvailable?'<div><b>RF</b> <span class="user-meta">'+sourceLabel(DATA.settings.modelSource)+'</span></div>':'';app.className='app';app.innerHTML='<aside class="sidebar '+(collapsed?'collapsed':'')+'"><div class="brand"><span class="mark"></span><span class="word">rflectr</span></div><nav>'+nav('overview','Overview','overview')+nav('providers','Providers','providers')+nav('models','Models','models')+nav('desktop','Desktop Apps','desktop')+nav('activity','Activity','activity')+nav('settings','Settings','settings')+'</nav><div class="side-foot"><div class="local"><span>●</span> <span class="local-text">'+esc(g.address.replace(/^https?:\\/\\//,''))+'</span></div>'+sourceMeta+'</div></aside><main class="main"><header class="top"><button class="iconbtn" title="Toggle sidebar" onclick="toggleSide()">'+icon('menu')+'</button><div class="title">'+title()+'</div><div class="grow"></div><input class="search" placeholder="Search models, providers" value="'+esc(query)+'" oninput="query=this.value;render()"><button class="iconbtn" title="Toggle theme" aria-label="Toggle theme" onclick="toggleTheme()">'+icon('theme')+'</button><button class="btn primary" onclick="addProvider()">+ Add provider</button></header><div class="content">'+body+'</div></main>'}
function title(){return ({overview:'Overview',providers:'Providers',models:'Models',desktop:'Desktop Apps',activity:'Activity',settings:'Settings'})[route]||'Overview'}function go(id){route=id;safeSet('rflectr-dashboard-route',id);render()}function toggleSide(){collapsed=!collapsed;safeSet('rflectr-dashboard-collapsed',collapsed?'1':'0');render()}function toggleTheme(){const l=document.documentElement.getAttribute('data-theme')==='light';if(l)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme','light');safeSet('rflectr-dashboard-theme',l?'dark':'light')}
function overview(){const o=DATA.overview;return '<div class="grid4">'+kpi('requests today',o.kpis.requestsToday)+kpi('success rate',Math.round(o.kpis.successRate*1000)/10+'%',o.kpis.successRate<.95?'warn':'ok')+kpi('active routes',o.kpis.activeRoutes)+kpi('avg latency',o.kpis.averageLatencyMs+'ms')+'</div><h3 class="eyebrow">active routes <span class="pill">'+o.routes.length+'</span></h3><div class="routes">'+(o.routes.length?o.routes.map(r=>'<div class="card route"><div><b>'+esc(r.tool)+'</b><br><span class="mono">tool</span></div><div>→ rflectr →</div><div><b>'+esc(r.modelId)+'</b><br><span class="'+r.status+'">'+esc(r.status)+'</span> · '+esc(r.backend)+' · '+(r.latencyMs??'-')+'</div></div>').join(''):'<div class="card empty">No active routes.</div>')+'</div><div class="card" style="margin-top:24px"><div style="display:flex;justify-content:space-between"><span class="eyebrow">live requests</span>'+spark(o.volumeBuckets.map(b=>b.count))+'</div>'+feed(o.recentActivity)+'</div>'}
function kpi(l,v,c){return '<div class="card kpi"><div class="value '+(c||'')+'">'+esc(v)+'</div><div class="eyebrow">'+esc(l)+'</div></div>'}
function providers(){const q=query.toLowerCase(),list=DATA.providers.providers.filter(p=>!q||p.name.toLowerCase().includes(q));return providerFormHtml()+'<div class="toolbar"><span class="eyebrow">registry</span><span class="pill ok">'+list.filter(p=>p.status!=='missing').length+' connected</span><button class="btn" '+(importBusy?'disabled':'')+' onclick="importOpenCode()">'+(importBusy?'Importing...':'Import from OpenCode')+'</button></div><div class="providers">'+list.map((p,i)=>{const editable=p.source==='registry',key='provider:'+p.id;return '<div class="card provider '+(i===0?'selected':'')+'"><b>'+esc(p.name)+'</b><p class="'+p.status+'">'+esc(p.status)+'</p><p>'+esc(p.modelCount)+' models</p><p class="mono">'+esc(p.auth.label)+'</p><div class="toolbar"><button class="btn primary" '+(p.modelCount<1||testBusyKey?'disabled':'')+' onclick=\\'testProvider('+js(p.id)+')\\'>'+(testBusyKey===key?'Testing...':'Test provider')+'</button><button class="btn" '+(!editable?'disabled title="Runtime-only providers are edited in their source registry"':'')+' onclick=\\'editProvider('+js(p.id)+')\\'>'+(editable?'Edit credentials':'Runtime only')+'</button>'+(editable?'<button class="btn danger" onclick=\\'removeProvider('+js(p.id)+')\\'>Remove</button>':'')+'</div>'+testResultHtml(key)+'</div>'}).join('')+'</div>'}
function models(){let list=DATA.models.models.filter(m=>{const q=query.toLowerCase();if(modelFilter==='favorites'&&!m.favorite)return false;if(!['all','favorites'].includes(modelFilter)&&m.format!==modelFilter)return false;return !q||m.id.toLowerCase().includes(q)||m.family.toLowerCase().includes(q)});return '<div class="toolbar">'+['all','native','translated','unsupported','favorites'].map(f=>'<button class="seg '+(modelFilter===f?'active':'')+'" onclick="modelFilter=\\''+f+'\\';render()">'+(f==='favorites'?'★ Favorites':cap(f))+'</button>').join('')+'<span class="grow"></span><span class="mono">'+list.length+' shown · '+DATA.models.models.filter(m=>m.favorite).length+'/20 favorited</span></div>'+(list.length?list.map(m=>{const key='model:'+m.id;return '<div class="card modelrow"><b>'+esc(m.id)+'</b><span>'+esc(m.family)+'</span><span class="'+m.format+'">'+esc(m.format)+'</span><span>'+esc(m.contextWindow??'-')+'</span><span>'+cost(m)+'</span><span>'+esc(m.backend)+'</span><div><div class="toolbar"><button class="btn" '+(!m.supported||testBusyKey?'disabled':'')+' onclick=\\'testModel('+js(m.id)+')\\'>'+(testBusyKey===key?'Testing...':'Test')+'</button><button class="btn" '+(!m.supported?'disabled':'')+' onclick=\\'fav('+js(m.providerId)+','+js(m.id)+','+(!m.favorite)+')\\'>'+(m.favorite?'★':'☆')+'</button></div>'+testResultHtml(key)+'</div></div>'}).join(''):'<div class="card empty">No models match “'+esc(query)+'”.</div>')}
function activity(){const a=DATA.activity;const rows=a.events.filter(r=>activityFilter==='retries'?r.status==='retry':activityFilter==='errors'?r.status==='error':true);return '<div class="grid4" style="grid-template-columns:repeat(3,1fr)">'+kpi('succeeded',a.counts.succeeded,'ok')+kpi('retried → rerouted',a.counts.retried,'warn')+kpi('errored',a.counts.errored,'bad')+'</div><div class="card" style="margin-top:20px"><div class="toolbar">'+['all','retries','errors'].map(f=>'<button class="seg '+(activityFilter===f?'active':'')+'" onclick="activityFilter=\\''+f+'\\';render()">'+cap(f)+'</button>').join('')+'<span class="grow"></span><span class="ok mono">● live</span></div>'+feed(rows)+'</div><p class="notice">'+esc(a.costCaveat)+'</p>'}
function desktopApps(){const c=DATA.settings.claudeDesktop,x=DATA.settings.codexDesktop,n=c.nativeInterception||{},nativeStatus=n.status||'verification_required',nativeModels=DATA.models.models.filter(m=>m.supported&&m.format!=='unsupported'&&!/smoke/i.test(m.id));if(!claudeNativeModel&&nativeModels[0])claudeNativeModel=nativeModels[0].providerId+'::'+nativeModels[0].id;const selected=nativeModels.find(m=>(m.providerId+'::'+m.id)===claudeNativeModel)||nativeModels[0];const routeLine=n.running?('Running on 127.0.0.1:'+n.port+' -> '+(n.selectedRoute?n.selectedRoute.providerId+'/'+n.selectedRoute.modelId:'selected route')):'Stopped';const probeLine=n.verificationProbe?('Verification proxy 127.0.0.1:'+n.verificationProbe.port+' observed '+n.verificationProbe.observedHosts.length+' host(s)'):'No verification probe running';const modelSelect='<select id="claude-native-model" onchange="claudeNativeModel=this.value;safeSet(\\'rflectr-claude-native-model\\',this.value)">'+nativeModels.map(m=>'<option value="'+esc(m.providerId+'::'+m.id)+'" '+((m.providerId+'::'+m.id)===claudeNativeModel?'selected':'')+'>'+esc(m.providerLabel||m.providerId)+' / '+esc(m.id)+'</option>').join('')+'</select>';const claude='<div class="card"><h3>Claude Desktop</h3><p>Native interception <span class="mono">'+esc(nativeStatus)+'</span> · <span class="mono">'+esc(routeLine)+'</span></p><p class="mono">'+esc(probeLine)+'</p><div class="field"><label>Native route</label>'+modelSelect+'</div><div class="toolbar"><button class="btn" onclick="startClaudeNativeVerify()" '+(!c.supported||claudeNativeBusy?'disabled':'')+'>Start verification</button><button class="btn" onclick="completeClaudeNativeVerify()" '+(!c.supported||claudeNativeBusy||!n.verificationProbe?'disabled':'')+'>Complete verification</button><button class="btn primary" onclick="startClaudeNative()" '+(!c.supported||claudeNativeBusy||!n.available||!selected?'disabled':'')+'>'+(n.running?'Restart native':'Start native')+'</button><button class="btn" onclick="stopClaudeNative()" '+(!n.running||claudeNativeBusy?'disabled':'')+'>Stop native</button><button class="btn danger" onclick="uninstallClaudeNative()" '+(claudeNativeBusy?'disabled':'')+'>Uninstall native</button></div><p>Legacy gateway fallback <span class="mono">'+esc(c.baseUrl)+'</span></p><p>Auth <span class="mono">'+esc(c.authScheme)+'</span> · '+esc(c.apiKeyLabel)+'</p><p class="mono">Use Cowork or Code. Chat is not available in legacy gateway mode.</p><div class="toolbar"><button class="btn" onclick="connectClaudeDesktop(true)" '+(!c.supported||desktopBusy?'disabled':'')+'>'+(desktopBusy?'Configuring...':'Configure & open legacy gateway')+'</button><button class="btn" onclick="connectClaudeDesktop(false)" '+(!c.supported||desktopBusy?'disabled':'')+'>Configure legacy only</button><button class="btn danger" onclick="revertClaudeDesktop()" '+(desktopBusy?'disabled':'')+'>Revert legacy</button></div><div class="statusline">'+esc(claudeNativeStatus||desktopStatus||(!c.supported?'Claude Desktop gateway setup is supported on macOS and Windows only.':n.reason||'Native interception is primary after verification; legacy third-party gateway remains available.'))+'</div></div>';const codex='<div class="card"><h3>Codex Desktop</h3><p>Responses proxy <span class="mono">'+esc(x.proxyActive?('127.0.0.1:'+x.proxyPort):'not running')+'</span></p><p class="mono">'+esc(x.note)+'</p><div class="toolbar"><button class="btn primary" onclick="connectCodexDesktop(true)" '+(!x.supported||!x.configureAvailable||codexDesktopBusy?'disabled':'')+'>'+(codexDesktopBusy?'Configuring...':'Configure & open')+'</button><button class="btn" onclick="connectCodexDesktop(false)" '+(!x.supported||!x.configureAvailable||codexDesktopBusy?'disabled':'')+'>Configure only</button><button class="btn danger" onclick="revertCodexDesktop()" '+(!x.supported||!x.configureAvailable||codexDesktopBusy?'disabled':'')+'>Revert Codex</button><button class="btn danger" onclick="stopCodexProxy()" '+(!x.proxyActive||codexDesktopBusy?'disabled':'')+'>Stop Codex proxy</button></div><div class="statusline">'+esc(codexDesktopStatus||(!x.supported?'Codex Desktop is supported on macOS and Windows only.':'Writes Codex Desktop config and starts a dashboard-managed Responses proxy.'))+'</div><div class="toolbar" style="margin-top:12px"><button class="btn danger" onclick="killServer()" '+(killServerBusy?'disabled':'')+'>Kill server</button><span class="mono" style="color:var(--muted)">stops the local gateway; browser may disconnect</span></div></div>';return '<div class="providers">'+claude+codex+'</div>'}
function settings(){const s=DATA.settings,g=s.gateway,sourceCard=s.modelSourceAvailable?'<div class="card"><h3>OpenCode model source</h3><div class="toolbar">'+['free','zen','go'].map(t=>'<button class="seg '+(s.modelSource===t?'active':'')+'" onclick="saveSettings({modelSource:\\''+t+'\\'})">'+sourceLabel(t)+'</button>').join('')+'</div></div>':'';return '<div style="max-width:720px;display:flex;flex-direction:column;gap:16px">'+sourceCard+'<div class="card"><h3>Default tool</h3><div class="toolbar">'+[['claude','Claude Code',true],['codex','Codex',true],['gemini','Gemini CLI',true],['cursor','Cursor',false]].map(t=>'<button '+(!t[2]?'disabled title="Cursor launch is not available from bare rflectr yet"':'')+' class="seg '+(s.defaultTool===t[0]?'active':'')+'" onclick="saveSettings({defaultTool:\\''+t[0]+'\\'})">'+esc(t[1])+'</button>').join('')+'</div></div><div class="card"><h3>Routing</h3><label><input type="checkbox" '+(s.routing.autoReroute?'checked':'disabled')+'> Auto-reroute on error</label><hr><label><input type="checkbox" '+(s.routing.requestTracing?'checked':'')+' onchange="saveSettings({requestTracing:this.checked})"> Request tracing</label><p class="mono">Traces stay local under ~/.rflectr/logs when enabled.</p></div><div class="card"><h3>Gateway</h3><p>Address <span class="mono">'+esc(g.address)+'</span></p><p>Version <span class="mono">rflectr '+esc(g.version)+'</span></p><p>Uptime <span class="mono">'+Math.floor(g.uptimeSeconds/60)+'m</span></p><p class="ok">● runs on your machine</p><button class="btn" onclick="restart()" '+(!g.restartSupported?'disabled':'')+'>Restart gateway</button></div></div>'}
function feed(rows){return rows.length?'<table class="table"><thead><tr><th>time</th><th>tool</th><th>route</th><th>tokens</th><th>latency</th><th>status</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(new Date(r.startedAt).toLocaleTimeString('en-US',{hour12:false}))+'</td><td class="mono">'+esc(r.tool)+'</td><td>'+esc(r.model)+' · '+esc(r.backend)+'</td><td>'+esc(r.totalTokens??'-')+'</td><td>'+esc(r.latencyMs)+'ms</td><td class="'+r.status+'">'+esc(r.httpStatus||r.status)+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No requests observed for this filter.</div>'}
function spark(a){const max=Math.max(1,...a),pts=a.map((v,i)=>(i*10)+','+(30-(v/max)*28)).join(' ');return '<svg width="140" height="34"><polyline points="'+pts+'" fill="none" stroke="var(--relay)" stroke-width="2"/></svg>'}
async function saveSettings(body){if(saveBusy)return;saveBusy=true;const prior=DATA;try{await api('/dashboard/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});await load()}catch(e){DATA=prior;render();alert('Settings were not saved: '+e.message)}finally{saveBusy=false}}
async function fav(providerId,modelId,favorite){const prior=DATA;try{await api('/dashboard/api/models/favorite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({providerId,modelId,favorite})});await load()}catch(e){DATA=prior;render();alert('Favorite was not saved: '+e.message)}}
async function importOpenCode(){if(importBusy)return;importBusy=true;render();try{const r=await api('/dashboard/api/providers/import-opencode',{method:'POST'});providerStatus='Imported '+r.imported.length+' provider(s); skipped '+r.skipped.length+'. Model catalog refreshed.';await load()}catch(e){providerStatus='OpenCode import failed: '+e.message;render()}finally{importBusy=false;render()}}
async function ensureProviderTemplates(){if(providerTemplates)return providerTemplates;const response=await api('/dashboard/api/providers/templates');providerTemplates=response.templates||[];return providerTemplates}
async function addProvider(){go('providers');providerStatus='';providerForm={mode:'add',templateId:'',apiKey:'',baseUrl:''};try{const templates=await ensureProviderTemplates();const first=templates[0];if(first){providerForm.templateId=first.id;providerForm.baseUrl=first.defaultBaseUrl||''}}catch(e){providerStatus='Could not load provider templates: '+e.message}render()}
function editProvider(providerId){const current=DATA.providers.providers.find(p=>p.id===providerId);if(!current||current.source!=='registry')return;providerStatus='';providerForm={mode:'edit',providerId:current.id,name:current.name,enabled:current.enabled!==false,apiKey:'',baseUrl:current.baseUrl||''};render()}
function cancelProviderForm(){providerForm=null;providerStatus='';render()}
function selectedProviderTemplate(){return (providerTemplates||[]).find(t=>providerForm&&t.id===providerForm.templateId)}
function onProviderTemplateChange(value){if(!providerForm)return;providerForm.templateId=value;const template=selectedProviderTemplate();providerForm.baseUrl=template&&template.defaultBaseUrl?template.defaultBaseUrl:'';render()}
async function removeProvider(providerId){const current=DATA.providers.providers.find(p=>p.id===providerId);if(!current||current.source!=='registry')return;if(!confirm('Remove '+current.name+' from rflectr? This also removes its stored credential when it is not shared.'))return;try{const result=await api('/dashboard/api/providers',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({providerId})});providerStatus='Removed '+(result.provider&&result.provider.name?result.provider.name:current.name)+'. Model catalog refreshed.';providerForm=null;providerTemplates=null;await load()}catch(e){providerStatus='Remove provider failed: '+e.message;render()}}
async function submitProviderForm(){if(!providerForm||providerBusy)return;const mode=providerForm.mode;const payload=mode==='add'?{templateId:document.getElementById('provider-template').value,apiKey:document.getElementById('provider-api-key').value,baseUrl:document.getElementById('provider-base-url').value}:{providerId:providerForm.providerId,enabled:document.getElementById('provider-enabled').checked,apiKey:document.getElementById('provider-api-key').value,baseUrl:document.getElementById('provider-base-url').value};if(providerForm){providerForm.baseUrl=payload.baseUrl||'';if(mode==='add')providerForm.templateId=payload.templateId}providerBusy=true;providerStatus='Saving provider...';render();try{if(mode==='add'){const result=await api('/dashboard/api/providers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});providerStatus='Added '+(result.provider&&result.provider.name?result.provider.name:'provider')+' with '+result.modelCount+' model(s). Model catalog refreshed.';providerForm=null;providerTemplates=null;await load()}else{await api('/dashboard/api/providers/update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});providerStatus='Updated '+providerForm.name+'. Model catalog refreshed.';providerForm=null;await load()}}catch(e){providerStatus='Provider save failed: '+e.message;render()}finally{providerBusy=false;render()}}
function providerFormHtml(){if(!providerForm)return providerStatus?'<div class="notice">'+esc(providerStatus)+'</div>':'';const mode=providerForm.mode;const templates=providerTemplates||[];const template=selectedProviderTemplate();const help=mode==='add'?(template&&template.apiKeyOptional?'API key optional for this local provider.':'API key is required for this provider.'):'Leave blank to keep existing credential.';const templateField=mode==='add'?'<div class="field"><label for="provider-template">Provider</label><select id="provider-template" onchange="onProviderTemplateChange(this.value)">'+templates.map(t=>'<option value="'+esc(t.id)+'" '+(providerForm.templateId===t.id?'selected':'')+'>'+esc(t.name)+' ('+esc(t.id)+')</option>').join('')+'</select></div>':'<div class="field"><label>Provider</label><input disabled value="'+esc(providerForm.name)+'"></div>';const enabledField=mode==='edit'?'<div class="field"><label for="provider-enabled">Status</label><label class="checklabel"><input id="provider-enabled" type="checkbox" '+(providerForm.enabled?'checked':'')+'> Enabled</label></div>':'';return '<form class="card form" onsubmit="event.preventDefault();submitProviderForm()"><h3>'+(mode==='add'?'Add provider':'Edit credentials')+'</h3><div class="formgrid">'+templateField+enabledField+'<div class="field"><label for="provider-api-key">API key</label><input id="provider-api-key" type="password" autocomplete="off" placeholder="'+esc(help)+'"></div><div class="field"><label for="provider-base-url">Base URL</label><input id="provider-base-url" value="'+esc(providerForm.baseUrl||'')+'" placeholder="Provider API base URL"></div></div><div class="statusline">'+esc(providerStatus||help)+'</div><div class="form-actions"><button type="button" class="btn" onclick="cancelProviderForm()" '+(providerBusy?'disabled':'')+'>Cancel</button><button type="submit" class="btn primary" '+(providerBusy?'disabled':'')+'>'+(providerBusy?'Saving...':mode==='add'?'Save provider':'Save credentials')+'</button></div></form>'}
function testResultHtml(key){const r=testResults[key];if(!r)return '';const cls=r.ok?'ok':'bad';const body=r.ok?'OK · '+esc(r.modelId)+' · '+esc(r.latencyMs)+'ms'+(r.preview?' · '+esc(r.preview):''):esc(r.message||'Provider test failed');return '<div class="testline '+cls+'">'+body+'</div>'}
async function testProvider(providerId){const key='provider:'+providerId;if(testBusyKey)return;testBusyKey=key;testResults[key]={ok:true,modelId:'',latencyMs:'...',preview:'testing'};render();try{const result=await api('/dashboard/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({providerId})});testResults[key]={ok:true,modelId:result.modelId,latencyMs:result.latencyMs,preview:result.preview||'completed'};await load()}catch(e){testResults[key]={ok:false,message:e.message};render()}finally{testBusyKey='';render()}}
async function testModel(modelId){const key='model:'+modelId;if(testBusyKey)return;testBusyKey=key;testResults[key]={ok:true,modelId,latencyMs:'...',preview:'testing'};render();try{const result=await api('/dashboard/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({modelId})});testResults[key]={ok:true,modelId:result.modelId,latencyMs:result.latencyMs,preview:result.preview||'completed'};await load()}catch(e){testResults[key]={ok:false,message:e.message};render()}finally{testBusyKey='';render()}}
async function connectClaudeDesktop(launch){if(desktopBusy)return;desktopBusy=true;desktopStatus='Writing Claude Desktop gateway config...';render();try{const result=await api('/dashboard/api/claude-desktop/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({launch:!!launch})});desktopStatus=result.note||('Claude Desktop configured for '+result.baseUrl);if(result.launchError)desktopStatus+=' Open failed: '+result.launchError;if(result.configPath)desktopStatus+=' Config: '+result.configPath;await load()}catch(e){desktopStatus='Claude Desktop setup failed: '+e.message;render()}finally{desktopBusy=false;render()}}
async function startClaudeNativeVerify(){if(claudeNativeBusy)return;claudeNativeBusy=true;claudeNativeStatus='Starting Claude Desktop verification proxy...';render();try{const r=await api('/dashboard/api/claude-desktop/native/verify/start',{method:'POST'});claudeNativeStatus='Verification proxy running on 127.0.0.1:'+r.proxyPort+'. Send a Claude Desktop test turn, then complete verification.';await load()}catch(e){claudeNativeStatus='Native verification failed: '+e.message;render()}finally{claudeNativeBusy=false;render()}}
async function completeClaudeNativeVerify(){if(claudeNativeBusy)return;claudeNativeBusy=true;claudeNativeStatus='Completing Claude Desktop verification...';render();try{const r=await api('/dashboard/api/claude-desktop/native/verify/complete',{method:'POST'});claudeNativeStatus=r.nativeEnabled?'Native interception verified.':'Native interception blocked: '+(r.reason||r.state);await load()}catch(e){claudeNativeStatus='Verification completion failed: '+e.message;render()}finally{claudeNativeBusy=false;render()}}
async function startClaudeNative(){if(claudeNativeBusy)return;const parts=String(claudeNativeModel||'').split('::');const selected=DATA.models.models.find(m=>m.providerId===parts[0]&&m.id===parts.slice(1).join('::'));if(!selected){claudeNativeStatus='Choose a native route first.';render();return}const payload={providerId:selected.providerId,modelId:selected.id};if(selected.providerId!=='anthropic'){if(!confirm('Route Claude Desktop prompts to '+(selected.providerLabel||selected.providerId)+'?'))return;payload.consentDestinationProviderId=selected.providerId}claudeNativeBusy=true;claudeNativeStatus='Starting Claude Desktop native routing...';render();try{const r=await api('/dashboard/api/claude-desktop/native/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});claudeNativeStatus=r.note||('Native routing running on '+r.proxyPort);await load()}catch(e){claudeNativeStatus='Native start failed: '+e.message;render()}finally{claudeNativeBusy=false;render()}}
async function stopClaudeNative(){if(claudeNativeBusy)return;claudeNativeBusy=true;claudeNativeStatus='Stopping Claude Desktop native routing...';render();try{const r=await api('/dashboard/api/claude-desktop/native/stop',{method:'POST'});claudeNativeStatus=r.reason||'Native routing stopped.';await load()}catch(e){claudeNativeStatus='Native stop failed: '+e.message;render()}finally{claudeNativeBusy=false;render()}}
async function uninstallClaudeNative(){if(claudeNativeBusy)return;if(!confirm('Uninstall only rflectr-owned native proxy/trust state? Legacy Claude gateway config is left alone.'))return;claudeNativeBusy=true;claudeNativeStatus='Uninstalling owned native state...';render();try{const r=await api('/dashboard/api/claude-desktop/native/uninstall',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:true})});claudeNativeStatus=r.reason||'Owned native state removed.';await load()}catch(e){claudeNativeStatus='Native uninstall failed: '+e.message;render()}finally{claudeNativeBusy=false;render()}}
async function connectCodexDesktop(launch){if(codexDesktopBusy)return;codexDesktopBusy=true;codexDesktopStatus='Starting Codex Responses proxy...';render();try{const result=await api('/dashboard/api/codex-desktop/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({launch:!!launch})});codexDesktopStatus=result.note||('Codex Desktop configured for '+result.baseUrl);if(result.launchError)codexDesktopStatus+=' Open failed: '+result.launchError;if(result.configPath)codexDesktopStatus+=' Config: '+result.configPath;await load()}catch(e){codexDesktopStatus='Codex Desktop setup failed: '+e.message;render()}finally{codexDesktopBusy=false;render()}}
async function revertClaudeDesktop(){if(desktopBusy)return;if(!confirm('Revert the legacy Claude Desktop gateway profile to its defaults?'))return;desktopBusy=true;desktopStatus='Reverting legacy Claude Desktop config...';render();try{const r=await api('/dashboard/api/claude-desktop/revert',{method:'POST'});desktopStatus=r.message||r.reason||'Legacy Claude Desktop config reverted.';await load()}catch(e){desktopStatus='Revert failed: '+e.message;render()}finally{desktopBusy=false;render()}}
async function revertCodexDesktop(){if(codexDesktopBusy)return;if(!confirm('Revert Codex Desktop config and stop the managed Responses proxy?'))return;codexDesktopBusy=true;codexDesktopStatus='Reverting Codex Desktop config...';render();try{const r=await api('/dashboard/api/codex-desktop/revert',{method:'POST'});codexDesktopStatus=r.message||r.reason||'Codex Desktop config reverted.';await load()}catch(e){codexDesktopStatus='Codex revert failed: '+e.message;render()}finally{codexDesktopBusy=false;render()}}
async function stopCodexProxy(){if(codexDesktopBusy)return;codexDesktopBusy=true;codexDesktopStatus='Stopping Codex Responses proxy...';render();try{const r=await api('/dashboard/api/codex-desktop/stop',{method:'POST'});codexDesktopStatus=r.message||r.reason||'Codex Responses proxy stopped.';await load()}catch(e){codexDesktopStatus='Codex proxy stop failed: '+e.message;render()}finally{codexDesktopBusy=false;render()}}
async function killServer(){if(killServerBusy)return;if(!confirm('Kill the local rflectr gateway? Active requests will be interrupted and this browser session may disconnect until you restart the server.'))return;killServerBusy=true;render();try{await api('/dashboard/api/server/kill',{method:'POST'});app.innerHTML='<main class="content"><div class="card"><h2>Gateway stopped</h2><p>The local rflectr server is shutting down. Restart it from your terminal to reconnect.</p><button class="btn" onclick="load()">Reconnect</button></div></main>'}catch(e){app.innerHTML='<main class="content"><div class="card"><h2>Kill did not complete</h2><p>'+esc(clean(e.message))+'</p><button class="btn" onclick="load()">Reconnect</button></div></main>'}finally{killServerBusy=false}}
async function restart(){if(!confirm('Restart the local gateway? Active requests may be interrupted.'))return;try{await api('/dashboard/api/restart',{method:'POST'});app.innerHTML='<main class="content"><div class="card"><h2>Restarting gateway...</h2><p>Reconnecting to your local rflectr server.</p></div></main>';setTimeout(load,1800)}catch(e){app.innerHTML='<main class="content"><div class="card"><h2>Restart did not complete</h2><p>'+esc(clean(e.message))+'</p><button class="btn" onclick="load()">Reconnect</button></div></main>'}}
function cost(m){if(!m.cost)return m.format==='native'?'-':'estimate';return '$'+m.cost.input+' / $'+m.cost.output}function render(){if(!DATA)return;shell(({overview,providers,models,desktop:desktopApps,activity,settings})[route]())}function shouldAutoRefresh(){const active=document.activeElement;if(providerForm)return false;if(active&&['INPUT','SELECT','TEXTAREA'].includes(active.tagName))return false;return !document.hidden}function sourceLabel(s){return s==='free'?'Zen free models':s==='go'?'OpenCode Go':'OpenCode Zen'}function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}if(safeGet('rflectr-dashboard-theme')==='light')document.documentElement.setAttribute('data-theme','light');window.load=load;load();setInterval(()=>{if(shouldAutoRefresh())load()},5000);document.addEventListener('visibilitychange',()=>{if(shouldAutoRefresh())load()});
`;

function providerStatus(authType: string | undefined, authRef: string | undefined): string {
  if (authType === 'none') return 'local';
  if (authType === 'oauth') return 'oauth';
  if (authType === 'api' && !authRef) return 'missing';
  if (!authRef) return 'connected';
  return authRef ? 'connected' : 'missing';
}

function credentialSummary(authType: string | undefined, authRef: string | undefined, runtimeAuthType?: string) {
  const type = authType ?? runtimeAuthType ?? 'api';
  return {
    type,
    present: Boolean(authRef || runtimeAuthType),
    label: type === 'oauth' ? 'OAuth credential stored' : type === 'none' ? 'No API key required' : authRef ? 'Credential configured' : runtimeAuthType ? 'Runtime credential' : 'Credential missing',
    redacted: true,
  };
}

function extractUsage(body: unknown): { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } {
  if (!body || typeof body !== 'object') return { inputTokens: null, outputTokens: null, totalTokens: null };
  const usage = (body as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== 'object') return { inputTokens: null, outputTokens: null, totalTokens: null };
  const inputTokens = numberOrNull(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = numberOrNull(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = numberOrNull(usage.total_tokens) ?? (inputTokens !== null || outputTokens !== null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null);
  return { inputTokens, outputTokens, totalTokens };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function sanitizeDashboardError(error: unknown): string | undefined {
  if (!error) return undefined;
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .slice(0, 240);
}

function dashboardClaudeDesktopBaseUrl(runtime: DashboardRuntime): string {
  const host = runtime.host === '0.0.0.0' || runtime.host === '::' || runtime.local ? '127.0.0.1' : runtime.host;
  return `http://${host}:${runtime.port}/anthropic`;
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function buildVolumeBuckets(events: DashboardActivityEvent[]) {
  const now = Date.now();
  const bucketMs = 5 * 60 * 1000;
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const start = now - (12 - index) * bucketMs;
    return { start: new Date(start).toISOString(), count: 0 };
  });
  for (const event of events) {
    const t = new Date(event.startedAt).getTime();
    const index = Math.floor((t - (now - 12 * bucketMs)) / bucketMs);
    if (index >= 0 && index < buckets.length) buckets[index]!.count += 1;
  }
  return buckets;
}

function isDefaultTool(value: unknown): value is DashboardDefaultTool {
  return value === 'claude' || value === 'codex' || value === 'gemini' || value === 'cursor';
}

function isModelSourceFilter(value: unknown): value is RegistrySubscriptionFilter {
  return value === 'free' || value === 'zen' || value === 'go';
}
