import { describe, expect, it } from 'vitest';
import { platform, release } from 'node:os';
import {
  DashboardActivityBuffer,
  beginDashboardActivity,
  buildDesktopLaneStatuses,
  completeDashboardActivity,
  dashboardAsset,
  dashboardSettings,
  sanitizeDashboardError,
  type DashboardActivityEvent,
  type DesktopLaneStatusDto,
  type DashboardRuntime,
} from '../src/server/dashboard.js';
import type { DesktopInterceptionTransport } from '../src/desktop-interception/transport.js';
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

function baseRuntime(overrides: Partial<DashboardRuntime> = {}): DashboardRuntime {
  return {
    startedAt: Date.now(),
    host: '127.0.0.1',
    port: 17645,
    local: true,
    serverPassword: null,
    ...overrides,
  };
}

describe('desktop lane status builder (PRD-023e)', () => {
  it('returns one entry per lane in resolution-preference order with stable shape', () => {
    const lanes = buildDesktopLaneStatuses(baseRuntime());

    expect(lanes).toHaveLength(3);
    expect(lanes.map(lane => lane.laneId)).toEqual([
      'claude-native',
      'claude-legacy-gateway',
      'codex-desktop',
    ]);

    const native = lanes.find(lane => lane.laneId === 'claude-native');
    const legacy = lanes.find(lane => lane.laneId === 'claude-legacy-gateway');
    const codex = lanes.find(lane => lane.laneId === 'codex-desktop');

    // claude-native is the only preferred + app-scoped-proxy lane.
    expect(native?.preferred).toBe(true);
    expect(native?.isolation).toBe('app-scoped-proxy');
    expect(native?.attachMechanism).toBe('native-interception');
    expect([legacy, codex].every(lane => lane?.preferred === false)).toBe(true);
    expect([legacy, codex].every(lane => lane?.isolation === 'config-only')).toBe(true);

    // The DTO shape must stay stable: controls is an array of strings.
    for (const lane of lanes) {
      expect(Array.isArray(lane.controls)).toBe(true);
      expect(lane.controls.every(control => typeof control === 'string')).toBe(true);
      expect(typeof lane.status).toBe('string');
      expect(typeof lane.running).toBe('boolean');
      expect(typeof lane.appName).toBe('string');
    }
  });

  it('derives claude-native running state from claudeNativeTransport', () => {
    const stopped = buildDesktopLaneStatuses(baseRuntime());
    expect(stopped.find(lane => lane.laneId === 'claude-native')?.running).toBe(false);

    const transport = { port: 18101, status: () => undefined, close: async () => undefined } as unknown as DesktopInterceptionTransport;
    const running = buildDesktopLaneStatuses(baseRuntime({ claudeNativeTransport: transport }));
    expect(running.find(lane => lane.laneId === 'claude-native')?.running).toBe(true);
  });

  it('derives codex-desktop running state from codexProxy', () => {
    const stopped = buildDesktopLaneStatuses(baseRuntime());
    expect(stopped.find(lane => lane.laneId === 'codex-desktop')?.running).toBe(false);

    const running = buildDesktopLaneStatuses(baseRuntime({ codexProxy: { port: 18102, close: () => undefined } }));
    expect(running.find(lane => lane.laneId === 'codex-desktop')?.running).toBe(true);
  });

  it('prefers explicit per-lane state over the legacy runtime fields', () => {
    const runtime = baseRuntime({
      lanes: {
        'codex-desktop': {
          laneId: 'codex-desktop',
          attachMechanism: 'config-profile',
          isolation: 'config-only',
          running: false,
        },
        'claude-native': {
          laneId: 'claude-native',
          attachMechanism: 'native-interception',
          isolation: 'app-scoped-proxy',
          running: true,
          startedAt: '2026-06-30T00:00:00.000Z',
        },
      },
    });
    const lanes = buildDesktopLaneStatuses(runtime);

    expect(lanes.find(lane => lane.laneId === 'claude-native')?.running).toBe(true);
    // Per-lane state wins even though no codexProxy handle is set.
    expect(lanes.find(lane => lane.laneId === 'codex-desktop')?.running).toBe(false);
  });

  it('surfaces lane statuses through the settings DTO payload', () => {
    const settings = dashboardSettings(baseRuntime());
    expect(Array.isArray(settings.lanes)).toBe(true);
    expect(settings.lanes).toHaveLength(3);
    expect((settings.lanes as DesktopLaneStatusDto[]).map(lane => lane.laneId)).toContain('codex-desktop');
  });

  it('renders the four new desktop-app control buttons into the dashboard JS bundle', () => {
    const asset = dashboardAsset('/dashboard/assets/dashboard.js');
    expect(asset?.body).toBeTypeOf('string');
    const bundle = asset!.body as string;

    // The new handlers and onclick wiring must ship in the embedded JS.
    for (const marker of [
      'revertClaudeDesktop',
      'revertCodexDesktop',
      'stopCodexProxy',
      'killServer',
      'Revert legacy',
      'Revert Codex',
      'Stop Codex proxy',
      'Kill server',
    ]) {
      expect(bundle).toContain(marker);
    }

    // Each new control must POST to its router endpoint.
    expect(bundle).toContain('/dashboard/api/claude-desktop/revert');
    expect(bundle).toContain('/dashboard/api/codex-desktop/revert');
    expect(bundle).toContain('/dashboard/api/codex-desktop/stop');
    expect(bundle).toContain('/dashboard/api/server/kill');
  });
});
