import { describe, expect, it } from 'vitest';
import { createDesktopInterceptionConfig, loadDesktopInterceptionConfig } from '../src/desktop-interception/config.js';

describe('desktop interception config', () => {
  it('defaults to an inert loopback transport config', () => {
    const config = createDesktopInterceptionConfig();

    expect(config.port).toBe(0);
    expect(config.host).toBe('127.0.0.1');
    expect(config.closeTimeoutMs).toBe(5000);
    expect(config.allowedHosts).toEqual([]);
    expect(config.routingEnabled).toBe(false);
  });

  it('loads rflectr desktop env without old memory/deeplake switches', () => {
    const config = loadDesktopInterceptionConfig({
      RFLECTR_HOME: 'C:/Users/test',
      RFLECTR_DESKTOP_PROXY_PORT: '1234',
      RFLECTR_DESKTOP_ALLOWED_HOSTS: 'api.anthropic.com, claude.ai',
      RFLECTR_DESKTOP_GATEWAY_HOSTS: 'gateway.local',
      RFLECTR_DESKTOP_ROUTING: '1',
      HIVEMIND_CAPTURE: 'true',
      RFLECTR_DEEPLAKE_HOST: 'api.deeplake.ai',
    });

    expect(config.port).toBe(1234);
    expect(config.allowedHosts.map(host => host.host)).toEqual(['api.anthropic.com', 'claude.ai']);
    expect(config.routingGatewayHosts.map(host => host.host)).toEqual(['gateway.local']);
    expect(JSON.stringify(config)).not.toContain('deeplake');
    expect(JSON.stringify(config)).not.toContain('HIVEMIND');
  });
});
