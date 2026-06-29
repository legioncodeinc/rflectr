import { describe, expect, it, vi, beforeEach } from 'vitest';
import { refreshProviderModels } from '../src/registry/refresh-models.js';
import type { ProviderRegistry } from '../src/registry/types.js';

vi.mock('../src/registry/fetch-template-models.js', () => ({
  fetchTemplateModels: vi.fn(),
}));
vi.mock('../src/registry/custom-endpoint.js', () => ({
  fetchAnthropicModels: vi.fn(),
}));
vi.mock('../src/registry/io.js', () => ({
  loadRegistry: vi.fn(() => ({ version: 1, providers: [] })),
  saveRegistry: vi.fn(),
}));
vi.mock('../src/registry/portkey/client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/registry/portkey/client.js')>();
  return {
    ...actual,
    listModels: vi.fn(),
    listConfigs: vi.fn(),
  };
});
// Stub pricing so no real filesystem reads are triggered.
vi.mock('../src/registry/pricing.js', () => ({
  buildPricingIndex: vi.fn(() => ({})),
  enrichModelsWithPricing: vi.fn((models: unknown[]) => models),
  enrichPricingAsync: vi.fn(),
  loadPricingCache: vi.fn(() => ({})),
  pricingPlatformForProvider: vi.fn(() => undefined),
}));

import { fetchTemplateModels } from '../src/registry/fetch-template-models.js';
import { saveRegistry } from '../src/registry/io.js';
import { listModels, listConfigs } from '../src/registry/portkey/client.js';

describe('refreshProviderModels', () => {
  beforeEach(() => {
    vi.mocked(fetchTemplateModels).mockReset();
    vi.mocked(saveRegistry).mockClear();
  });

  it('rejects restricted provider API URLs before refreshing models', async () => {
    const registry: ProviderRegistry = {
      version: 1,
      providers: [{
        id: 'bad',
        templateId: 'custom-openai',
        name: 'Bad',
        enabled: true,
        authRef: 'keyring:provider:bad',
        authType: 'api',
        api: { npm: '@ai-sdk/openai-compatible', url: 'https://169.254.169.254/v1' },
        addedAt: '2026-06-17T00:00:00.000Z',
      }],
    };

    const result = await refreshProviderModels('bad', 'sk-real-key', registry);

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/restricted|private|blocked/i);
    expect(fetchTemplateModels).not.toHaveBeenCalled();
    expect(saveRegistry).not.toHaveBeenCalled();
  });

  it('does not report an imported snapshot as a model-count change on first live refresh', async () => {
    const registry: ProviderRegistry = {
      version: 1,
      providers: [{
        id: 'groq',
        templateId: 'groq',
        name: 'Groq',
        enabled: true,
        authRef: 'keyring:provider:groq',
        authType: 'api',
        api: { npm: '@ai-sdk/groq', url: 'https://api.groq.com/openai/v1' },
        addedAt: '2026-06-18T00:00:00.000Z',
        modelsCache: {
          fetchedAt: '2026-06-18T00:00:00.000Z',
          models: [{
            id: 'imported-model',
            name: 'Imported model',
            upstreamModelId: 'imported-model',
            modelFormat: 'openai',
          }],
        },
      }],
    };
    vi.mocked(fetchTemplateModels).mockResolvedValue({
      baseUrl: 'https://api.groq.com/openai/v1',
      models: [{
        id: 'live-a',
        name: 'Live A',
        upstreamModelId: 'live-a',
        modelFormat: 'openai',
      }, {
        id: 'live-b',
        name: 'Live B',
        upstreamModelId: 'live-b',
        modelFormat: 'openai',
      }],
    });

    const first = await refreshProviderModels('groq', 'gsk-real-key', registry);
    const second = await refreshProviderModels('groq', 'gsk-real-key', registry);

    expect(first).toMatchObject({ ok: true, modelCount: 2 });
    expect(first.previousModelCount).toBeUndefined();
    expect(second).toMatchObject({ ok: true, modelCount: 2, previousModelCount: 2 });
  });
});

// ---------------------------------------------------------------------------
// Portkey refresh tests (F4, F6, F7)
// ---------------------------------------------------------------------------

/** Minimal Portkey provider fixture. */
function makePortkeyProvider(overrides: Record<string, unknown> = {}): ProviderRegistry {
  return {
    version: 1,
    providers: [{
      id: 'portkey',
      templateId: 'portkey',
      name: 'Portkey',
      enabled: true,
      authRef: 'keyring:provider:portkey',
      authType: 'api',
      api: { npm: '@ai-sdk/openai-compatible', url: 'https://api.portkey.ai/v1' },
      addedAt: '2026-06-28T00:00:00.000Z',
      ...overrides,
    }],
  } as ProviderRegistry;
}

