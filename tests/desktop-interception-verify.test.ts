import { describe, expect, it } from 'vitest';
import { isVerificationStale } from '../src/desktop-interception/app-targets.js';
import { createClaudeDesktopVerificationResult, createVerificationResult, sanitizeSamples, staleVerificationResult } from '../src/desktop-interception/verify.js';

describe('desktop interception verification fixtures', () => {
  it('records supported/interceptable verification results', () => {
    const result = createClaudeDesktopVerificationResult({
      appVersion: '1.0.0',
      osName: 'Windows',
      osVersion: '11',
      hosts: [
        { host: 'api.anthropic.com', state: 'interceptable' },
        { host: 'claude.ai', state: 'interceptable' },
      ],
    });

    expect(result.supportState).toBe('supported');
    expect(result.enablementBlocked).toBe(false);
    expect(result.hosts.map(host => host.host)).toEqual(['api.anthropic.com', 'claude.ai']);
  });

  it('requires both Claude Desktop hosts before enablement is supported', () => {
    const result = createClaudeDesktopVerificationResult({
      appVersion: '1.0.0',
      osName: 'Windows',
      osVersion: '11',
      hosts: [{ host: 'api.anthropic.com', state: 'interceptable' }],
    });

    expect(result.supportState).toBe('incomplete_evidence');
    expect(result.enablementBlocked).toBe(true);
    expect(result.hosts).toContainEqual({ host: 'claude.ai', state: 'not_observed' });
  });

  it('blocks pinned, proxy-ignored, and incomplete evidence results', () => {
    expect(createVerificationResult({
      appName: 'Claude Desktop',
      osName: 'Windows',
      osVersion: '11',
      hosts: [{ host: 'api.anthropic.com', state: 'pinned' }],
    })).toMatchObject({ supportState: 'pinned_or_trust_refused', enablementBlocked: true });

    expect(createVerificationResult({
      appName: 'Claude Desktop',
      osName: 'Windows',
      osVersion: '11',
      hosts: [{ host: 'api.anthropic.com', state: 'proxy_ignored' }],
    })).toMatchObject({ supportState: 'pinned_or_trust_refused', enablementBlocked: true });

    expect(createVerificationResult({
      appName: 'Claude Desktop',
      osName: 'Windows',
      osVersion: '11',
      hosts: [{ host: 'api.anthropic.com', state: 'not_observed' }],
    })).toMatchObject({ supportState: 'incomplete_evidence', enablementBlocked: true });
  });

  it('detects stale app/OS tuples', () => {
    const recorded = {
      appName: 'Claude Desktop',
      appVersion: '1.0.0',
      osName: 'Windows',
      osVersion: '11',
      supportHosts: ['claude.ai', 'api.anthropic.com'],
      trustMechanism: 'windows-root-ca',
      proxyMechanism: 'winhttp-loopback',
    };
    expect(isVerificationStale(recorded, { ...recorded, appVersion: '1.0.1' })).toBe(true);
    expect(isVerificationStale(recorded, { ...recorded, supportHosts: ['api.anthropic.com'] })).toBe(true);
    expect(isVerificationStale(recorded, { ...recorded, trustMechanism: 'user-ca' })).toBe(true);
    expect(isVerificationStale(recorded, { ...recorded, proxyMechanism: 'pac' })).toBe(true);
    expect(staleVerificationResult(recorded, {
      ...recorded,
      supportHosts: ['API.ANTHROPIC.COM', 'claude.ai'],
      trustMechanism: ' Windows-Root-CA ',
      proxyMechanism: ' WinHTTP-Loopback ',
    })).toBeUndefined();
  });

  it('redacts verification samples and only includes body placeholders with debug consent', () => {
    const samples = [{
      method: 'POST',
      path: '/v1/messages?api_key=sk-secret-secret-secret',
      headers: { authorization: 'Bearer secret-token-secret-token' },
      bodyPreview: 'full prompt text',
    }];

    expect(sanitizeSamples(samples)[0]).toEqual({
      method: 'POST',
      path: '/v1/messages?api_key=%5BREDACTED%5D',
      headers: { authorization: '[REDACTED]' },
      bodyPreview: undefined,
    });
    expect(sanitizeSamples(samples, { consentedAt: '2026-06-29T00:00:00.000Z', allowPromptSamples: true })[0]?.bodyPreview).toBe('[REDACTED]');
  });
});
