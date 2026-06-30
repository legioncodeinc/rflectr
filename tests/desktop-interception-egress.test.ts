import { describe, expect, it } from 'vitest';
import { DesktopEgress, canonicalizeDestination, formatLeakAttempt } from '../src/desktop-interception/egress.js';
import { REDACTED, redactHeaders, redactPath, redactUnknown, redactUrl } from '../src/desktop-interception/redaction.js';

describe('desktop interception egress', () => {
  it('allows exact configured hosts with reason and target app label', () => {
    const egress = new DesktopEgress({
      allowedHosts: [{ host: 'api.anthropic.com', label: 'Claude Desktop', reason: 'target-app' }],
    });

    expect(egress.check('https://api.anthropic.com/v1/messages')).toMatchObject({
      allowed: true,
      reason: 'target-app',
      targetApp: 'Claude Desktop',
    });
  });

  it('denies non-allowlisted hosts before upstream connection', () => {
    const egress = new DesktopEgress({
      allowedHosts: [{ host: 'api.anthropic.com', label: 'Claude Desktop', reason: 'target-app' }],
    });

    expect(egress.check('https://example.com/steal')).toMatchObject({
      allowed: false,
      reason: 'not-on-allowlist',
    });
  });

  it('allows routing gateway hosts only when routing is enabled', () => {
    const gateway = { host: 'gateway.local', label: 'routing gateway', reason: 'routing' };

    expect(new DesktopEgress({ routingGatewayHosts: [gateway], routingEnabled: false }).check('https://gateway.local')).toMatchObject({
      allowed: false,
    });
    expect(new DesktopEgress({ routingGatewayHosts: [gateway], routingEnabled: true }).check('https://gateway.local')).toMatchObject({
      allowed: true,
      reason: 'routing',
    });
  });

  it('canonicalizes host matching and rejects deceptive suffixes by default', () => {
    const egress = new DesktopEgress({
      allowedHosts: [
        { host: 'API.Anthropic.COM.', label: 'Claude', reason: 'target-app' },
        { host: 'example.org', label: 'Example', reason: 'target-app', includeSubdomains: true },
      ],
    });

    expect(egress.check('https://api.anthropic.com.:443/path')).toMatchObject({ allowed: true });
    expect(egress.check('https://evilapi.anthropic.com/path')).toMatchObject({ allowed: false });
    expect(egress.check('https://sub.example.org/path')).toMatchObject({ allowed: true });
    expect(egress.check('https://badexample.org/path')).toMatchObject({ allowed: false });
  });

  it('normalizes IDNA hosts, ports, and loopback ownership', () => {
    const idna = canonicalizeDestination('https://bücher.example');
    expect(idna.host).toBe('xn--bcher-kva.example');
    expect(idna.port).toBe(443);

    const egress = new DesktopEgress({
      ownedLoopbackEndpoints: [{ host: '127.0.0.1', port: 3456, label: 'rflectr proxy' }],
    });

    expect(egress.check('http://127.0.0.1:3456/health')).toMatchObject({ allowed: true, reason: 'owned-loopback' });
    expect(egress.check('http://127.0.0.1:4567/health')).toMatchObject({ allowed: false, reason: 'loopback-not-owned' });
    expect(egress.check('http://169.254.169.254/latest')).toMatchObject({ allowed: false, reason: 'ip-literal-denied' });
  });

  it('redacts denied event details and common secret shapes', () => {
    const event = formatLeakAttempt({
      destination: canonicalizeDestination('https://evil.example:8443/path?api_key=sk-secret-secret-secret'),
      method: 'POST',
      path: '/path?api_key=sk-secret-secret-secret',
      headers: {
        authorization: 'Bearer secret-token-secret-token',
        cookie: 'sid=secret',
        'x-safe': 'visible',
      },
      bodyPreview: 'Bearer body-secret-body-secret',
      reason: 'not-on-allowlist',
    });

    expect(event).not.toContain('secret-token-secret-token');
    expect(event).not.toContain('sk-secret-secret-secret');
    expect(event).not.toContain('body-secret-body-secret');
    expect(event).not.toContain('api_key');
    expect(JSON.parse(event)).toMatchObject({
      event: 'egress.leak_attempt',
      reason: 'not-on-allowlist',
      destination: { host: 'evil.example', port: 8443 },
      request: { method: 'POST' },
    });
  });

  it('serializes last denied egress status without path query or auth details', () => {
    const egress = new DesktopEgress();

    egress.check('https://evil.example/path?api_key=sk-secret-secret-secret');

    expect(egress.status()).toMatchObject({
      lastDenied: {
        host: 'evil.example',
        port: 443,
        reason: 'not-on-allowlist',
      },
    });
    expect(JSON.stringify(egress.status())).not.toContain('api_key');
    expect(JSON.stringify(egress.status())).not.toContain('sk-secret');
    expect(JSON.stringify(egress.status())).not.toContain('/path');
  });
});

describe('desktop interception redaction', () => {
  it('redacts headers, URLs, paths, and nested secret-like values', () => {
    expect(redactHeaders({ Authorization: 'Bearer abcdefghijklmnop', 'x-api-key': 'sk-test-test-test-test', safe: 'ok' })).toEqual({
      Authorization: REDACTED,
      'x-api-key': REDACTED,
      safe: 'ok',
    });
    expect(redactHeaders({ 'x-portkey-api-key': 'sk-test-test-test-test' })).toEqual({
      'x-portkey-api-key': REDACTED,
    });
    expect(redactUrl('https://example.com/?api_key=sk-test-test-test-test&safe=1')).not.toContain('sk-test');
    expect(redactPath('/v1/messages?access_token=secret-secret-secret&safe=1')).not.toContain('secret-secret');
    expect(JSON.stringify(redactUnknown({ token: 'secret-token', nested: { value: 'Bearer abcdefghijklmnop' } }))).not.toContain('abcdefghijklmnop');
  });
});
