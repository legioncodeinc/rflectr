import { createServer, request as httpRequest, type Server } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { platform, release, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGatewayModelCatalog, type ServerModelInfo } from '../src/server/models.js';
import { startServer, type ServerHandle } from '../src/server/router.js';
import { createLanguageModel } from '../src/provider-factory.js';
import { createObservedClaudeVerification } from '../src/desktop-interception/claude-target.js';
import { saveClaudeNativeVerification } from '../src/desktop-interception/claude-native-state.js';

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
      id: 'msg-test',
      type: 'message',
      role: 'assistant',
      model: modelId,
      content: [{ type: 'text', text: 'sdk ok' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
    })),
  };
});

vi.mock('../src/openai-adapter.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/openai-adapter.js')>();
  return {
    ...actual,
    generateOpenAiResponse: vi.fn(async (_model: unknown, _params: unknown, modelId: string) => ({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      model: modelId,
      choices: [{ message: { content: 'openai sdk ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    })),
  };
});

interface UpstreamRequest {
  method: string;
  url: string;
  authorization: string | undefined;
  body: any;
}

async function readRequestBody(req: Parameters<typeof createServer>[0] extends (req: infer R, res: any) => any ? R : never): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : null;
}

async function startUpstream(responseBody: any): Promise<{ baseUrl: string; requests: UpstreamRequest[]; close: () => Promise<void> }> {
  const requests: UpstreamRequest[] = [];
  const server = createServer(async (req, res) => {
    requests.push({
      method: req.method ?? '',
      url: req.url ?? '',
      authorization: Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization,
      body: await readRequestBody(req),
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseBody));
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing upstream address');

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve()))),
  };
}

async function startStreamingUpstream(): Promise<{ baseUrl: string; requests: UpstreamRequest[]; close: () => Promise<void> }> {
  const requests: UpstreamRequest[] = [];
  const server = createServer(async (req, res) => {
    requests.push({
      method: req.method ?? '',
      url: req.url ?? '',
      authorization: Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization,
      body: await readRequestBody(req),
    });
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('event: message_start\ndata: {"type":"message_start"}\n\n');
    setTimeout(() => {
      res.write('event: content_block_delta\ndata: {"type":"content_block_delta"}\n\n');
      res.end('event: message_stop\ndata: {"type":"message_stop"}\n\n');
    }, 90);
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing upstream address');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve()))),
  };
}

async function proxyRequest(proxyPort: number, url: string, method = 'GET', body?: string): Promise<{ status: number; body: string }> {
  const timings = await proxyRequestTimings(proxyPort, url, method, body);
  return { status: timings.status, body: timings.body };
}

async function proxyRequestTimings(proxyPort: number, url: string, method = 'GET', body?: string): Promise<{ status: number; body: string; firstChunkMs: number; totalMs: number }> {
  const started = Date.now();
  return await new Promise((resolve, reject) => {
    const req = httpRequest({
      host: '127.0.0.1',
      port: proxyPort,
      method,
      path: url,
      headers: body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : undefined,
    }, res => {
      const chunks: Buffer[] = [];
      let firstChunkMs = Number.POSITIVE_INFINITY;
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('data', () => {
        if (firstChunkMs === Number.POSITIVE_INFINITY) firstChunkMs = Date.now() - started;
      });
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        body: Buffer.concat(chunks).toString(),
        firstChunkMs,
        totalMs: Date.now() - started,
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const catalog = createGatewayModelCatalog([
  model('claude-native', 'anthropic', 'zen'),
  model('openai-format', 'openai', 'go'),
  model('bad-format', 'unsupported', 'zen'),
]);

const handles: Array<ServerHandle | { close: () => Promise<void> }> = [];
let tempHome: string | null = null;
let previousRflectrHome: string | undefined;
let previousLocalAppData: string | undefined;

function model(
  id: string,
  modelFormat: ServerModelInfo['modelFormat'],
  sourceBackend: ServerModelInfo['sourceBackend'],
): ServerModelInfo {
  return {
    id,
    name: id,
    isFree: false,
    brand: 'Other',
    sourceBackend,
    modelFormat,
  };
}

async function startTestServer(options: Partial<Parameters<typeof startServer>[0]> = {}): Promise<ServerHandle> {
  const upstream = await startUpstream({
    id: 'chatcmpl-test',
    choices: [{ message: { content: 'upstream ok' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 5, completion_tokens: 7 },
  });
  handles.push(upstream);

  const handle = await startServer({
    host: '127.0.0.1',
    port: 0,
    apiKey: 'real-opencode-key',
    serverPassword: null,
    catalog,
    backends: {
      zen: { baseUrl: upstream.baseUrl },
      go: { baseUrl: upstream.baseUrl },
    },
    ...options,
  });
  handles.push(handle);
  return handle;
}

async function closeHandle(handle: ServerHandle | { close: () => Promise<void> }): Promise<void> {
  await handle.close();
}

afterEach(async () => {
  vi.mocked(createLanguageModel).mockClear();
  while (handles.length > 0) {
    const handle = handles.pop();
    if (handle) await closeHandle(handle);
  }
  if (tempHome) {
    rmSync(tempHome, { recursive: true, force: true });
    tempHome = null;
  }
  if (previousRflectrHome === undefined) delete process.env['RFLECTR_HOME'];
  else process.env['RFLECTR_HOME'] = previousRflectrHome;
  previousRflectrHome = undefined;
  if (previousLocalAppData === undefined) delete process.env['LOCALAPPDATA'];
  else process.env['LOCALAPPDATA'] = previousLocalAppData;
  previousLocalAppData = undefined;
});

vi.mock('../src/registry/import-opencode.js', () => ({
  importFromOpencode: vi.fn(async () => ({
    imported: [{ id: 'groq', name: 'Groq' }],
    skipped: [],
    keysSkipped: [],
    keysSaved: 1,
    oauthImported: 0,
  })),
}));

vi.mock('../src/registry/add-template.js', () => ({
  addProviderFromTemplate: vi.fn(async template => ({
    added: true,
    provider: { id: template.id, name: template.name },
    modelCount: 2,
  })),
}));

function useTempRflectrHome(): string {
  previousRflectrHome = process.env['RFLECTR_HOME'];
  tempHome = mkdtempSync(join(tmpdir(), 'rflectr-dashboard-test-'));
  process.env['RFLECTR_HOME'] = tempHome;
  return tempHome;
}

function writeConfig(config: unknown): void {
  const home = useTempRflectrHome();
  const path = join(home, 'config.json');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');
}

function writeProviders(registry: unknown): void {
  const home = tempHome ?? useTempRflectrHome();
  const path = join(home, 'providers.json');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(registry, null, 2), 'utf8');
}

const dashboardJsonHeaders = {
  'Content-Type': 'application/json',
  'x-rflectr-dashboard': '1',
};

const dashboardMutationHeaders = {
  'x-rflectr-dashboard': '1',
};

describe('server router', () => {
  it('serves health and model list endpoints', async () => {
    const server = await startTestServer();

    const health = await fetch(`${server.url}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });

    const models = await fetch(`${server.url}/models`);
    expect(models.status).toBe(200);
    expect(await models.json()).toEqual({
      models: expect.arrayContaining([
        expect.objectContaining({ id: 'claude-native' }),
        expect.objectContaining({ id: 'openai-format' }),
      ]),
    });

    const anthropic = await fetch(`${server.url}/anthropic/v1/models`);
    expect(anthropic.status).toBe(200);
    expect(await anthropic.json()).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'claude-native' }),
        expect.objectContaining({ id: 'anthropic-go__openai-format' }),
      ]),
    });

    const openai = await fetch(`${server.url}/openai/v1/models`);
    expect(openai.status).toBe(200);
    expect(await openai.json()).toMatchObject({ object: 'list' });
  });

  it('serves the dashboard shell and static assets without shadowing API routes', async () => {
    const server = await startTestServer();

    const shell = await fetch(`${server.url}/dashboard/models`);
    expect(shell.status).toBe(200);
    expect(shell.headers.get('content-type')).toContain('text/html');
    expect(await shell.text()).toContain('rflectr dashboard');

    const css = await fetch(`${server.url}/dashboard/assets/dashboard.css`);
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toContain('text/css');

    const js = await fetch(`${server.url}/dashboard/assets/dashboard.js`);
    expect(js.status).toBe(200);
    expect(js.headers.get('content-type')).toContain('text/javascript');
    const jsText = await js.text();
    expect(jsText).toContain('function safeGet');
    expect(jsText).toContain('function safeSet');
    expect(() => new Function(jsText)).not.toThrow();
    expect(jsText).toContain('function providerFormHtml');
    expect(jsText).toContain('Save credentials');
    expect(jsText).toContain('function removeProvider');
    expect(jsText).toContain('function icon');
    expect(jsText).toContain('svgicon');
    expect(jsText).toContain('function connectClaudeDesktop');
    expect(jsText).toContain('function desktopApps');
    expect(jsText).toContain('Desktop Apps');
    expect(jsText).toContain('Codex Desktop');
    expect(jsText).toContain('Native interception');
    expect(jsText).toContain('Legacy gateway fallback');
    expect(jsText).toContain('/dashboard/api/claude-desktop/connect');
    expect(jsText).toContain('/dashboard/api/codex-desktop/connect');
    expect(jsText).toContain('/dashboard/api/test');
    expect(jsText).toContain('Test provider');
    expect(jsText).toContain('connectCodexDesktop');
    expect(jsText).toContain('Responses proxy');
    expect(jsText).toContain('OpenCode model source');
    expect(jsText).not.toContain('Dashboard-managed Codex Desktop sessions need the Responses proxy flow');
    expect(jsText).not.toContain('▦');
    expect(jsText).not.toContain('▣');
    expect(jsText).not.toContain('☰');
    expect(jsText).not.toContain('☼');
    expect(jsText).not.toContain('⌁');
    expect(jsText).not.toContain('☷');
    expect(jsText).not.toContain(' plan');
    expect(jsText).not.toContain('Subscription');
    expect(jsText).not.toContain('prompt(');
    expect(jsText.indexOf('const payload=')).toBeLessThan(jsText.indexOf("providerStatus='Saving provider...'"));

    const missingApi = await fetch(`${server.url}/dashboard/api/does-not-exist`);
    expect(missingApi.status).toBe(404);
  });

  it('tests a provider by running a small real gateway request', async () => {
    const upstream = await startUpstream({
      id: 'msg-test',
      content: [{ type: 'text', text: 'rflectr ok' }],
      usage: { input_tokens: 5, output_tokens: 2 },
    });
    handles.push(upstream);
    const server = await startTestServer({
      backends: {
        zen: { baseUrl: upstream.baseUrl },
        go: { baseUrl: upstream.baseUrl },
      },
    });

    const response = await fetch(`${server.url}/dashboard/api/test`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ providerId: 'zen' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      providerId: 'zen',
      modelId: 'claude-native',
      preview: 'rflectr ok',
      usage: { inputTokens: 5, outputTokens: 2, totalTokens: 7 },
    });
    expect(upstream.requests.at(-1)).toMatchObject({
      method: 'POST',
      url: '/v1/messages',
      authorization: 'Bearer real-opencode-key',
      body: expect.objectContaining({
        model: 'claude-native',
        max_tokens: 8,
        stream: false,
      }),
    });
  });

  it('tests a specific OpenAI-format model through chat completions', async () => {
    const upstream = await startUpstream({
      id: 'chatcmpl-test',
      choices: [{ message: { content: 'rflectr ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
    });
    handles.push(upstream);
    const server = await startTestServer({
      backends: {
        zen: { baseUrl: upstream.baseUrl },
        go: { baseUrl: upstream.baseUrl },
      },
    });

    const response = await fetch(`${server.url}/dashboard/api/test`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ modelId: 'openai-format' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      providerId: 'go',
      modelId: 'openai-format',
      format: 'openai',
      preview: 'rflectr ok',
      usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    });
    expect(upstream.requests.at(-1)).toMatchObject({
      method: 'POST',
      url: '/v1/chat/completions',
      body: expect.objectContaining({
        model: 'openai-format',
        max_tokens: 8,
        stream: false,
      }),
    });
  });

  it('protects dashboard data endpoints with the server password', async () => {
    const server = await startTestServer({ serverPassword: 'secret' });

    const shell = await fetch(`${server.url}/dashboard`);
    expect(shell.status).toBe(200);

    const missing = await fetch(`${server.url}/dashboard/api/settings`);
    expect(missing.status).toBe(401);

    const authorized = await fetch(`${server.url}/dashboard/api/settings`, {
      headers: { authorization: 'Bearer secret' },
    });
    expect(authorized.status).toBe(200);
  });

  it('returns dashboard-safe provider, model, and settings DTOs', async () => {
    writeConfig({ defaultTool: 'codex', server: { requestTracing: true } });
    writeProviders({
      schemaVersion: 1,
      providers: [{
        id: 'zen',
        templateId: 'opencode-zen',
        name: 'OpenCode Zen',
        enabled: true,
        authRef: 'keyring:global:opencode',
        authType: 'api',
        subscriptionFilter: 'go',
        api: {},
        addedAt: '2026-01-01T00:00:00.000Z',
      }],
    });
    const secretCatalog = createGatewayModelCatalog([{
      id: 'secret-model',
      name: 'Secret Model',
      isFree: false,
      brand: 'Secret',
      providerId: 'secret-provider',
      providerLabel: 'Secret Provider',
      sourceBackend: 'secret-provider',
      modelFormat: 'openai',
      npm: '@ai-sdk/openai-compatible',
      apiKey: 'sk-dashboard-secret',
      headers: { authorization: 'Bearer sk-dashboard-secret' },
      cost: { input: 1, output: 2 },
    }]);
    const server = await startTestServer({ catalog: secretCatalog });

    const providers = await (await fetch(`${server.url}/dashboard/api/providers`)).json() as any;
    const models = await (await fetch(`${server.url}/dashboard/api/models`)).json() as any;
    const settings = await (await fetch(`${server.url}/dashboard/api/settings`)).json() as any;
    const raw = JSON.stringify({ providers, models, settings });

    expect(raw).not.toContain('sk-dashboard-secret');
    expect(raw).not.toContain('authorization');
    expect(providers.providers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'zen', auth: expect.objectContaining({ redacted: true }) }),
    ]));
    expect(models.models[0]).toMatchObject({
      id: 'secret-model',
      format: 'translated',
      favorite: false,
    });
    expect(settings).toMatchObject({
      modelSource: 'go',
      defaultTool: 'codex',
      routing: expect.objectContaining({ requestTracing: true }),
      gateway: expect.objectContaining({ restartSupported: false }),
      claudeDesktop: expect.objectContaining({
        baseUrl: expect.stringContaining('/anthropic'),
        nativeInterception: expect.objectContaining({
          available: false,
          primary: false,
          status: 'verification_required',
        }),
        legacyGateway: expect.objectContaining({
          available: true,
          primary: true,
          mode: 'legacy_gateway',
        }),
      }),
      codexDesktop: expect.objectContaining({ command: 'rflectr codex-app' }),
    });
  });

  it('marks configured API providers without an auth reference as missing', async () => {
    writeConfig({});
    writeProviders({
      schemaVersion: 1,
      providers: [{
        id: 'missing-key',
        templateId: 'groq',
        name: 'Missing Key',
        enabled: true,
        authType: 'api',
        api: { npm: '@ai-sdk/groq', url: 'https://api.groq.com/openai/v1' },
        addedAt: '2026-01-01T00:00:00.000Z',
      }],
    });
    const server = await startTestServer();

    const providers = await (await fetch(`${server.url}/dashboard/api/providers`)).json() as any;

    expect(providers.providers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'missing-key',
        status: 'missing',
        auth: expect.objectContaining({ redacted: true, label: 'Credential missing' }),
        baseUrl: 'https://api.groq.com/openai/v1',
      }),
    ]));
    expect(JSON.stringify(providers)).not.toContain('sk-');
  });

  it('persists dashboard settings and model favorite mutations', async () => {
    writeConfig({ favoriteModels: [] });
    writeProviders({
      schemaVersion: 1,
      providers: [{
        id: 'zen',
        templateId: 'opencode-zen',
        name: 'OpenCode Zen',
        enabled: true,
        authRef: 'keyring:global:opencode',
        authType: 'api',
        api: {},
        addedAt: '2026-01-01T00:00:00.000Z',
      }],
    });
    const server = await startTestServer();

    const favorite = await fetch(`${server.url}/dashboard/api/models/favorite`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ providerId: 'zen', modelId: 'claude-native', favorite: true }),
    });
    expect(favorite.status).toBe(200);
    expect(await favorite.json()).toMatchObject({
      favoriteModels: [{ providerId: 'zen', modelId: 'claude-native' }],
    });

    const settings = await fetch(`${server.url}/dashboard/api/settings`, {
      method: 'PATCH',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ defaultTool: 'gemini', modelSource: 'free', requestTracing: true }),
    });
    expect(settings.status).toBe(200);

    const readback = await (await fetch(`${server.url}/dashboard/api/settings`)).json() as any;
    expect(readback).toMatchObject({
      modelSource: 'free',
      modelSourceAvailable: true,
      defaultTool: 'gemini',
      routing: expect.objectContaining({ requestTracing: true }),
    });
  });

  it('hides OpenCode model source settings when OpenCode is not configured', async () => {
    writeConfig({});
    writeProviders({ schemaVersion: 1, providers: [] });
    const server = await startTestServer();

    const settings = await (await fetch(`${server.url}/dashboard/api/settings`)).json() as any;
    expect(settings).toMatchObject({
      modelSource: null,
      modelSourceAvailable: false,
    });

    const update = await fetch(`${server.url}/dashboard/api/settings`, {
      method: 'PATCH',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ modelSource: 'zen' }),
    });
    expect(update.status).toBe(400);
    expect(await update.json()).toMatchObject({
      error: { message: 'OpenCode is not configured' },
    });

    const providers = await (await fetch(`${server.url}/dashboard/api/providers`)).json() as any;
    expect(providers.providers.some((provider: any) => provider.id === 'zen')).toBe(false);
  });

  it('runs provider import and add actions from dashboard endpoints', async () => {
    writeConfig({});
    writeProviders({ schemaVersion: 1, providers: [] });
    const server = await startTestServer();

    const templates = await (await fetch(`${server.url}/dashboard/api/providers/templates`)).json() as any;
    expect(templates.templates).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'groq', name: 'Groq' }),
    ]));

    const imported = await fetch(`${server.url}/dashboard/api/providers/import-opencode`, { method: 'POST', headers: dashboardMutationHeaders });
    expect(imported.status).toBe(200);
    expect(await imported.json()).toMatchObject({
      imported: [{ id: 'groq', name: 'Groq' }],
      keysSaved: 1,
    });

    const added = await fetch(`${server.url}/dashboard/api/providers`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ templateId: 'groq', apiKey: 'gsk_test' }),
    });
    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({
      provider: { id: 'groq', name: 'Groq' },
      modelCount: 2,
    });
  });

  it('edits provider metadata without replacing an unchanged credential', async () => {
    writeConfig({});
    writeProviders({
      schemaVersion: 1,
      providers: [{
        id: 'groq',
        templateId: 'groq',
        name: 'Groq',
        enabled: true,
        authRef: 'keyring:provider:groq',
        authType: 'api',
        api: { npm: '@ai-sdk/groq', url: 'https://api.groq.com/openai/v1' },
        addedAt: '2026-01-01T00:00:00.000Z',
      }],
    });
    const server = await startTestServer();

    const edited = await fetch(`${server.url}/dashboard/api/providers/update`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ providerId: 'groq', enabled: false, apiKey: '' }),
    });
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({
      provider: { id: 'groq', enabled: false },
      credentialChanged: false,
    });
  });

  it('removes a registry provider from the dashboard endpoint', async () => {
    writeConfig({});
    writeProviders({
      schemaVersion: 1,
      providers: [{
        id: 'groq',
        templateId: 'groq',
        name: 'Groq',
        enabled: true,
        authRef: '',
        authType: 'api',
        api: { npm: '@ai-sdk/groq', url: 'https://api.groq.com/openai/v1' },
        addedAt: '2026-01-01T00:00:00.000Z',
      }],
    });
    const groqCatalog = createGatewayModelCatalog([{
      id: 'llama-test',
      name: 'Llama Test',
      isFree: false,
      brand: 'Llama',
      providerId: 'groq',
      providerLabel: 'Groq',
      sourceBackend: 'groq',
      modelFormat: 'openai',
      npm: '@ai-sdk/groq',
      apiKey: 'gsk_test',
    }]);
    const server = await startTestServer({
      catalog: groqCatalog,
      refreshCatalog: vi.fn(async () => createGatewayModelCatalog([])),
    });

    const beforeModels = await (await fetch(`${server.url}/dashboard/api/models`)).json() as any;
    expect(beforeModels.models).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'llama-test', providerId: 'groq' }),
    ]));

    const removed = await fetch(`${server.url}/dashboard/api/providers`, {
      method: 'DELETE',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ providerId: 'groq' }),
    });
    expect(removed.status).toBe(200);
    expect(await removed.json()).toMatchObject({
      provider: { id: 'groq', name: 'Groq' },
    });

    const providers = await (await fetch(`${server.url}/dashboard/api/providers`)).json() as any;
    expect(providers.providers.some((provider: any) => provider.id === 'groq')).toBe(false);

    const afterModels = await (await fetch(`${server.url}/dashboard/api/models`)).json() as any;
    expect(afterModels.models.some((model: any) => model.providerId === 'groq')).toBe(false);

    const gatewayModels = await (await fetch(`${server.url}/models`)).json() as any;
    expect(gatewayModels.models.some((model: any) => model.providerId === 'groq')).toBe(false);
  });

  it('rejects dashboard mutation requests without the dashboard client header', async () => {
    const requestRestart = vi.fn();
    const server = await startTestServer({ restartSupported: true, requestRestart });

    const restart = await fetch(`${server.url}/dashboard/api/restart`, { method: 'POST' });

    expect(restart.status).toBe(403);
    expect(requestRestart).not.toHaveBeenCalled();
  });

  it('rejects dashboard provider edits to restricted internal URLs', async () => {
    writeConfig({});
    writeProviders({
      schemaVersion: 1,
      providers: [{
        id: 'groq',
        templateId: 'groq',
        name: 'Groq',
        enabled: true,
        authRef: 'keyring:provider:groq',
        authType: 'api',
        api: { npm: '@ai-sdk/groq', url: 'https://api.groq.com/openai/v1' },
        addedAt: '2026-01-01T00:00:00.000Z',
      }],
    });
    const server = await startTestServer();

    const edited = await fetch(`${server.url}/dashboard/api/providers/update`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ providerId: 'groq', baseUrl: 'https://169.254.169.254/latest/meta-data' }),
    });

    expect(edited.status).toBe(400);
    expect(await edited.json()).toMatchObject({
      error: { message: expect.stringContaining('blocked internal') },
    });
  });

  it('captures privacy-safe activity rows for gateway requests', async () => {
    const upstream = await startUpstream({
      id: 'msg-test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'native ok with secret sk-should-not-leak' }],
      usage: { input_tokens: 5, output_tokens: 7 },
    });
    handles.push(upstream);
    const server = await startTestServer({
      backends: {
        zen: { baseUrl: upstream.baseUrl },
        go: { baseUrl: upstream.baseUrl },
      },
    });

    const response = await fetch(`${server.url}/anthropic/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-native',
        messages: [{ role: 'user', content: 'prompt secret sk-should-not-leak' }],
      }),
    });
    expect(response.status).toBe(200);

    const activity = await (await fetch(`${server.url}/dashboard/api/activity`)).json() as any;
    const raw = JSON.stringify(activity);
    expect(activity.events[0]).toMatchObject({
      tool: 'anthropic',
      model: 'claude-native',
      status: 'success',
      inputTokens: 5,
      outputTokens: 7,
    });
    expect(raw).not.toContain('prompt secret');
    expect(raw).not.toContain('native ok');
    expect(raw).not.toContain('sk-should-not-leak');
  });

  it('triggers the configured dashboard restart callback when supported', async () => {
    const requestRestart = vi.fn();
    const server = await startTestServer({ restartSupported: true, requestRestart });

    const restart = await fetch(`${server.url}/dashboard/api/restart`, { method: 'POST', headers: dashboardMutationHeaders });
    expect(restart.status).toBe(202);
    expect(await restart.json()).toMatchObject({ supported: true });
    expect(requestRestart).toHaveBeenCalledOnce();
  });

  it('writes Claude Desktop gateway config from the dashboard endpoint', async () => {
    const home = useTempRflectrHome();
    previousLocalAppData = process.env['LOCALAPPDATA'];
    process.env['LOCALAPPDATA'] = join(home, 'LocalAppData');
    const server = await startTestServer({ serverPassword: 'desktop-secret' });

    const response = await fetch(`${server.url}/dashboard/api/claude-desktop/connect`, {
      method: 'POST',
      headers: { ...dashboardJsonHeaders, authorization: 'Bearer desktop-secret' },
      body: JSON.stringify({ launch: false }),
    });

    if (process.platform !== 'win32' && process.platform !== 'darwin') {
      expect(response.status).toBe(400);
      return;
    }

    expect(response.status).toBe(200);
    const payload = await response.json() as any;
    expect(payload).toMatchObject({
      configured: true,
      baseUrl: `http://127.0.0.1:${server.port}/anthropic`,
      opened: false,
      needsRestart: false,
    });
    expect(existsSync(payload.configPath)).toBe(true);
    const config = JSON.parse(readFileSync(payload.configPath, 'utf8'));
    expect(config).toMatchObject({
      inferenceProvider: 'gateway',
      inferenceGatewayBaseUrl: `http://127.0.0.1:${server.port}/anthropic`,
      inferenceGatewayApiKey: 'desktop-secret',
      inferenceGatewayAuthScheme: 'bearer',
      coworkEgressAllowedHosts: ['*'],
    });
  });

  it('verifies and starts Claude Desktop native routing from dashboard endpoints', async () => {
    useTempRflectrHome();
    const upstream = await startUpstream({
      id: 'msg-native-dashboard',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'native dashboard ok' }],
      usage: { input_tokens: 2, output_tokens: 3 },
    });
    handles.push(upstream);
    const server = await startTestServer({
      backends: {
        zen: { baseUrl: upstream.baseUrl },
        go: { baseUrl: upstream.baseUrl },
      },
    });

    const verifyStart = await fetch(`${server.url}/dashboard/api/claude-desktop/native/verify/start`, {
      method: 'POST',
      headers: dashboardMutationHeaders,
    });
    expect(verifyStart.status).toBe(200);
    const verifyStartPayload = await verifyStart.json() as any;

    await proxyRequest(verifyStartPayload.proxyPort, 'http://api.anthropic.com/v1/messages', 'POST', JSON.stringify({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: 'verification prompt sk-should-not-leak' }],
    }));
    await proxyRequest(verifyStartPayload.proxyPort, 'http://claude.ai/v1/messages', 'POST', JSON.stringify({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: 'verification prompt' }],
    }));

    const verifyComplete = await fetch(`${server.url}/dashboard/api/claude-desktop/native/verify/complete`, {
      method: 'POST',
      headers: dashboardMutationHeaders,
    });
    expect(verifyComplete.status).toBe(200);
    expect(await verifyComplete.json()).toMatchObject({
      nativeEnabled: true,
      state: 'native_supported',
      verification: {
        supportState: 'supported',
        evidenceSource: 'live',
        enablementBlocked: false,
      },
    });

    const missingConsent = await fetch(`${server.url}/dashboard/api/claude-desktop/native/start`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ providerId: 'zen', modelId: 'claude-native' }),
    });
    expect(missingConsent.status).toBe(409);
    expect(await missingConsent.json()).toMatchObject({
      error: { category: 'consent_required' },
    });

    const started = await fetch(`${server.url}/dashboard/api/claude-desktop/native/start`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({
        providerId: 'zen',
        modelId: 'claude-native',
        consentDestinationProviderId: 'zen',
      }),
    });
    expect(started.status).toBe(200);
    const startedPayload = await started.json() as any;
    expect(startedPayload).toMatchObject({
      running: true,
      route: { providerId: 'zen', modelId: 'claude-native' },
    });

    const routed = await proxyRequest(startedPayload.proxyPort, 'http://api.anthropic.com/v1/messages', 'POST', JSON.stringify({
      model: 'claude-native',
      messages: [{ role: 'user', content: 'native route prompt sk-should-not-leak' }],
      stream: false,
    }));
    expect(routed.status).toBe(200);
    expect(JSON.parse(routed.body)).toMatchObject({ id: 'msg-native-dashboard' });
    expect(upstream.requests.at(-1)).toMatchObject({
      method: 'POST',
      url: '/v1/messages',
      authorization: 'Bearer real-opencode-key',
      body: expect.objectContaining({
        model: 'claude-native',
      }),
    });

    const settings = await (await fetch(`${server.url}/dashboard/api/settings`)).json() as any;
    expect(settings.claudeDesktop.nativeInterception).toMatchObject({
      running: true,
      port: startedPayload.proxyPort,
      selectedRoute: { providerId: 'zen', modelId: 'claude-native' },
    });

    const stopped = await fetch(`${server.url}/dashboard/api/claude-desktop/native/stop`, {
      method: 'POST',
      headers: dashboardMutationHeaders,
    });
    expect(stopped.status).toBe(200);
    expect(await stopped.json()).toMatchObject({ ok: true });

    const uninstalled = await fetch(`${server.url}/dashboard/api/claude-desktop/native/uninstall`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ confirm: true }),
    });
    expect(uninstalled.status).toBe(200);
    expect(await uninstalled.json()).toMatchObject({
      ok: true,
      legacyGatewayUntouched: true,
    });
  });

  it('streams Claude Desktop native routed SSE progressively through the dashboard-started proxy', async () => {
    useTempRflectrHome();
    saveClaudeNativeVerification(createObservedClaudeVerification({
      osName: platform(),
      osVersion: release(),
      hosts: [
        { host: 'api.anthropic.com', state: 'interceptable' },
        { host: 'claude.ai', state: 'interceptable' },
      ],
    }));
    const upstream = await startStreamingUpstream();
    handles.push(upstream);
    const server = await startTestServer({
      backends: {
        zen: { baseUrl: upstream.baseUrl },
        go: { baseUrl: upstream.baseUrl },
      },
    });

    const started = await fetch(`${server.url}/dashboard/api/claude-desktop/native/start`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({
        providerId: 'zen',
        modelId: 'claude-native',
        consentDestinationProviderId: 'zen',
      }),
    });
    expect(started.status).toBe(200);
    const startedPayload = await started.json() as any;

    const timings = await proxyRequestTimings(startedPayload.proxyPort, 'http://api.anthropic.com/v1/messages', 'POST', JSON.stringify({
      model: 'claude-native',
      messages: [{ role: 'user', content: 'stream please' }],
      stream: true,
    }));

    expect(timings.status).toBe(200);
    expect(timings.firstChunkMs).toBeLessThan(80);
    expect(timings.totalMs).toBeGreaterThanOrEqual(80);
    expect(timings.body).toContain('event: message_start');
    expect(timings.body).toContain('event: message_stop');
    expect(upstream.requests.at(-1)).toMatchObject({
      method: 'POST',
      url: '/v1/messages',
      body: expect.objectContaining({ stream: true }),
    });
  });

  it('rejects Claude Desktop native start when saved verification is stale', async () => {
    useTempRflectrHome();
    saveClaudeNativeVerification(createObservedClaudeVerification({
      osName: platform(),
      osVersion: release(),
      appVersion: '1.2.3',
      hosts: [
        { host: 'api.anthropic.com', state: 'interceptable' },
        { host: 'claude.ai', state: 'interceptable' },
      ],
    }));
    const server = await startTestServer();

    const response = await fetch(`${server.url}/dashboard/api/claude-desktop/native/start`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({
        providerId: 'zen',
        modelId: 'claude-native',
        consentDestinationProviderId: 'zen',
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { category: 'verification_required' },
      legacyGatewayAvailable: true,
    });
  });

  it('returns 401 for protected endpoints when password is missing or wrong', async () => {
    const server = await startTestServer({ serverPassword: 'secret' });

    const missing = await fetch(`${server.url}/openai/v1/models`);
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ error: { message: 'Unauthorized' } });

    const wrong = await fetch(`${server.url}/openai/v1/models`, {
      headers: { authorization: 'Bearer wrong' },
    });
    expect(wrong.status).toBe(401);

    const right = await fetch(`${server.url}/openai/v1/models`, {
      headers: { 'x-api-key': 'secret' },
    });
    expect(right.status).toBe(200);
  });

  it('forwards Anthropic-native messages to the backend v1/messages endpoint with the real API key', async () => {
    const upstream = await startUpstream({
      id: 'msg-test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'native ok' }],
    });
    handles.push(upstream);
    const server = await startTestServer({
      backends: {
        zen: { baseUrl: upstream.baseUrl },
        go: { baseUrl: upstream.baseUrl },
      },
    });

    const response = await fetch(`${server.url}/anthropic/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-native', messages: [{ role: 'user', content: 'hi' }] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'msg-test' });
    expect(upstream.requests).toHaveLength(1);
    expect(upstream.requests[0]).toMatchObject({
      method: 'POST',
      url: '/v1/messages',
      authorization: 'Bearer real-opencode-key',
      body: { model: 'claude-native', messages: [{ role: 'user', content: 'hi' }] },
    });
  });

  // OpenAI-format Anthropic translation now routes through the Vercel AI SDK adapter
  // (createLanguageModel + streamAnthropicResponse/generateAnthropicResponse), which
  // requires an SDK `npm` on the model. Translation correctness is covered by
  // sdk-adapter.test.ts (and was validated against live providers). Here we only
  // assert the router's guard: an OpenAI-format model with no SDK provider is rejected.
  it('rejects Anthropic messages for OpenAI-format models without an SDK provider', async () => {
    const server = await startTestServer();

    const response = await fetch(`${server.url}/anthropic/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai-format',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { message: expect.stringContaining('No SDK provider') },
    });
  });

  it('forwards OpenAI chat completions for OpenAI-format models unchanged', async () => {
    const upstream = await startUpstream({
      id: 'chatcmpl-test',
      choices: [{ message: { content: 'openai ok' }, finish_reason: 'stop' }],
    });
    handles.push(upstream);
    const server = await startTestServer({
      backends: {
        zen: { baseUrl: upstream.baseUrl },
        go: { baseUrl: upstream.baseUrl },
      },
    });

    const body = { model: 'openai-format', messages: [{ role: 'user', content: 'hi' }], temperature: 0.2 };
    const response = await fetch(`${server.url}/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'chatcmpl-test' });
    expect(upstream.requests[0]).toMatchObject({
      method: 'POST',
      url: '/v1/chat/completions',
      authorization: 'Bearer real-opencode-key',
      body,
    });
  });

  it('caches SDK language models per provider-qualified route, not just raw model id', async () => {
    const duplicateCatalog = createGatewayModelCatalog([
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        isFree: false,
        brand: 'OpenAI',
        providerId: 'openai',
        providerLabel: 'OpenAI',
        sourceBackend: 'openai',
        modelFormat: 'openai',
        npm: '@ai-sdk/openai',
        apiKey: 'openai-key',
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o via OpenRouter',
        isFree: false,
        brand: 'OpenAI',
        providerId: 'openrouter',
        providerLabel: 'OpenRouter',
        sourceBackend: 'openrouter',
        modelFormat: 'openai',
        npm: '@openrouter/ai-sdk-provider',
        apiKey: 'openrouter-key',
      },
    ]);
    const server = await startTestServer({ catalog: duplicateCatalog });

    for (const modelId of ['anthropic-openai__gpt-4o', 'anthropic-openrouter__gpt-4o']) {
      const response = await fetch(`${server.url}/anthropic/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'hi' }] }),
      });
      expect(response.status).toBe(200);
    }

    expect(vi.mocked(createLanguageModel)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createLanguageModel).mock.calls.map(call => (call[0] as any).providerId)).toEqual([
      'openai',
      'openrouter',
    ]);
  });

  it('exposes SDK-only registry models through OpenAI chat completions', async () => {
    const sdkOnlyCatalog = createGatewayModelCatalog([{
      id: 'gpt-5',
      name: 'GPT-5',
      isFree: false,
      brand: 'OpenAI',
      providerId: 'openai',
      providerLabel: 'OpenAI',
      sourceBackend: 'openai',
      modelFormat: 'openai',
      npm: '@ai-sdk/openai',
      apiBaseUrl: 'https://api.openai.com/v1',
      apiKey: 'openai-key',
    }]);
    const server = await startTestServer({ catalog: sdkOnlyCatalog });

    const models = await fetch(`${server.url}/openai/v1/models`);
    expect(models.status).toBe(200);
    expect(await models.json()).toEqual({
      object: 'list',
      data: [
        expect.objectContaining({ id: 'gpt-5', owned_by: 'openai' }),
      ],
    });

    const response = await fetch(`${server.url}/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-5', messages: [{ role: 'user', content: 'hi' }] }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'chatcmpl-test', choices: [{ message: { content: 'openai sdk ok' } }] });
  });

  it('translates OpenAI requests for Anthropic-native models', async () => {
    const server = await startTestServer();

    const response = await fetch(`${server.url}/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-native', messages: [] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'chatcmpl-test', choices: [{ message: { content: 'openai sdk ok' } }] });
  });

  // F1 regression: GET /models must not leak apiKey or headers fields.
  it('F1: GET /models strips apiKey and headers from the response', async () => {
    const portkeyCatalog = createGatewayModelCatalog([
      {
        id: 'portkey/my-config',
        name: 'Portkey: My Config',
        isFree: false,
        brand: 'Portkey',
        providerId: 'portkey',
        providerLabel: 'Portkey',
        sourceBackend: 'portkey',
        modelFormat: 'openai',
        npm: '@ai-sdk/openai-compatible',
        apiKey: 'pk-super-secret-key',
        headers: { 'x-portkey-config': 'my-config', 'x-portkey-api-key': 'pk-super-secret-key' },
      },
    ]);
    const server = await startTestServer({ catalog: portkeyCatalog });

    const response = await fetch(`${server.url}/models`);
    expect(response.status).toBe(200);

    const body = await response.json() as { models: Record<string, unknown>[] };
    expect(body.models).toHaveLength(1);

    const m = body.models[0]!;
    // apiKey must not appear
    expect(m).not.toHaveProperty('apiKey');
    // headers object must not appear
    expect(m).not.toHaveProperty('headers');
    // The raw JSON must not contain any x-portkey-api-key substring
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('x-portkey-api-key');
    expect(raw).not.toContain('pk-super-secret-key');
  });

  // F2 regression: two Portkey models same model/npm/baseURL but different headers
  // must call createLanguageModel twice — not reuse the first cached instance.
  it('F2: headers are included in the SDK language-model cache key', async () => {
    const portkeyCatalog = createGatewayModelCatalog([
      {
        id: 'anthropic-portkey__portkey-cfg-a',
        name: 'Portkey Config A',
        isFree: false,
        brand: 'Portkey',
        providerId: 'portkey',
        providerLabel: 'Portkey',
        sourceBackend: 'portkey',
        modelFormat: 'openai',
        npm: '@ai-sdk/openai-compatible',
        apiBaseUrl: 'https://api.portkey.ai/v1',
        apiKey: 'pk-test-key',
        headers: { 'x-portkey-config': 'config-a' },
      },
      {
        id: 'anthropic-portkey__portkey-cfg-b',
        name: 'Portkey Config B',
        isFree: false,
        brand: 'Portkey',
        providerId: 'portkey',
        providerLabel: 'Portkey',
        sourceBackend: 'portkey',
        modelFormat: 'openai',
        npm: '@ai-sdk/openai-compatible',
        apiBaseUrl: 'https://api.portkey.ai/v1',
        apiKey: 'pk-test-key',
        headers: { 'x-portkey-config': 'config-b' },
      },
    ]);
    const server = await startTestServer({ catalog: portkeyCatalog });

    for (const modelId of ['anthropic-portkey__portkey-cfg-a', 'anthropic-portkey__portkey-cfg-b']) {
      const response = await fetch(`${server.url}/anthropic/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'hi' }] }),
      });
      expect(response.status).toBe(200);
    }

    // Both models share the same npm/baseURL but differ only in headers — they must
    // produce two distinct createLanguageModel calls, not reuse the first cache entry.
    expect(vi.mocked(createLanguageModel)).toHaveBeenCalledTimes(2);
    const headerArgs = vi.mocked(createLanguageModel).mock.calls.map(
      call => (call[0] as { headers?: Record<string, string> }).headers,
    );
    expect(headerArgs[0]).toEqual({ 'x-portkey-config': 'config-a' });
    expect(headerArgs[1]).toEqual({ 'x-portkey-config': 'config-b' });
  });

  it('rejects unsupported model formats', async () => {
    const server = await startTestServer();

    const response = await fetch(`${server.url}/anthropic/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bad-format', messages: [] }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { message: expect.stringContaining('Unsupported model format') },
    });
  });
});
