// tests/proxy.test.ts
import { describe, it, expect } from 'vitest';
import { aliasModelId } from '../src/proxy.js';
import type { ProxyRoute } from '../src/proxy.js';

describe('aliasModelId', () => {
  it('returns claude-* ids unchanged', () => {
    expect(aliasModelId('claude-sonnet-4', 'Anthropic')).toBe('claude-sonnet-4');
  });

  it('prefixes non-claude ids with anthropic-{providerId}__', () => {
    expect(aliasModelId('grok-4.3', 'xai')).toBe('anthropic-xai__grok-4.3');
  });

  it('uses stable provider id slug in alias', () => {
    expect(aliasModelId('deepseek-v4', 'go')).toBe('anthropic-go__deepseek-v4');
  });
});

describe('ProxyRoute.headers', () => {
  it('accepts optional headers field on a ProxyRoute', () => {
    // Type-level assertion: constructing a ProxyRoute with headers must compile
    // and the value must be accessible at runtime.
    const route: ProxyRoute = {
      aliasId: 'anthropic-portkey__claude-sonnet-4-6',
      realModelId: 'claude-sonnet-4-6',
      displayName: 'claude-sonnet-4-6',
      upstreamUrl: 'https://api.portkey.ai',
      apiKey: 'pk-key-123',
      modelFormat: 'openai',
      npm: '@ai-sdk/openai-compatible',
      headers: {
        'x-portkey-api-key': 'pk-key-123',
        'x-portkey-config': 'my-config-slug',
      },
    };

    expect(route.headers?.['x-portkey-api-key']).toBe('pk-key-123');
    expect(route.headers?.['x-portkey-config']).toBe('my-config-slug');
  });

  it('allows a ProxyRoute without headers (backward compatibility)', () => {
    const route: ProxyRoute = {
      aliasId: 'claude-sonnet-4-6',
      realModelId: 'claude-sonnet-4-6',
      displayName: 'claude-sonnet-4-6',
      upstreamUrl: 'https://api.anthropic.com',
      apiKey: 'sk-test',
      modelFormat: 'anthropic',
    };

    expect(route.headers).toBeUndefined();
  });
});
