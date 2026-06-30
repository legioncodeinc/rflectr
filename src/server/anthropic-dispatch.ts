// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
import type { LanguageModel } from 'ai';
import { createHash } from 'node:crypto';
import { createLanguageModel, isSdkMigratedNpm } from '../provider-factory.js';
import {
  anthropicEffortFromRequest,
  generateAnthropicResponse,
  streamAnthropicResponse,
  translateRequest as sdkTranslateRequest,
  type AnthropicRequest,
} from '../sdk-adapter.js';
import { anthropicUpstreamHeaders, UpstreamUnreachableError } from '../upstream-forward.js';
import { redactText } from '../desktop-interception/redaction.js';
import {
  gatewayDisplayName,
  upstreamModelId,
  type GatewayModelOptions,
  type ModelCatalog,
  type ServerBackendId,
  type ServerModelInfo,
} from './models.js';

export interface ServerBackend {
  baseUrl: string;
}

export interface VertexServerConfig {
  project: string;
  location: string;
}

export interface AnthropicDispatchTarget {
  readonly headersSent: boolean;
  writeHead(status: number, headers: Record<string, string>): void;
  write(chunk: string | Uint8Array): void;
  end(chunk?: string | Uint8Array): void;
}

export interface AnthropicDispatchOptions {
  readonly body: Record<string, unknown>;
  readonly inboundBeta?: string;
  readonly catalog: ModelCatalog;
  readonly modelCache: Map<string, LanguageModel>;
  readonly apiKey: string;
  readonly backends: Record<ServerBackendId, ServerBackend>;
  readonly gateway?: GatewayModelOptions;
  readonly vertex?: VertexServerConfig;
  readonly target: AnthropicDispatchTarget;
  readonly log?: (msg: string | (() => string)) => void;
}

export type AnthropicDispatchDecision =
  | 'routed'
  | 'invalid_request'
  | 'model_not_found'
  | 'unsupported'
  | 'upstream_error'
  | 'runtime_error';

export interface AnthropicDispatchResult {
  readonly decision: AnthropicDispatchDecision;
  readonly status: number;
  readonly model: ServerModelInfo | null;
  readonly streamed: boolean;
  readonly responseBody?: unknown;
  readonly safeDiagnostic: {
    readonly providerId?: string;
    readonly modelId?: string;
    readonly route?: string;
    readonly errorCategory?: AnthropicDispatchDecision;
    readonly message?: string;
  };
}

export async function dispatchAnthropicMessages(
  options: AnthropicDispatchOptions,
): Promise<AnthropicDispatchResult> {
  const bodyModel = options.body.model;
  if (typeof bodyModel !== 'string') {
    const responseBody = { error: { message: 'Request body must include a model string' } };
    sendTargetJson(options.target, 400, responseBody);
    return dispatchResult('invalid_request', 400, null, false, responseBody);
  }

  const model = options.catalog.get(bodyModel);
  if (!model) {
    const responseBody = { error: { message: `Unknown model: ${bodyModel}` } };
    sendTargetJson(options.target, 400, responseBody);
    return dispatchResult('model_not_found', 400, null, false, responseBody, { modelId: bodyModel });
  }

  options.log?.(() => `anthropic-messages model=${bodyModel} format=${model.modelFormat} npm=${model.npm ?? 'none'} stream=${String(options.body.stream)}`);

  try {
    if (model.modelFormat === 'anthropic') {
      return await dispatchAnthropicNative(options, model, bodyModel);
    }

    if (model.modelFormat === 'openai') {
      return await dispatchSdkBackedAnthropic(options, model, bodyModel);
    }

    const responseBody = { error: { message: `Unsupported model format: ${model.modelFormat}` } };
    sendTargetJson(options.target, 400, responseBody);
    return dispatchResult('unsupported', 400, model, false, responseBody);
  } catch (error) {
    const message = safeDispatchError(error);
    const status = error instanceof UpstreamUnreachableError ? 502 : 502;
    const responseBody = { error: { message } };
    if (!options.target.headersSent) {
      sendTargetJson(options.target, status, responseBody);
    } else {
      options.target.end();
    }
    return dispatchResult('runtime_error', status, model, false, responseBody, {
      errorCategory: 'runtime_error',
      message,
    });
  }
}

