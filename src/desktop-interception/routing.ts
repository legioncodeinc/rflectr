import type { LanguageModel } from 'ai';
import {
  dispatchAnthropicMessages,
  type AnthropicDispatchResult,
  type AnthropicDispatchTarget,
  type ServerBackend,
  type VertexServerConfig,
} from '../server/anthropic-dispatch.js';
import {
  createModelCatalog,
  gatewayProviderId,
  type GatewayModelOptions,
  type ModelCatalog,
  type ServerBackendId,
  type ServerModelInfo,
} from '../server/models.js';
import { classifyAnthropicDesktopRequest } from './adapters/anthropic.js';
import type { AnthropicDesktopClassification, ParsedAnthropicDesktopRequest } from './adapters/types.js';
import type { InterceptedRequest } from './hooks.js';

export type NativeRoutingDecision =
  | 'routed'
  | 'pass_through'
  | 'deny'
  | 'malformed'
  | 'route_blocked'
  | 'consent_required';

export interface CrossProviderConsent {
  readonly destinationProviderId: string;
  readonly consentedAt: string;
}

export interface NativeRouteSelection {
  readonly providerId: string;
  readonly modelId: string;
  readonly routeModelId: string;
  readonly providerLabel: string;
}

export interface NativeRoutingRequest {
  readonly providerId: string;
  readonly modelId: string;
  readonly crossProviderConsent?: CrossProviderConsent;
}

export interface NativeRoutingOptions {
  readonly intercepted: InterceptedRequest;
  readonly route: NativeRoutingRequest;
  readonly models: readonly ServerModelInfo[];
  readonly modelCache: Map<string, LanguageModel>;
  readonly apiKey: string;
  readonly backends: Record<ServerBackendId, ServerBackend>;
  readonly target: AnthropicDispatchTarget;
  readonly gateway?: GatewayModelOptions;
  readonly vertex?: VertexServerConfig;
  readonly log?: (msg: string | (() => string)) => void;
}

export type NativeRoutingResult =
  | {
      readonly decision: 'routed';
      readonly route: NativeRouteSelection;
      readonly dispatch: AnthropicDispatchResult;
      readonly safeDiagnostic: AnthropicDispatchResult['safeDiagnostic'];
    }
  | {
      readonly decision: Exclude<NativeRoutingDecision, 'routed'>;
      readonly classification?: AnthropicDesktopClassification;
      readonly route?: NativeRouteSelection;
      readonly status: number;
      readonly reason: string;
      readonly safeDiagnostic: unknown;
    };

export async function routeClaudeDesktopAnthropicRequest(
  options: NativeRoutingOptions,
): Promise<NativeRoutingResult> {
  const classification = classifyAnthropicDesktopRequest(options.intercepted);
  if (classification.decision === 'pass_through') {
    return {
      decision: 'pass_through',
      classification,
      status: 200,
      reason: classification.reason,
      safeDiagnostic: classification.diagnostic,
    };
  }
  if (classification.decision === 'deny') {
    return {
      decision: 'deny',
      classification,
      status: 403,
      reason: classification.reason,
      safeDiagnostic: classification.diagnostic,
    };
  }
  if (classification.decision === 'malformed') {
    return {
      decision: 'malformed',
      classification,
      status: classification.status,
      reason: classification.errorBody.error.message,
      safeDiagnostic: classification.diagnostic,
    };
  }

  const selected = selectNativeRoute(options.models, options.route);
  if (!selected.ok) {
    return {
      decision: selected.reason === 'consent_required' ? 'consent_required' : 'route_blocked',
      status: selected.reason === 'consent_required' ? 409 : 404,
      reason: selected.message,
      safeDiagnostic: {
        providerId: options.route.providerId,
        modelId: options.route.modelId,
        errorCategory: selected.reason,
      },
    };
  }

  const dispatch = await dispatchAnthropicMessages({
    body: buildRoutedBody(classification.request, selected.model),
    inboundBeta: classification.request.forwardHeaders['anthropic-beta'],
    catalog: selected.catalog,
    modelCache: options.modelCache,
    apiKey: options.apiKey,
    backends: options.backends,
    gateway: options.gateway,
    vertex: options.vertex,
    target: options.target,
    log: options.log,
  });

  return {
    decision: 'routed',
    route: selected.route,
    dispatch,
    safeDiagnostic: dispatch.safeDiagnostic,
  };
}

export function selectNativeRoute(
  models: readonly ServerModelInfo[],
  request: NativeRoutingRequest,
): { ok: true; model: ServerModelInfo; catalog: ModelCatalog; route: NativeRouteSelection } | {
  ok: false;
  reason: 'not_found' | 'unsupported' | 'hidden' | 'consent_required';
  message: string;
} {
  const match = models.find(model => gatewayProviderId(model) === request.providerId && model.id === request.modelId);
  if (!match) {
    return { ok: false, reason: 'not_found', message: `Selected native route is no longer available: ${request.providerId}/${request.modelId}` };
  }
  if (match.modelFormat === 'unsupported') {
    return { ok: false, reason: 'unsupported', message: `Selected native route is unsupported: ${request.providerId}/${request.modelId}` };
  }
  if (isHiddenNativeRouteModel(match)) {
    return { ok: false, reason: 'hidden', message: `Selected native route is hidden from native routing: ${request.providerId}/${request.modelId}` };
  }

  const consent = request.crossProviderConsent;
  if (requiresCrossProviderConsent(match) && consent?.destinationProviderId !== gatewayProviderId(match)) {
    return {
      ok: false,
      reason: 'consent_required',
      message: `Cross-provider routing requires consent for ${gatewayProviderId(match)}`,
    };
  }

  const routeModelId = providerQualifiedRouteModelId(gatewayProviderId(match), match.id);
  const model: ServerModelInfo = {
    ...match,
    id: routeModelId,
    upstreamModelId: match.upstreamModelId ?? match.id,
  };
  return {
    ok: true,
    model,
    catalog: createModelCatalog([model]),
    route: {
      providerId: gatewayProviderId(match),
      modelId: match.id,
      routeModelId,
      providerLabel: match.providerLabel ?? gatewayProviderId(match),
    },
  };
}

export function providerQualifiedRouteModelId(providerId: string, modelId: string): string {
  const safeProvider = providerId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'provider';
  return `native-${safeProvider}__${modelId}`;
}

export function isHiddenNativeRouteModel(model: ServerModelInfo): boolean {
  const haystack = `${model.id} ${model.name} ${model.providerId ?? ''} ${model.providerLabel ?? ''}`.toLowerCase();
  return haystack.includes('unsupported-smoke') || haystack.includes('claude-smoke') || /\bsmoke\b/.test(haystack);
}

function buildRoutedBody(parsed: ParsedAnthropicDesktopRequest, model: ServerModelInfo): Record<string, unknown> {
  return {
    ...parsed.rawBody,
    model: model.id,
  };
}

function requiresCrossProviderConsent(model: ServerModelInfo): boolean {
  return gatewayProviderId(model) !== 'anthropic';
}