describe('refreshProviderModels — Portkey F4: individual-mode 5xx returns failure, cache not silently replaced', () => {
  beforeEach(() => {
    vi.mocked(listModels).mockReset();
    vi.mocked(listConfigs).mockReset();
    vi.mocked(saveRegistry).mockClear();
  });

  it('returns ok:false when listModels returns a 500 error (not ok:true with empty cache)', async () => {
    const cachedModels = [
      {
        id: '@openai-prod/gpt-4o',
        name: 'GPT-4o',
        upstreamModelId: '@openai-prod/gpt-4o',
        modelFormat: 'openai' as const,
        headers: { 'x-portkey-provider': 'openai-prod' },
        portkey: { providerSlug: 'openai-prod' },
      },
    ];
    const registry = makePortkeyProvider({
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: cachedModels,
      },
    });

    // listConfigs probe succeeds (key accepted)
    vi.mocked(listConfigs).mockResolvedValue({ ok: true, data: [] });
    // listModels returns a 500 — network/server error
    vi.mocked(listModels).mockResolvedValue({
      ok: false,
      error: 'Portkey returned HTTP 500.',
      status: 500,
    });

    const result = await refreshProviderModels('portkey', 'pk-test-key', registry);

    // Must surface the failure, not pretend success.
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/500|HTTP|error/i);
    // Cache must not be persisted as a successful refresh.
    expect(saveRegistry).not.toHaveBeenCalled();
  });

  it('returns skipped:true (cache kept) when listModels returns 401 auth rejection', async () => {
    const cachedModels = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        upstreamModelId: 'gpt-4o',
        modelFormat: 'openai' as const,
        portkey: { providerSlug: 'openai' },
      },
    ];
    const registry = makePortkeyProvider({
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: cachedModels,
      },
    });

    // listConfigs probe succeeds (auth accepted for configs)
    vi.mocked(listConfigs).mockResolvedValue({ ok: true, data: [] });
    // Individual-mode listModels rejects with 401
    vi.mocked(listModels).mockResolvedValue({
      ok: false,
      error: 'Portkey master key was rejected.',
      status: 401,
    });

    const result = await refreshProviderModels('portkey', 'pk-old-key', registry);

    // Auth rejection keeps the cache; must report ok with skipped.
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    // saveRegistry is still called because the result is treated as kept-cache success path.
    // The important assertion is that ok is true and reason mentions the key was rejected.
    expect(result.reason).toMatch(/rejected|key/i);
  });
});

describe('refreshProviderModels — Portkey F6: two VKs with same model id produce distinct catalog ids', () => {
  beforeEach(() => {
    vi.mocked(listModels).mockReset();
    vi.mocked(listConfigs).mockReset();
    vi.mocked(saveRegistry).mockClear();
  });

  it('prefixes each model with its VK slug so same upstream id from two VKs gets two distinct entries', async () => {
    // Cache has both VKs already populated with the VK-prefixed id scheme.
    const cachedModels = [
      {
        id: 'openai-key/gpt-4o',
        name: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        modelFormat: 'openai' as const,
        npm: '@ai-sdk/openai-compatible',
        apiUrl: 'https://api.portkey.ai/v1',
        headers: { 'x-portkey-virtual-key': 'openai-key' },
        portkey: { virtualKeySlug: 'openai-key' },
      },
      {
        id: 'anthropic-key/gpt-4o',
        name: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        modelFormat: 'openai' as const,
        npm: '@ai-sdk/openai-compatible',
        apiUrl: 'https://api.portkey.ai/v1',
        headers: { 'x-portkey-virtual-key': 'anthropic-key' },
        portkey: { virtualKeySlug: 'anthropic-key' },
      },
    ];

    const registry = makePortkeyProvider({
      refreshedAt: '2026-06-28T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: cachedModels,
      },
    });

    // Key accepted
    vi.mocked(listConfigs).mockResolvedValue({ ok: true, data: [] });
    // Both VK calls return gpt-4o
    vi.mocked(listModels)
      .mockResolvedValueOnce({ ok: true, data: [{ id: 'gpt-4o' }] })
      .mockResolvedValueOnce({ ok: true, data: [{ id: 'gpt-4o' }] });

    const result = await refreshProviderModels('portkey', 'pk-test-key', registry);

    expect(result.ok).toBe(true);
    expect(saveRegistry).toHaveBeenCalled();

    // The updated registry must still carry two distinct model entries.
    const savedCall = vi.mocked(saveRegistry).mock.calls[0]![0] as ProviderRegistry;
    const savedModels = savedCall.providers[0]!.modelsCache!.models;
    expect(savedModels).toHaveLength(2);

    const ids = savedModels.map(m => m.id);
    expect(ids).toContain('openai-key/gpt-4o');
    expect(ids).toContain('anthropic-key/gpt-4o');
    expect(new Set(ids).size).toBe(2);
  });
});

