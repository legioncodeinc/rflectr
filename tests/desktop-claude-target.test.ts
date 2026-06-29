import { describe, expect, it } from 'vitest';
import {
  CLAUDE_DESKTOP_TARGET,
  createNotInstalledClaudeVerification,
  createObservedClaudeVerification,
  evaluateClaudeNativeEnablement,
  isClaudeDesktopHost,
  isClaudeDesktopInferenceRequest,
} from '../src/desktop-interception/claude-target.js';

describe('Claude Desktop native target verification', () => {
  it('matches Claude Desktop hosts and the Anthropic inference endpoint', () => {
    expect(CLAUDE_DESKTOP_TARGET.supportedHosts).toEqual(['api.anthropic.com', 'claude.ai']);
    expect(isClaudeDesktopHost('api.anthropic.com')).toBe(true);
    expect(isClaudeDesktopHost('console.anthropic.com')).toBe(false);
    expect(isClaudeDesktopHost('example.com')).toBe(false);
    expect(isClaudeDesktopInferenceRequest({
      host: 'api.anthropic.com',
      method: 'POST',
      path: '/v1/messages?beta=true',
    })).toBe(true);
    expect(isClaudeDesktopInferenceRequest({
      host: 'claude.ai',
      method: 'GET',
      path: '/api/bootstrap',
    })).toBe(false);
  });

  it('blocks enablement when Claude Desktop is not installed', () => {
    const verification = createNotInstalledClaudeVerification({ osName: 'Windows', osVersion: '11' });

    expect(verification).toMatchObject({
      appName: 'Claude Desktop',
      supportState: 'not_installed',
      enablementBlocked: true,
      evidenceSource: 'live',
    });
    expect(evaluateClaudeNativeEnablement({ verification })).toMatchObject({
      state: 'not_installed',
      nativeEnabled: false,
      legacyGatewayAvailable: true,
    });
  });

  it('records live host coverage and supports native mode only when all required hosts are interceptable', () => {
    const verification = createObservedClaudeVerification({
      osName: 'Windows',
      osVersion: '11',
      appVersion: '1.2.3',
      proxyHonored: true,
      trustHonored: true,
      hosts: [
        { host: 'api.anthropic.com', state: 'interceptable' },
        { host: 'claude.ai', state: 'interceptable' },
      ],
    });

    expect(verification).toMatchObject({
      supportState: 'supported',
      appVersion: '1.2.3',
      evidenceSource: 'live',
      enablementBlocked: false,
      proxyHonored: true,
      trustHonored: true,
    });
    expect(verification.hosts.map(host => host.host)).toEqual(['api.anthropic.com', 'claude.ai']);
    expect(evaluateClaudeNativeEnablement({ verification })).toMatchObject({
      state: 'native_supported',
      nativeEnabled: true,
      legacyGatewayAvailable: true,
    });
  });

  it('maps pinning, proxy ignore, and stale tuples to blocked native mode with legacy fallback', () => {
    const pinned = createObservedClaudeVerification({
      osName: 'macOS',
      osVersion: '15.0',
      hosts: [{ host: 'api.anthropic.com', state: 'pinned' }],
    });
    expect(pinned.supportState).toBe('pinned_or_trust_refused');
    expect(evaluateClaudeNativeEnablement({ verification: pinned })).toMatchObject({
      state: 'pinned_or_trust_refused',
      nativeEnabled: false,
      legacyGatewayAvailable: true,
    });

    expect(evaluateClaudeNativeEnablement({
      verification: pinned,
      recorded: {
        appName: 'Claude Desktop',
        appVersion: '1.0.0',
        osName: 'Windows',
        osVersion: '11',
        supportHosts: ['api.anthropic.com', 'claude.ai'],
        trustMechanism: 'root-ca',
        proxyMechanism: 'loopback',
      },
      current: {
        appName: 'Claude Desktop',
        appVersion: '1.0.1',
        osName: 'Windows',
        osVersion: '11',
        supportHosts: ['api.anthropic.com', 'claude.ai'],
        trustMechanism: 'root-ca',
        proxyMechanism: 'loopback',
      },
    })).toMatchObject({
      state: 'verification_required',
      nativeEnabled: false,
    });
  });
});
