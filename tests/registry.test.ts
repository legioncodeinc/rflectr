import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  emptyRegistry,
  isValidProviderId,
  loadRegistry,
  materializeRegistry,
  saveRegistry,
  slugifyProviderId,
} from '../src/registry/index.js';

describe('provider id validation', () => {
  it('accepts stable slugs', () => {
    expect(isValidProviderId('groq')).toBe(true);
    expect(isValidProviderId('openai')).toBe(true);
    expect(isValidProviderId('custom-together-ai')).toBe(true);
    expect(isValidProviderId('go')).toBe(true);
  });

  it('rejects invalid ids', () => {
    expect(isValidProviderId('OpenAI')).toBe(false);
    expect(isValidProviderId('has space')).toBe(false);
    expect(isValidProviderId('bad:id')).toBe(false);
    expect(isValidProviderId('-leading')).toBe(false);
    expect(isValidProviderId('trailing-')).toBe(false);
  });

  it('slugifies display names', () => {
    expect(slugifyProviderId('Together AI')).toBe('together-ai');
    expect(slugifyProviderId('My vLLM Server')).toBe('my-vllm-server');
  });
});

describe('registry io', () => {
  let home: string;
  const prev = process.env.RFLECTR_HOME;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'rflectr-registry-'));
    process.env.RFLECTR_HOME = home;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.RFLECTR_HOME;
    else process.env.RFLECTR_HOME = prev;
    rmSync(home, { recursive: true, force: true });
  });

  it('round-trips registry json', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'groq',
      templateId: 'groq',
      name: 'Groq',
      enabled: true,
      authRef: 'keyring:provider:groq',
      api: { npm: '@ai-sdk/groq' },
      addedAt: '2026-06-09T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-09T00:00:00.000Z',
        models: [{
          id: 'llama-3.3-70b',
          name: 'Llama 3.3 70B',
          upstreamModelId: 'llama-3.3-70b',
          modelFormat: 'openai',
          npm: '@ai-sdk/groq',
        }],
      },
    });
    saveRegistry(registry);
    const loaded = loadRegistry();
    expect(loaded.providers).toHaveLength(1);
    expect(loaded.providers[0]?.id).toBe('groq');
    expect(loaded.providers[0]?.modelsCache?.models[0]?.npm).toBe('@ai-sdk/groq');
  });

  it('writes providers.json with restrictive permissions', () => {
    saveRegistry(emptyRegistry());
    const path = join(home, 'providers.json');
    expect(existsSync(path)).toBe(true);
    const mode = statSync(path).mode & 0o777;
    if (process.platform !== 'win32') {
      expect(mode).toBe(0o600);
    }
  });

  it('skips invalid provider entries on load', () => {
    const path = join(home, 'providers.json');
    const raw = {
      schemaVersion: 1,
      providers: [
        { id: 'BAD ID', templateId: 'x', name: 'X', enabled: true, authRef: 'k', api: {}, addedAt: 't' },
        {
          id: 'groq',
          templateId: 'groq',
          name: 'Groq',
          enabled: true,
          authRef: 'keyring:provider:groq',
          api: { npm: '@ai-sdk/groq' },
          addedAt: '2026-06-09T00:00:00.000Z',
        },
      ],
    };
    mkdirSync(home, { recursive: true });
    writeFileSync(path, JSON.stringify(raw));
    const loaded = loadRegistry(path);
    expect(loaded.providers).toHaveLength(1);
    expect(loaded.providers[0]?.id).toBe('groq');
  });

  it('removes legacy OpenCode cloud duplicates on load and persists the cleanup', () => {
    const path = join(home, 'providers.json');
    const base = {
      enabled: true,
      authRef: 'keyring:global:opencode',
      api: {},
      addedAt: '2026-06-18T00:00:00.000Z',
    };
    mkdirSync(home, { recursive: true });
    writeFileSync(path, JSON.stringify({
      schemaVersion: 1,
      providers: [
        { ...base, id: 'zen', templateId: 'zen', name: 'OpenCode Zen' },
        { ...base, id: 'opencode', templateId: 'opencode', name: 'OpenCode Zen' },
        { ...base, id: 'go', templateId: 'go', name: 'OpenCode Go' },
        { ...base, id: 'opencode-go', templateId: 'opencode-go', name: 'OpenCode Go' },
      ],
    }));

    const loaded = loadRegistry(path);

    expect(loaded.providers.map(provider => provider.id)).toEqual(['zen', 'go']);
    expect(JSON.parse(readFileSync(path, 'utf8')).providers.map((provider: { id: string }) => provider.id))
      .toEqual(['zen', 'go']);
  });

  it('renames a legacy OpenCode cloud provider when no canonical entry exists', () => {
    const path = join(home, 'providers.json');
    mkdirSync(home, { recursive: true });
    writeFileSync(path, JSON.stringify({
      schemaVersion: 1,
      providers: [{
        id: 'opencode',
        templateId: 'opencode',
        name: 'OpenCode',
        enabled: true,
        authRef: 'keyring:provider:opencode',
        api: { npm: '@ai-sdk/openai-compatible', url: 'https://opencode.ai/zen/v1' },
        addedAt: '2026-06-18T00:00:00.000Z',
      }],
    }));

    const loaded = loadRegistry(path);

    expect(loaded.providers[0]).toMatchObject({
      id: 'zen',
      templateId: 'zen',
      name: 'OpenCode Zen',
      authRef: 'keyring:provider:opencode',
      api: {},
    });
  });
});