describe('refreshProviderModels — Portkey F7: individual-mode refresh keeps only originally-cached ids', () => {
  beforeEach(() => {
    vi.mocked(listModels).mockReset();
    vi.mocked(listConfigs).mockReset();
    vi.mocked(saveRegistry).mockClear();
  });

  it('does not auto-add new models discovered in the live catalog beyond the user-selected set', async () => {
    // User originally selected two models out of the full Portkey catalog.
    const cachedModels = [
      {
        id: '@openai-prod/gpt-4o',
        name: 'GPT-4o',
        upstreamModelId: '@openai-prod/gpt-4o',
        modelFormat: 'openai' as const,
        headers: { 'x-portkey-provider': 'openai-prod' },
        portkey: { providerSlug: 'openai-prod' },
      },
      {
        id: '@anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        upstreamModelId: '@anthropic/claude-3-haiku',
        modelFormat: 'openai' as const,
        headers: { 'x-portkey-provider': 'anthropic' },
        portkey: { providerSlug: 'anthropic' },
      },
    ];

    const registry = makePortkeyProvider({
      refreshedAt: '2026-06-28T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: cachedModels,
      },
    });

    // Key accepted
    vi.mocked(listConfigs).mockResolvedValue({ ok: true, data: [] });
    // Live catalog now has 5 models — 2 existing + 3 new additions.
    vi.mocked(listModels).mockResolvedValue({
      ok: true,
      data: [
        { id: '@openai-prod/gpt-4o' },
        { id: '@anthropic/claude-3-haiku' },
        { id: '@openai-prod/gpt-4o-mini' },      // new
        { id: '@openai-prod/o1' },                // new
        { id: '@anthropic/claude-3-5-sonnet' },   // new
      ],
    });

    const result = await refreshProviderModels('portkey', 'pk-test-key', registry);

    expect(result.ok).toBe(true);
    expect(saveRegistry).toHaveBeenCalled();

    const savedCall = vi.mocked(saveRegistry).mock.calls[0]![0] as ProviderRegistry;
    const savedModels = savedCall.providers[0]!.modelsCache!.models;

    // Must keep exactly the 2 originally-selected models; never auto-add the 3 new ones.
    expect(savedModels).toHaveLength(2);
    const ids = new Set(savedModels.map(m => m.id));
    expect(ids.has('@openai-prod/gpt-4o')).toBe(true);
    expect(ids.has('@anthropic/claude-3-haiku')).toBe(true);
    expect(ids.has('@openai-prod/gpt-4o-mini')).toBe(false);
    expect(ids.has('@openai-prod/o1')).toBe(false);
    expect(ids.has('@anthropic/claude-3-5-sonnet')).toBe(false);
  });

  it('drops a cached model when the live catalog no longer lists it', async () => {
    const cachedModels = [
      {
        id: '@openai-prod/gpt-4o',
        name: 'GPT-4o',
        upstreamModelId: '@openai-prod/gpt-4o',
        modelFormat: 'openai' as const,
        portkey: { providerSlug: 'openai-prod' },
      },
      {
        id: '@openai-prod/deprecated-model',
        name: 'Deprecated',
        upstreamModelId: '@openai-prod/deprecated-model',
        modelFormat: 'openai' as const,
        portkey: { providerSlug: 'openai-prod' },
      },
    ];

    const registry = makePortkeyProvider({
      refreshedAt: '2026-06-28T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: cachedModels,
      },
    });

    vi.mocked(listConfigs).mockResolvedValue({ ok: true, data: [] });
    // Live catalog omits deprecated-model
    vi.mocked(listModels).mockResolvedValue({
      ok: true,
      data: [{ id: '@openai-prod/gpt-4o' }],
    });

    const result = await refreshProviderModels('portkey', 'pk-test-key', registry);
    expect(result.ok).toBe(true);

    const savedCall = vi.mocked(saveRegistry).mock.calls[0]![0] as ProviderRegistry;
    const savedModels = savedCall.providers[0]!.modelsCache!.models;

    expect(savedModels).toHaveLength(1);
    expect(savedModels[0]!.id).toBe('@openai-prod/gpt-4o');
  });
});
