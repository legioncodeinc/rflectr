import { describe, expect, it } from 'vitest';
import { platform, release } from 'node:os';
import {
  DashboardActivityBuffer,
  beginDashboardActivity,
  completeDashboardActivity,
  dashboardSettings,
  sanitizeDashboardError,
  type DashboardActivityEvent,
  type DashboardRuntime,
} from '../src/server/dashboard.js';
import { createObservedClaudeVerification } from '../src/desktop-interception/claude-target.js';

function event(id: string): DashboardActivityEvent {
  return {
    id,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:00.100Z',
    tool: 'anthropic',
    model: 'claude-test',
    providerId: 'zen',
    providerLabel: 'OpenCode Zen',
    backend: 'zen',
    status: 'success',
    httpStatus: 200,
    latencyMs: 100,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
  };
}

describe('dashboard activity buffer', () => {
  it('evicts the oldest event when the ring buffer limit is reached', () => {
    const buffer = new DashboardActivityBuffer(2);

    buffer.append(event('first'));
    buffer.append(event('second'));
    buffer.append(event('third'));

    expect(buffer.list().map(item => item.id)).toEqual(['third', 'second']);
  });

  it('classifies throttled or upstream-failed activity as retry-visible', () => {
    const buffer = new DashboardActivityBuffer();
    completeDashboardActivity(buffer, beginDashboardActivity('anthropic', 'claude-test'), null, 429);

    expect(buffer.list()[0]).toMatchObject({
      status: 'retry',
      httpStatus: 429,
    });
  });

  it('redacts secret-like values from dashboard error text', () => {
    expect(sanitizeDashboardError(new Error('failed with sk-secret123 and Bearer abc.def'))).toBe(
      'failed with [redacted] and Bearer [redacted]',
    );
  });

  it('marks native Claude Desktop interception primary after successful live verification', () => {
    const runtime: DashboardRuntime = {
      startedAt: Date.now(),
      host: '127.0.0.1',
      port: 17645,
      local: true,
      serverPassword: null,
      claudeNativeVerification: createObservedClaudeVerification({
        osName: platform(),
        osVersion: release(),
        hosts: [
          { host: 'api.anthropic.com', state: 'interceptable' },
          { host: 'claude.ai', state: 'interceptable' },
        ],
      }),
    };

    expect(dashboardSettings(runtime).claudeDesktop).toMatchObject({
      nativeInterception: {
        available: true,
        primary: true,
        status: 'native_supported',
        verification: {
          evidenceSource: 'live',
          appVersion: null,
        },
      },
      legacyGateway: {
        available: true,
        primary: false,
        mode: 'legacy_gateway',
      },
    });
  });

  it('requires re-verification when persisted native evidence has a stale app version', () => {
    const runtime: DashboardRuntime = {
      startedAt: Date.now(),
      host: '127.0.0.1',
      port: 17645,
      local: true,
      serverPassword: null,
      claudeNativeVerification: createObservedClaudeVerification({
        osName: platform(),
        osVersion: release(),
        appVersion: '1.2.3',
        hosts: [
          { host: 'api.anthropic.com', state: 'interceptable' },
          { host: 'claude.ai', state: 'interceptable' },
        ],
      }),
    };

    expect(dashboardSettings(runtime).claudeDesktop).toMatchObject({
      nativeInterception: {
        available: false,
        primary: false,
        status: 'verification_required',
      },
      legacyGateway: {
        available: true,
        primary: true,
      },
    });
  });
});