describe('materializeRegistry', () => {
  it('materializes enabled providers with credentials and models', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'openai',
      templateId: 'openai',
      name: 'OpenAI',
      enabled: true,
      authRef: 'keyring:provider:openai',
      authType: 'oauth',
      api: { npm: '@ai-sdk/openai' },
      addedAt: '2026-06-09T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-09T00:00:00.000Z',
        models: [{
          id: 'gpt-5.5-fast',
          name: 'GPT-5.5 Fast',
          upstreamModelId: 'gpt-5.5',
          modelFormat: 'openai',
          npm: '@ai-sdk/openai',
        }],
      },
    });
    const locals = materializeRegistry(registry, () => 'sk-test');
    expect(locals).toHaveLength(1);
    expect(locals[0]?.models[0]?.upstreamModelId).toBe('gpt-5.5');
    expect(locals[0]?.apiKey).toBe('sk-test');
    expect(locals[0]?.authType).toBe('oauth');
  });

  it('returns empty when credential missing', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'groq',
      templateId: 'groq',
      name: 'Groq',
      enabled: true,
      authRef: 'keyring:provider:groq',
      api: { npm: '@ai-sdk/groq' },
      addedAt: '2026-06-09T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-09T00:00:00.000Z',
        models: [{
          id: 'llama',
          name: 'Llama',
          upstreamModelId: 'llama',
          modelFormat: 'openai',
          npm: '@ai-sdk/groq',
        }],
      },
    });
    expect(materializeRegistry(registry, () => null)).toHaveLength(0);
  });

  it('honors per-model npm and apiUrl overrides', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'custom-proxy',
      templateId: 'custom-openai',
      name: 'Custom Proxy',
      enabled: true,
      authRef: 'keyring:provider:custom-proxy',
      api: { npm: '@ai-sdk/openai-compatible', url: 'https://default.example/v1' },
      addedAt: '2026-06-09T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-09T00:00:00.000Z',
        models: [{
          id: 'model-a',
          name: 'Model A',
          upstreamModelId: 'model-a',
          modelFormat: 'openai',
          npm: '@ai-sdk/openai-compatible',
          apiUrl: 'https://override.example/v1',
        }],
      },
    });
    const locals = materializeRegistry(registry, () => 'key');
    expect(locals[0]?.models[0]?.apiBaseUrl).toBe('https://override.example/v1');
    expect(locals[0]?.models[0]?.completionsUrl).toBe('https://override.example/v1/chat/completions');
  });

  // ── AC-4: header merge + Portkey secret injection ─────────────────────────

  it('merges provider headersTemplate with per-model headers onto LocalProviderModel (model wins)', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'portkey',
      templateId: 'portkey',
      name: 'Portkey',
      enabled: true,
      authRef: 'keyring:provider:portkey',
      api: {
        npm: '@ai-sdk/openai-compatible',
        url: 'https://api.portkey.ai/v1',
        headersTemplate: { 'x-portkey-config': 'default-config', 'x-portkey-provider': 'openai' },
      },
      addedAt: '2026-06-28T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: [
          {
            id: 'gpt-4o',
            name: 'GPT-4o via Portkey',
            upstreamModelId: 'gpt-4o',
            modelFormat: 'openai' as const,
            npm: '@ai-sdk/openai-compatible',
            apiUrl: 'https://api.portkey.ai/v1',
            // per-model header overrides the provider-level x-portkey-config
            headers: { 'x-portkey-config': 'per-model-config' },
          },
        ],
      },
    });

    const locals = materializeRegistry(registry, () => 'pk-masterkey');
    const model = locals[0]?.models[0];

    // model-level x-portkey-config wins over headersTemplate
    expect(model?.headers?.['x-portkey-config']).toBe('per-model-config');
    // provider-level x-portkey-provider is present (not overridden by model)
    expect(model?.headers?.['x-portkey-provider']).toBe('openai');
  });

  it('injects x-portkey-api-key from credential into Portkey model headers (secret invariant)', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'portkey',
      templateId: 'portkey',
      name: 'Portkey',
      enabled: true,
      authRef: 'keyring:provider:portkey',
      api: {
        npm: '@ai-sdk/openai-compatible',
        url: 'https://api.portkey.ai/v1',
        headersTemplate: { 'x-portkey-config': 'my-config' },
      },
      addedAt: '2026-06-28T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: [{
          id: 'claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet via Portkey',
          upstreamModelId: 'claude-3-5-sonnet-20241022',
          modelFormat: 'openai' as const,
          npm: '@ai-sdk/openai-compatible',
          apiUrl: 'https://api.portkey.ai/v1',
        }],
      },
    });

    const masterKey = 'pk-secret-key-do-not-persist';
    const locals = materializeRegistry(registry, () => masterKey);
    const model = locals[0]?.models[0];

    // Secret is present at runtime
    expect(model?.headers?.['x-portkey-api-key']).toBe(masterKey);
    // Non-secret routing header also present
    expect(model?.headers?.['x-portkey-config']).toBe('my-config');
  });

  it('does NOT inject x-portkey-api-key for a non-Portkey provider', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'groq',
      templateId: 'groq',
      name: 'Groq',
      enabled: true,
      authRef: 'keyring:provider:groq',
      api: { npm: '@ai-sdk/groq' },
      addedAt: '2026-06-28T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: [{
          id: 'llama-3.3-70b',
          name: 'Llama 3.3 70B',
          upstreamModelId: 'llama-3.3-70b',
          modelFormat: 'openai' as const,
          npm: '@ai-sdk/groq',
        }],
      },
    });

    const locals = materializeRegistry(registry, () => 'gsk-groqkey');
    const model = locals[0]?.models[0];

    // Must not appear on a non-Portkey model
    expect(model?.headers?.['x-portkey-api-key']).toBeUndefined();
    // headers should be undefined entirely (no headersTemplate, no per-model headers)
    expect(model?.headers).toBeUndefined();
  });
});

