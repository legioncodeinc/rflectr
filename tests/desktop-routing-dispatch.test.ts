import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLanguageModel } from '../src/provider-factory.js';
import {
  providerQualifiedRouteModelId,
  routeClaudeDesktopAnthropicRequest,
  selectNativeRoute,
} from '../src/desktop-interception/routing.js';
import type { InterceptedRequest } from '../src/desktop-interception/hooks.js';
import type { ServerModelInfo } from '../src/server/models.js';

vi.mock('../src/provider-factory.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/provider-factory.js')>();
  return {
    ...actual,
    createLanguageModel: vi.fn(async (spec: unknown) => ({ spec })),
  };
});

vi.mock('../src/sdk-adapter.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/sdk-adapter.js')>();
  return {
    ...actual,
    generateAnthropicResponse: vi.fn(async (_model: unknown, _params: unknown, modelId: string) => ({
      id: 'msg-sdk',
      type: 'message',
      role: 'assistant',
      model: modelId,
      content: [{ type: 'text', text: 'sdk ok' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
    })),
    streamAnthropicResponse: vi.fn(async (_model: unknown, _params: unknown, modelId: string, write: (chunk: string) => void) => {
      write(`event: message_start\ndata: {"type":"message_start","message":{"model":"${modelId}"}}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 1));
      write('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n\n');
      await new Promise(resolve => setTimeout(resolve, 1));
      write('event: message_stop\ndata: {"type":"message_stop"}\n\n');
    }),
  };
});

interface UpstreamRequest {
  readonly url: string;
  readonly authorization?: string;
  readonly body: unknown;
}

function intercepted(body: Record<string, unknown> = { model: 'claude-app-model', messages: [{ role: 'user', content: 'hi' }] }): InterceptedRequest {
  return {
    app: 'Claude Desktop',
    host: 'api.anthropic.com',
    port: 443,
    method: 'POST',
    path: '/v1/messages',
    url: 'https://api.anthropic.com/v1/messages',
    headers: {},
    body: Buffer.from(JSON.stringify(body)),
  };
}

function model(overrides: Partial<ServerModelInfo>): ServerModelInfo {
  return {
    id: 'model',
    name: 'Model',
    isFree: false,
    brand: 'Test',
    sourceBackend: overrides.providerId ?? 'provider',
    modelFormat: 'openai',
    npm: '@ai-sdk/openai',
    apiKey: 'key',
    ...overrides,
  };
}

function collectTarget() {
  const chunks: Array<string | Uint8Array> = [];
  const statuses: number[] = [];
  const headers: Array<Record<string, string>> = [];
  return {
    target: {
      headersSent: false,
      writeHead(status: number, nextHeaders: Record<string, string>) {
        this.headersSent = true;
        statuses.push(status);
        headers.push(nextHeaders);
      },
      write(chunk: string | Uint8Array) {
        chunks.push(chunk);
      },
      end(chunk?: string | Uint8Array) {
        if (chunk) chunks.push(chunk);
      },
    },
    chunks,
    statuses,
    headers,
    text: () => chunks.map(chunk => Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)).join(''),
  };
}

async function startUpstream(): Promise<{ baseUrl: string; requests: UpstreamRequest[]; close: () => Promise<void> }> {
  const requests: UpstreamRequest[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    requests.push({
      url: req.url ?? '',
      authorization: Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization,
      body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'msg-native',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'native ok' }],
    }));
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing upstream address');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())),
  };
}

const handles: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  vi.mocked(createLanguageModel).mockClear();
  while (handles.length) await handles.pop()!.close();
});

describe('Claude Desktop native routing dispatch', () => {
  it('uses provider-qualified route identity for duplicate model ids', () => {
    const models = [
      model({ id: 'gpt-4o', providerId: 'openai', providerLabel: 'OpenAI', apiKey: 'openai-key' }),
      model({ id: 'gpt-4o', providerId: 'openrouter', providerLabel: 'OpenRouter', apiKey: 'openrouter-key', npm: '@openrouter/ai-sdk-provider' }),
    ];

    expect(selectNativeRoute(models, {
      providerId: 'openai',
      modelId: 'gpt-4o',
      crossProviderConsent: { destinationProviderId: 'openai', consentedAt: '2026-06-29T00:00:00.000Z' },
    })).toMatchObject({
      ok: true,
      route: { routeModelId: 'native-openai__gpt-4o' },
    });
    expect(selectNativeRoute(models, {
      providerId: 'openrouter',
      modelId: 'gpt-4o',
      crossProviderConsent: { destinationProviderId: 'openrouter', consentedAt: '2026-06-29T00:00:00.000Z' },
    })).toMatchObject({
      ok: true,
      route: { routeModelId: 'native-openrouter__gpt-4o' },
    });
    expect(providerQualifiedRouteModelId('Open Router!', 'gpt-4o')).toBe('native-open-router__gpt-4o');
  });

  it('requires explicit cross-provider consent and invalidates deleted, unsupported, and hidden routes', () => {
    const available = [model({ id: 'gpt-4o', providerId: 'openai' })];

    expect(selectNativeRoute(available, { providerId: 'openai', modelId: 'gpt-4o' })).toMatchObject({
      ok: false,
      reason: 'consent_required',
    });
    expect(selectNativeRoute([], {
      providerId: 'openai',
      modelId: 'gpt-4o',
      crossProviderConsent: { destinationProviderId: 'openai', consentedAt: '2026-06-29T00:00:00.000Z' },
    })).toMatchObject({ ok: false, reason: 'not_found' });
    expect(selectNativeRoute([model({ id: 'bad', providerId: 'openai', modelFormat: 'unsupported' })], {
      providerId: 'openai',
      modelId: 'bad',
      crossProviderConsent: { destinationProviderId: 'openai', consentedAt: '2026-06-29T00:00:00.000Z' },
    })).toMatchObject({ ok: false, reason: 'unsupported' });
    expect(selectNativeRoute([model({ id: 'claude-smoke', providerId: 'anthropic', modelFormat: 'anthropic' })], {
      providerId: 'anthropic',
      modelId: 'claude-smoke',
    })).toMatchObject({ ok: false, reason: 'hidden' });
  });

  it('dispatches Anthropic-native routes through shared passthrough using the selected provider key', async () => {
    const upstream = await startUpstream();
    handles.push(upstream);
    const target = collectTarget();

    const result = await routeClaudeDesktopAnthropicRequest({
      intercepted: intercepted({ model: 'claude-original', stream: false, messages: [{ role: 'user', content: 'hi' }] }),
      route: { providerId: 'anthropic', modelId: 'claude-3-5-sonnet' },
      models: [model({
        id: 'claude-3-5-sonnet',
        providerId: 'anthropic',
        providerLabel: 'Anthropic',
        sourceBackend: 'anthropic',
        modelFormat: 'anthropic',
        baseUrl: upstream.baseUrl,
        apiKey: 'anthropic-key',
      })],
      modelCache: new Map(),
      apiKey: 'server-key',
      backends: { zen: { baseUrl: upstream.baseUrl }, go: { baseUrl: upstream.baseUrl } },
      target: target.target,
    });

    expect(result.decision).toBe('routed');
    expect(upstream.requests).toEqual([
      expect.objectContaining({
        url: '/v1/messages',
        authorization: 'Bearer anthropic-key',
        body: expect.objectContaining({ model: 'claude-3-5-sonnet' }),
      }),
    ]);
    expect(target.statuses).toEqual([200]);
    expect(JSON.parse(target.text())).toMatchObject({ id: 'msg-native' });
  });

  it('dispatches SDK-backed routes through createLanguageModel and Anthropic-compatible responses', async () => {
    const target = collectTarget();

    const result = await routeClaudeDesktopAnthropicRequest({
      intercepted: intercepted({ model: 'claude-original', stream: false, messages: [{ role: 'user', content: 'hi' }] }),
      route: {
        providerId: 'openai',
        modelId: 'gpt-4o',
        crossProviderConsent: { destinationProviderId: 'openai', consentedAt: '2026-06-29T00:00:00.000Z' },
      },
      models: [model({ id: 'gpt-4o', providerId: 'openai', npm: '@ai-sdk/openai', apiKey: 'openai-key' })],
      modelCache: new Map(),
      apiKey: 'server-key',
      backends: { zen: { baseUrl: 'https://zen.example' }, go: { baseUrl: 'https://go.example' } },
      target: target.target,
    });

    expect(result.decision).toBe('routed');
    expect(vi.mocked(createLanguageModel)).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'openai',
      modelId: 'gpt-4o',
      apiKey: 'openai-key',
    }));
    expect(JSON.parse(target.text())).toMatchObject({
      id: 'msg-sdk',
      model: 'native-openai__gpt-4o',
      content: [{ type: 'text', text: 'sdk ok' }],
    });
  });

  it('keeps streaming progressive at the shared dispatch target', async () => {
    const target = collectTarget();

    await routeClaudeDesktopAnthropicRequest({
      intercepted: intercepted({ model: 'claude-original', stream: true, messages: [{ role: 'user', content: 'hi' }] }),
      route: {
        providerId: 'openai',
        modelId: 'gpt-4o',
        crossProviderConsent: { destinationProviderId: 'openai', consentedAt: '2026-06-29T00:00:00.000Z' },
      },
      models: [model({ id: 'gpt-4o', providerId: 'openai', npm: '@ai-sdk/openai', apiKey: 'openai-key' })],
      modelCache: new Map(),
      apiKey: 'server-key',
      backends: { zen: { baseUrl: 'https://zen.example' }, go: { baseUrl: 'https://go.example' } },
      target: target.target,
    });

    expect(target.headers[0]).toMatchObject({ 'Content-Type': 'text/event-stream' });
    expect(target.chunks.length).toBeGreaterThan(1);
    expect(target.text()).toContain('event: message_start');
    expect(target.text()).toContain('event: content_block_delta');
    expect(target.text()).toContain('event: message_stop');
  });

  it('refreshes credentials without a full server restart by keying SDK cache on credential fingerprint', async () => {
    const modelCache = new Map();

    for (const apiKey of ['old-key', 'new-key']) {
      const target = collectTarget();
      await routeClaudeDesktopAnthropicRequest({
        intercepted: intercepted({ model: 'claude-original', stream: false, messages: [{ role: 'user', content: 'hi' }] }),
        route: {
          providerId: 'openai',
          modelId: 'gpt-4o',
          crossProviderConsent: { destinationProviderId: 'openai', consentedAt: '2026-06-29T00:00:00.000Z' },
        },
        models: [model({ id: 'gpt-4o', providerId: 'openai', npm: '@ai-sdk/openai', apiKey })],
        modelCache,
        apiKey: 'server-key',
        backends: { zen: { baseUrl: 'https://zen.example' }, go: { baseUrl: 'https://go.example' } },
        target: target.target,
      });
    }

    expect(vi.mocked(createLanguageModel)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createLanguageModel).mock.calls.map(call => (call[0] as { apiKey: string }).apiKey)).toEqual(['old-key', 'new-key']);
  });

  it('passes through non-inference traffic and reports redacted route failures', async () => {
    const target = collectTarget();
    const passThrough = await routeClaudeDesktopAnthropicRequest({
      intercepted: {
        ...intercepted({}),
        host: 'claude.ai',
        method: 'GET',
        path: '/api/bootstrap?token=secret',
      },
      route: { providerId: 'anthropic', modelId: 'claude' },
      models: [],
      modelCache: new Map(),
      apiKey: 'server-key',
      backends: { zen: { baseUrl: 'https://zen.example' }, go: { baseUrl: 'https://go.example' } },
      target: target.target,
    });
    expect(passThrough).toMatchObject({ decision: 'pass_through' });
    expect(JSON.stringify(passThrough.safeDiagnostic)).not.toContain('secret');

    const blocked = await routeClaudeDesktopAnthropicRequest({
      intercepted: intercepted({ model: 'claude-original', messages: [{ role: 'user', content: 'secret prompt' }] }),
      route: { providerId: 'deleted', modelId: 'missing' },
      models: [],
      modelCache: new Map(),
      apiKey: 'server-key',
      backends: { zen: { baseUrl: 'https://zen.example' }, go: { baseUrl: 'https://go.example' } },
      target: target.target,
    });
    expect(blocked).toMatchObject({
      decision: 'route_blocked',
      status: 404,
      safeDiagnostic: { providerId: 'deleted', modelId: 'missing', errorCategory: 'not_found' },
    });
    expect(JSON.stringify(blocked)).not.toContain('secret prompt');
  });
});
