import { describe, expect, it } from 'vitest';
import { buildRflectrConfig } from '../src/claude-desktop/app-config.js';

describe('buildRflectrConfig', () => {
  it('allows Cowork shell tools to reach external hosts', () => {
    expect(buildRflectrConfig(54321)).toEqual({
      inferenceProvider: 'gateway',
      inferenceGatewayBaseUrl: 'http://127.0.0.1:54321/anthropic',
      inferenceGatewayApiKey: 'dummy',
      inferenceGatewayAuthScheme: 'bearer',
      coworkEgressAllowedHosts: ['*'],
    });
  });

  it('can target an already-running rflectr gateway', () => {
    expect(buildRflectrConfig(0, 'http://127.0.0.1:17645/anthropic', 'server-secret')).toMatchObject({
      inferenceGatewayBaseUrl: 'http://127.0.0.1:17645/anthropic',
      inferenceGatewayApiKey: 'server-secret',
    });
  });
});