export async function getOrInitLanguageModel(
  modelCache: Map<string, LanguageModel>,
  model: ServerModelInfo,
  npm: string,
  baseURL: string | undefined,
  apiKey: string,
  vertex: VertexServerConfig | undefined,
): Promise<LanguageModel> {
  const headersKey = model.headers && Object.keys(model.headers).length > 0
    ? JSON.stringify(Object.fromEntries(Object.entries(model.headers).sort(([a], [b]) => a.localeCompare(b))))
    : '';
  const cacheKey = [
    model.providerId ?? model.sourceBackend,
    model.id,
    upstreamModelId(model),
    npm,
    baseURL ?? '',
    credentialCacheFingerprint(apiKey),
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

function credentialCacheFingerprint(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
}

function dispatchResult(
  decision: AnthropicDispatchDecision,
  status: number,
  model: ServerModelInfo | null,
  streamed: boolean,
  responseBody?: unknown,
  extraDiagnostic: Partial<AnthropicDispatchResult['safeDiagnostic']> = {},
): AnthropicDispatchResult {
  return {
    decision,
    status,
    model,
    streamed,
    responseBody,
    safeDiagnostic: {
      providerId: model?.providerId ?? model?.sourceBackend,
      modelId: model?.id,
      route: model ? `${model.providerId ?? model.sourceBackend}:${model.id}` : undefined,
      errorCategory: decision === 'routed' ? undefined : decision,
      ...extraDiagnostic,
    },
  };
}

function backendFor(backends: Record<ServerBackendId, ServerBackend>, model: ServerModelInfo): ServerBackend {
  if (model.sourceBackend === 'vertex') {
    throw new Error(`Vertex models route through the SDK adapter, not cloud backends: ${model.id}`);
  }
  if (model.sourceBackend === 'zen') return backends.zen;
  if (model.sourceBackend === 'go') return backends.go;
  throw new Error(`Provider ${model.sourceBackend} is not a cloud backend - model must set baseUrl/completionsUrl`);
}

async function dispatchAnthropicNative(
  options: AnthropicDispatchOptions,
  model: ServerModelInfo,
  requestModelId: string,
): Promise<AnthropicDispatchResult> {
  if (model.baseUrl && !/^https?:\/\//i.test(model.baseUrl)) {
    const responseBody = { error: { message: 'Invalid provider baseUrl: must be http:// or https://' } };
    sendTargetJson(options.target, 400, responseBody);
    return dispatchResult('invalid_request', 400, model, false, responseBody);
  }

  const messagesUrl = model.baseUrl
    ? `${model.baseUrl}/v1/messages`
    : `${backendFor(options.backends, model).baseUrl}/v1/messages`;
  const apiKey = model.apiKey ?? options.apiKey;
  const upstreamBody = { ...options.body, model: upstreamModelId(model) };
  const stream = Boolean(options.body.stream);

  options.log?.(() => `anthropic-passthrough -> ${messagesUrl}`);
  const result = await relayAnthropicMessagesToTarget(
    options.target,
    messagesUrl,
    upstreamBody,
    apiKey,
    stream,
    options.inboundBeta,
    model.headers,
  );
  return dispatchResult('routed', result.status, model, result.streamed, result.body, {
    modelId: requestModelId,
  });
}

async function dispatchSdkBackedAnthropic(
  options: AnthropicDispatchOptions,
  model: ServerModelInfo,
  requestModelId: string,
): Promise<AnthropicDispatchResult> {
  if (!isSdkMigratedNpm(model.npm)) {
    const responseBody = { error: { message: `No SDK provider for model: ${model.id}` } };
    sendTargetJson(options.target, 400, responseBody);
    return dispatchResult('unsupported', 400, model, false, responseBody);
  }

  const apiKey = model.apiKey ?? options.apiKey;
  const languageModel = await getOrInitLanguageModel(
    options.modelCache,
    model,
    model.npm!,
    model.apiBaseUrl,
    apiKey,
    options.vertex,
  );
  const params = sdkTranslateRequest(options.body as unknown as AnthropicRequest, model.npm!, {
    defaultEffort: anthropicEffortFromRequest(options.body as unknown as AnthropicRequest) ? undefined : model.defaultEffort,
    openAiOAuth: model.npm === '@ai-sdk/openai' && model.authType === 'oauth',
    reasoningMetadata: {
      providerId: model.providerId,
      apiBaseUrl: model.apiBaseUrl,
      supportedParameters: model.supportedParameters,
      reasoning: model.reasoning,
      interleavedReasoningField: model.interleavedReasoningField,
    },
  });
  const stream = Boolean(options.body.stream);
  const responseModelId = getResponseModelId(requestModelId, model, options.gateway);

  options.log?.(() => `sdk npm=${model.npm} upstream=${upstreamModelId(model)} responseModel=${responseModelId} stream=${stream}`);

  if (stream) {
    options.target.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    await streamAnthropicResponse(languageModel, params, responseModelId, chunk => options.target.write(chunk));
    options.target.end();
    return dispatchResult('routed', 200, model, true, undefined, { modelId: requestModelId });
  }

  const responseBody = await generateAnthropicResponse(languageModel, params, responseModelId);
  sendTargetJson(options.target, 200, responseBody);
  return dispatchResult('routed', 200, model, false, responseBody, { modelId: requestModelId });
}

async function relayAnthropicMessagesToTarget(
  target: AnthropicDispatchTarget,
  messagesUrl: string,
  body: Record<string, unknown>,
  apiKey: string,
  clientWantsStream: boolean,
  inboundBeta?: string,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; streamed: boolean; body?: unknown }> {
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(messagesUrl, {
      method: 'POST',
      headers: {
        ...anthropicUpstreamHeaders(apiKey, clientWantsStream, inboundBeta),
        ...(extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new UpstreamUnreachableError(err);
  }

  const contentType = upstreamRes.headers.get('content-type') || (clientWantsStream ? 'text/event-stream' : 'application/json');
  if (!upstreamRes.ok) {
    const text = await upstreamRes.text();
    target.writeHead(upstreamRes.status, { 'Content-Type': contentType });
    target.end(text);
    return { status: upstreamRes.status, streamed: false, body: parseJsonOrText(text) };
  }

  if (clientWantsStream && upstreamRes.body) {
    target.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    const reader = upstreamRes.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) target.write(value);
    }
    target.end();
    return { status: 200, streamed: true };
  }

  if (!upstreamRes.body) {
    const responseBody = { type: 'error', error: { type: 'api_error', message: 'Upstream returned empty response body' } };
    sendTargetJson(target, 502, responseBody);
    return { status: 502, streamed: false, body: responseBody };
  }

  const text = await upstreamRes.text();
  const parsed = parseJsonOrText(text);
  if (typeof parsed === 'string') {
    const responseBody = { type: 'error', error: { type: 'api_error', message: 'Upstream response was not valid JSON' } };
    sendTargetJson(target, 502, responseBody);
    return { status: 502, streamed: false, body: responseBody };
  }
  target.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text).toString(),
  });
  target.end(text);
  return { status: 200, streamed: false, body: parsed };
}

function getResponseModelId(bodyModel: string, model: ServerModelInfo, gateway: GatewayModelOptions | undefined): string {
  return gateway?.maskGatewayIds ? gatewayDisplayName(model, gateway) : bodyModel;
}

function sendTargetJson(target: AnthropicDispatchTarget, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  target.writeHead(status, { 'Content-Type': 'application/json' });
  target.end(json);
}

function parseJsonOrText(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function safeDispatchError(error: unknown): string {
  return redactText(error instanceof Error ? error.message : String(error));
}