describe('registry headersTemplate + headers round-trip (secret-never-on-disk)', () => {
  let home: string;
  const prev = process.env.RFLECTR_HOME;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'rflectr-headers-'));
    process.env.RFLECTR_HOME = home;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.RFLECTR_HOME;
    else process.env.RFLECTR_HOME = prev;
    rmSync(home, { recursive: true, force: true });
  });

  it('round-trips headersTemplate and per-model headers through save+load and never persists x-portkey-api-key', () => {
    const registry = emptyRegistry();
    registry.providers.push({
      id: 'portkey',
      templateId: 'portkey',
      name: 'Portkey',
      enabled: true,
      authRef: 'keyring:provider:portkey',
      api: {
        npm: '@ai-sdk/openai-compatible',
        url: 'https://api.portkey.ai/v1',
        headersTemplate: { 'x-portkey-config': 'saved-config' },
      },
      addedAt: '2026-06-28T00:00:00.000Z',
      modelsCache: {
        fetchedAt: '2026-06-28T00:00:00.000Z',
        models: [{
          id: 'gpt-4o',
          name: 'GPT-4o via Portkey',
          upstreamModelId: 'gpt-4o',
          modelFormat: 'openai' as const,
          npm: '@ai-sdk/openai-compatible',
          apiUrl: 'https://api.portkey.ai/v1',
          headers: { 'x-portkey-virtual-key': 'my-vk-slug' },
          portkey: { virtualKeySlug: 'my-vk-slug' },
        }],
      },
    });

    saveRegistry(registry);
    const loaded = loadRegistry();
    const path = join(home, 'providers.json');

    // Non-secret fields survived the round-trip
    expect(loaded.providers[0]?.api.headersTemplate).toEqual({ 'x-portkey-config': 'saved-config' });
    expect(loaded.providers[0]?.modelsCache?.models[0]?.headers).toEqual({ 'x-portkey-virtual-key': 'my-vk-slug' });
    expect(loaded.providers[0]?.modelsCache?.models[0]?.portkey).toEqual({ virtualKeySlug: 'my-vk-slug' });

    // The secret must never appear on disk
    const raw = readFileSync(path, 'utf8');
    expect(raw).not.toContain('x-portkey-api-key');

    // Materialization injects the secret at runtime — it is NOT from disk
    const masterKey = 'pk-live-secret-never-stored';
    const locals = materializeRegistry(loaded, () => masterKey);
    const model = locals[0]?.models[0];

    // Secret is present after materialization (from resolved credential, not from disk)
    expect(model?.headers?.['x-portkey-api-key']).toBe(masterKey);
    // Non-secret routing headers present after merge
    expect(model?.headers?.['x-portkey-config']).toBe('saved-config');
    expect(model?.headers?.['x-portkey-virtual-key']).toBe('my-vk-slug');

    // One more check: the raw JSON on disk still does not contain the secret
    expect(readFileSync(path, 'utf8')).not.toContain(masterKey);
  });
});
