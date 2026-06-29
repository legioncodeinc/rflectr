// tests/materialize.test.ts
//
// Security regression tests for the Portkey secret-injection invariant in
// src/registry/materialize.ts (PRD-013).
//
// Invariants under test:
//  1. x-portkey-api-key is injected into the runtime LocalProviderModel.headers
//     for a Portkey provider, sourced from the resolved keyring credential.
//  2. It is NOT injected for non-Portkey providers (so the secret can never leak
//     into an unrelated provider's headers).
//  3. The injection mutates only the runtime object — the on-disk CachedModel
//     (registry.providers[].modelsCache.models[].headers) is never mutated, so
//     the secret is never written back to providers.json.

import { describe, it, expect } from 'vitest';
import { materializeRegistry } from '../src/registry/materialize.js';
import type { ProviderRegistry, RegistryProvider } from '../src/registry/types.js';

const PORTKEY_NPM = '@ai-sdk/openai-compatible';
const PORTKEY_URL = 'https://api.portkey.ai/v1';
const MASTER_KEY = 'pk-master-secret-do-not-leak';

function portkeyProvider(): RegistryProvider {
  return {
    id: 'portkey',
    templateId: 'portkey',
    name: 'Portkey',
    enabled: true,
    authRef: 'keyring:provider:portkey',
    authType: 'api',
    api: { npm: PORTKEY_NPM, url: PORTKEY_URL },
    addedAt: '2026-06-28T00:00:00.000Z',
    modelsCache: {
      fetchedAt: '2026-06-28T00:00:00.000Z',
      models: [
        {
          id: 'portkey/production',
          name: 'Portkey: Production',
          upstreamModelId: 'portkey/production',
          modelFormat: 'openai',
          npm: PORTKEY_NPM,
          apiUrl: PORTKEY_URL,
          headers: { 'x-portkey-config': 'production' },
          portkey: { configSlug: 'production' },
        },
      ],
    },
  };
}

function genericProvider(): RegistryProvider {
  return {
    id: 'mistral',
    templateId: 'mistral',
    name: 'Mistral',
    enabled: true,
    authRef: 'keyring:provider:mistral',
    authType: 'api',
    api: { npm: PORTKEY_NPM, url: 'https://api.mistral.ai/v1' },
    addedAt: '2026-06-28T00:00:00.000Z',
    modelsCache: {
      fetchedAt: '2026-06-28T00:00:00.000Z',
      models: [
        {
          id: 'mistral-large',
          name: 'Mistral Large',
          upstreamModelId: 'mistral-large',
          modelFormat: 'openai',
          npm: PORTKEY_NPM,
          apiUrl: 'https://api.mistral.ai/v1',
        },
      ],
    },
  };
}

describe('materializeRegistry — Portkey secret injection', () => {
  it('injects x-portkey-api-key into the runtime Portkey model headers from the resolved credential', () => {
    const registry: ProviderRegistry = { schemaVersion: 1, providers: [portkeyProvider()] };
    const [local] = materializeRegistry(registry, () => MASTER_KEY);

    expect(local).toBeDefined();
    const model = local!.models[0]!;
    expect(model.headers?.['x-portkey-api-key']).toBe(MASTER_KEY);
    // Non-secret routing header is preserved alongside the injected secret.
    expect(model.headers?.['x-portkey-config']).toBe('production');
  });

  it('SECURITY: never injects x-portkey-api-key for a non-Portkey provider', () => {
    const registry: ProviderRegistry = { schemaVersion: 1, providers: [genericProvider()] };
    const [local] = materializeRegistry(registry, () => MASTER_KEY);

    expect(local).toBeDefined();
    const model = local!.models[0]!;
    expect(model.headers?.['x-portkey-api-key']).toBeUndefined();
  });

  it('SECURITY: does not mutate the on-disk CachedModel headers (secret never written back)', () => {
    const provider = portkeyProvider();
    const registry: ProviderRegistry = { schemaVersion: 1, providers: [provider] };

    materializeRegistry(registry, () => MASTER_KEY);

    // The source registry object (what gets serialized to providers.json) must be
    // untouched: only the non-secret routing header should remain on disk.
    const cached = provider.modelsCache!.models[0]!;
    expect(cached.headers).toEqual({ 'x-portkey-config': 'production' });
    expect(cached.headers?.['x-portkey-api-key']).toBeUndefined();
  });

  it('SECURITY: a mixed registry keeps the secret out of the non-Portkey provider', () => {
    const registry: ProviderRegistry = {
      schemaVersion: 1,
      providers: [portkeyProvider(), genericProvider()],
    };
    const locals = materializeRegistry(registry, () => MASTER_KEY);

    const portkey = locals.find(p => p.id === 'portkey')!;
    const mistral = locals.find(p => p.id === 'mistral')!;

    expect(portkey.models[0]!.headers?.['x-portkey-api-key']).toBe(MASTER_KEY);
    for (const model of mistral.models) {
      expect(model.headers?.['x-portkey-api-key']).toBeUndefined();
    }
  });
});
