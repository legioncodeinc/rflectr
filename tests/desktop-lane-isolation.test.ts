// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
//
// PRD-023e integration test: proves lane isolation, the rival-app global-proxy
// block, and per-lane stop semantics. Ties together the Wave 1 lane primitives
// (app-targets.ts), the Wave 2 router endpoints' rival-app guard
// (rival-apps.ts + os-proxy.ts), and the Wave 3 dashboard DTO (dashboard.ts).
//
// Mocks `node:child_process` (ESM-safe) so no real process is launched and no
// real OS proxy/trust state is ever mutated. `process.platform` is overridden
// via defineProperty and restored in afterEach.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';

// ESM-safe partial mock of the builtin: keep the real module (so transitively
// imported members like `spawn` resolve) and override only `execSync`, which is
// the only member rival-apps.ts / os-proxy.ts call. The factory is hoisted
// above the source imports below, so this is the binding they get.
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execSync: vi.fn() };
});
const mockedExecSync = vi.mocked(execSync);

import {
  laneOwnsHost,
  lanesForHost,
  type LaneId,
} from '../src/desktop-interception/app-targets.js';
import {
  assertNoRivalAppsRunning,
  detectRunningRivalApps,
  formatRivalAppWarning,
} from '../src/desktop-interception/rival-apps.js';
import {
  MacosOsProxyAdapter,
  WindowsOsProxyAdapter,
  createOsProxyAdapter,
  noopOsProxyAdapter,
} from '../src/desktop-interception/os-proxy.js';
import {
  buildDesktopLaneStatuses,
  type DashboardRuntime,
  type DesktopLaneStatusDto,
} from '../src/server/dashboard.js';

const REAL_PLATFORM = process.platform;

function setPlatform(value: string): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

afterEach(() => {
  mockedExecSync.mockReset();
  Object.defineProperty(process, 'platform', { value: REAL_PLATFORM, configurable: true });
});

describe('lane egress exclusivity (AC-023e-5 / AC-023-27)', () => {
  it('claude-native owns api.anthropic.com and never a rival host', () => {
    expect(laneOwnsHost('claude-native', 'api.anthropic.com')).toBe(true);
    expect(laneOwnsHost('claude-native', 'api.openai.com')).toBe(false);
  });

  it('codex-desktop owns api.openai.com and never a Claude host', () => {
    expect(laneOwnsHost('codex-desktop', 'api.openai.com')).toBe(true);
    expect(laneOwnsHost('codex-desktop', 'api.anthropic.com')).toBe(false);
  });

  it("lanesForHost('api.openai.com') resolves to only codex-desktop - a Claude lane can never claim a rival host", () => {
    expect(lanesForHost('api.openai.com')).toEqual(['codex-desktop']);
  });

  it("lanesForHost('api.anthropic.com') contains the Claude lanes but never codex-desktop", () => {
    const lanes = lanesForHost('api.anthropic.com');
    expect(lanes).toContain('claude-native');
    expect(lanes).toContain('claude-legacy-gateway');
    expect(lanes).not.toContain('codex-desktop');
  });
});

describe('rival-app global-proxy block (AC-023e-6 / AC-023-24)', () => {
  it('detects a running rival app on win32, blocks without override, and allows an explicit override', () => {
    setPlatform('win32');
    // PowerShell Measure-Object Count > 0 => the app is running.
    mockedExecSync.mockReturnValue('1');

    expect(detectRunningRivalApps().anyRunning).toBe(true);

    expect(() => assertNoRivalAppsRunning()).toThrow('blocked');
    expect(() => assertNoRivalAppsRunning(true)).not.toThrow();
  });

  it('treats a failing probe as not-running and does not block', () => {
    setPlatform('win32');
    mockedExecSync.mockImplementation(() => {
      throw new Error('powershell.exe not available');
    });

    expect(detectRunningRivalApps().anyRunning).toBe(false);
    expect(() => assertNoRivalAppsRunning()).not.toThrow();
  });

  it('formatRivalAppWarning names the running app and the block', () => {
    const msg = formatRivalAppWarning({ running: ['ChatGPT'], anyRunning: true, platform: 'win32' });
    expect(msg).toContain('ChatGPT');
    expect(msg).toContain('blocked');
  });
});

