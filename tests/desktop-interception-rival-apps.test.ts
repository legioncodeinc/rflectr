import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ESM-safe mock of execSync. `vi.spyOn` on a Node builtin namespace throws
// ("Module namespace is not configurable in ESM"), so we use `vi.mock` with a
// factory and drive the mock via `vi.mocked`.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import {
  RIVAL_APP_NAMES,
  detectRunningRivalApps,
  formatRivalAppWarning,
  assertNoRivalAppsRunning,
} from '../src/desktop-interception/rival-apps.js';

const execMock = vi.mocked(execSync);

const ORIGINAL_PLATFORM = Object.getOwnPropertyDescriptor(process, 'platform');

function setPlatform(value: string): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

function restorePlatform(): void {
  if (ORIGINAL_PLATFORM) {
    Object.defineProperty(process, 'platform', ORIGINAL_PLATFORM);
  }
}

beforeEach(() => {
  execMock.mockReset();
});

afterEach(() => {
  restorePlatform();
});

describe('RIVAL_APP_NAMES', () => {
  it("is ['ChatGPT', 'Codex']", () => {
    expect([...RIVAL_APP_NAMES]).toEqual(['ChatGPT', 'Codex']);
  });
});

describe('detectRunningRivalApps', () => {
  it('returns the empty "other" result on non-win32/darwin platforms', () => {
    setPlatform('linux');
    const d = detectRunningRivalApps();
    expect(d).toEqual({ running: [], anyRunning: false, platform: 'other' });
    expect(execMock).not.toHaveBeenCalled();
  });

  it('detects running apps on win32 when the process Count is > 0', () => {
    setPlatform('win32');
    execMock.mockReturnValue('2');
    const d = detectRunningRivalApps();
    expect(d.platform).toBe('win32');
    expect(d.anyRunning).toBe(true);
    expect(d.running.length).toBeGreaterThan(0);
    expect(d.running).toContain('ChatGPT');
  });

  it('treats failed queries as not-running and does not itself throw', () => {
    setPlatform('win32');
    execMock.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => detectRunningRivalApps()).not.toThrow();
    const d = detectRunningRivalApps();
    expect(d.running).toEqual([]);
    expect(d.anyRunning).toBe(false);
  });
});

describe('formatRivalAppWarning', () => {
  it('returns a non-empty warning mentioning the app and "blocked" when running', () => {
    const w = formatRivalAppWarning({
      running: ['ChatGPT'],
      anyRunning: true,
      platform: 'win32',
    });
    expect(w).not.toBe('');
    expect(w).toContain('ChatGPT');
    expect(w).toContain('blocked');
  });

  it("returns '' when nothing is running", () => {
    const w = formatRivalAppWarning({
      running: [],
      anyRunning: false,
      platform: 'other',
    });
    expect(w).toBe('');
  });
});

describe('assertNoRivalAppsRunning', () => {
  it('throws with a "blocked" message when a rival app is running', () => {
    setPlatform('win32');
    execMock.mockReturnValue('2');
    expect(() => assertNoRivalAppsRunning()).toThrow(/blocked/);
  });

  it('does not throw when an explicit override is passed', () => {
    setPlatform('win32');
    execMock.mockReturnValue('2');
    expect(() => assertNoRivalAppsRunning(true)).not.toThrow();
  });

  it('does not throw when no rival app is running', () => {
    setPlatform('win32');
    execMock.mockReturnValue('0');
    expect(() => assertNoRivalAppsRunning()).not.toThrow();
  });
});
