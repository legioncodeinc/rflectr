import { describe, expect, it } from 'vitest';
import {
  DashboardActivityBuffer,
  beginDashboardActivity,
  completeDashboardActivity,
  sanitizeDashboardError,
  type DashboardActivityEvent,
} from '../src/server/dashboard.js';

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
});