describe('per-lane runtime isolation (AC-023e-11..13 / AC-023-28)', () => {
  type MinimalLaneRuntime = { claudeNativeTransport?: unknown; codexProxy?: unknown };

  function laneStatus(partial: MinimalLaneRuntime, laneId: LaneId): DesktopLaneStatusDto {
    const lanes = buildDesktopLaneStatuses(partial as unknown as DashboardRuntime);
    const lane = lanes.find(l => l.laneId === laneId);
    if (!lane) throw new Error(`lane ${laneId} not found`);
    return lane;
  }

  it('claude-native and codex-desktop can both run at the same time', () => {
    const runtime = { claudeNativeTransport: { port: 4321 }, codexProxy: { port: 8765 } };
    expect(laneStatus(runtime, 'claude-native').running).toBe(true);
    expect(laneStatus(runtime, 'codex-desktop').running).toBe(true);
  });

  it('stopping codex does not stop claude (independent lanes)', () => {
    const runtime = { claudeNativeTransport: { port: 4321 }, codexProxy: null };
    expect(laneStatus(runtime, 'claude-native').running).toBe(true);
    expect(laneStatus(runtime, 'codex-desktop').running).toBe(false);
  });

  it('stopping claude does not stop codex (independent lanes)', () => {
    const runtime = { claudeNativeTransport: null, codexProxy: { port: 8765 } };
    expect(laneStatus(runtime, 'claude-native').running).toBe(false);
    expect(laneStatus(runtime, 'codex-desktop').running).toBe(true);
  });

  it('surfaces exactly 3 lanes with claude-native as the only preferred, app-scoped-proxy lane', () => {
    const lanes = buildDesktopLaneStatuses({} as unknown as DashboardRuntime);
    expect(lanes).toHaveLength(3);

    expect(lanes.filter(l => l.preferred).map(l => l.laneId)).toEqual(['claude-native']);
    expect(lanes.filter(l => l.isolation === 'app-scoped-proxy').map(l => l.laneId))
      .toEqual(['claude-native']);
  });

  it('codex-desktop never reports a native-interception attach mechanism (AC-023e-12)', () => {
    const codex = laneStatus(
      { claudeNativeTransport: { port: 4321 }, codexProxy: { port: 8765 } },
      'codex-desktop',
    );
    expect(codex.attachMechanism).not.toBe('native-interception');
    expect(codex.attachMechanism).toBe('config-profile');
  });
});

describe('OS proxy adapter factory (AC-023e-2..3 hard-rollback seam)', () => {
  it('noopOsProxyAdapter has no apply/restore and reads as unknown', () => {
    expect(noopOsProxyAdapter.apply).toBeUndefined();
    expect(noopOsProxyAdapter.restore).toBeUndefined();
    expect(noopOsProxyAdapter.read()).toEqual({ mode: 'unknown' });
  });

  it('returns a WindowsOsProxyAdapter on win32', () => {
    setPlatform('win32');
    const adapter = createOsProxyAdapter();
    expect(adapter).toBeInstanceOf(WindowsOsProxyAdapter);
    expect(adapter.constructor.name).toBe('WindowsOsProxyAdapter');
  });

  it('returns a MacosOsProxyAdapter on darwin', () => {
    setPlatform('darwin');
    const adapter = createOsProxyAdapter();
    expect(adapter).toBeInstanceOf(MacosOsProxyAdapter);
    expect(adapter.constructor.name).toBe('MacosOsProxyAdapter');
  });

  it('returns the shared noop adapter on unsupported platforms (e.g. linux)', () => {
    setPlatform('linux');
    expect(createOsProxyAdapter()).toBe(noopOsProxyAdapter);
  });
});
