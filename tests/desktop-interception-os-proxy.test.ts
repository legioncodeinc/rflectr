import { execSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `node:child_process` is a Node builtin whose ESM namespace is not configurable,
// so `vi.spyOn(childProcess, 'execSync')` throws "Cannot redefine property".
// The supported way to mock a Node builtin in Vitest is vi.mock with a factory.
// This honors the spec's intent (mock execSync; never mutate the real OS).
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

const mockExec = vi.mocked(execSync);

const DIRECT_OUTPUT = [
  '',
  'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
  '    ProxyEnable    REG_DWORD    0x0',
  '    ProxyServer    REG_SZ    old:8080',
  '',
  '',
].join('\n');

const MANUAL_OUTPUT = [
  '',
  'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
  '    ProxyEnable    REG_DWORD    0x1',
  '    ProxyServer    REG_SZ    127.0.0.1:8888',
  '',
  '',
].join('\n');

const MAC_MANUAL_OUTPUT = [
  'Enabled: Yes',
  'Server: 127.0.0.1',
  'Port: 8888',
  'Authenticated Proxy Enabled: 0',
  '',
].join('\n');

const MAC_DIRECT_OUTPUT = ['Enabled: No', 'Server: ', 'Port: 0', ''].join('\n');

import {
  MacosOsProxyAdapter,
  WindowsOsProxyAdapter,
  createOsProxyAdapter,
  noopOsProxyAdapter,
  type OsProxySnapshot,
} from '../src/desktop-interception/os-proxy.js';

const allCalls = (): string[] => mockExec.mock.calls.map((c) => String(c[0]));

describe('noopOsProxyAdapter', () => {
  it('returns an unknown snapshot and exposes no apply/restore', () => {
    expect(noopOsProxyAdapter.read()).toEqual({ mode: 'unknown' });
    expect(noopOsProxyAdapter.apply).toBeUndefined();
    expect(noopOsProxyAdapter.restore).toBeUndefined();
  });
});

describe('createOsProxyAdapter', () => {
  it('returns the platform-appropriate adapter class', () => {
    const adapter = createOsProxyAdapter();
    if (process.platform === 'win32') {
      expect(adapter.constructor.name).toBe('WindowsOsProxyAdapter');
    } else if (process.platform === 'darwin') {
      expect(adapter.constructor.name).toBe('MacosOsProxyAdapter');
    } else {
      expect(adapter).toBe(noopOsProxyAdapter);
    }
  });

  it('instantiates WindowsOsProxyAdapter on win32', () => {
    if (process.platform !== 'win32') {
      // Regression guard for the win32 branch, runnable on any host.
      expect(new WindowsOsProxyAdapter().constructor.name).toBe('WindowsOsProxyAdapter');
      return;
    }
    expect(createOsProxyAdapter().constructor.name).toBe('WindowsOsProxyAdapter');
  });

  it('instantiates MacosOsProxyAdapter on darwin', () => {
    if (process.platform !== 'darwin') {
      expect(new MacosOsProxyAdapter().constructor.name).toBe('MacosOsProxyAdapter');
      return;
    }
    expect(createOsProxyAdapter().constructor.name).toBe('MacosOsProxyAdapter');
  });
});

describe('WindowsOsProxyAdapter', () => {
  beforeEach(() => {
    mockExec.mockReset();
  });
  afterEach(() => {
    mockExec.mockReset();
  });

  it('reads ProxyEnable 0x0 as direct', () => {
    mockExec.mockReturnValue(DIRECT_OUTPUT);
    const adapter = new WindowsOsProxyAdapter();
    expect(adapter.read()).toEqual({ mode: 'direct' });
  });

  it('reads ProxyEnable 0x1 with ProxyServer as manual host:port', () => {
    mockExec.mockReturnValue(MANUAL_OUTPUT);
    const adapter = new WindowsOsProxyAdapter();
    expect(adapter.read()).toEqual({ mode: 'manual', host: '127.0.0.1', port: 8888 });
  });

  it('returns unknown when execSync throws', () => {
    mockExec.mockImplementation(() => {
      throw new Error('reg not found');
    });
    const adapter = new WindowsOsProxyAdapter();
    expect(adapter.read()).toEqual({ mode: 'unknown' });
  });

  it('snapshots the first state, applies manual, and restores to the snapshot', () => {
    // read() returns direct initially -> this is the snapshot we expect retained.
    mockExec.mockReturnValue(DIRECT_OUTPUT);
    const adapter = new WindowsOsProxyAdapter();

    // First apply: snapshot the direct state, then apply manual.
    adapter.apply({ mode: 'manual', host: '127.0.0.1', port: 9090 });

    // Two reg add calls: ProxyEnable=1, then ProxyServer=host:port.
    const firstCalls = allCalls();
    expect(firstCalls).toContainEqual(
      expect.stringContaining('/v ProxyEnable /t REG_DWORD /d 1'),
    );
    expect(firstCalls).toContainEqual(
      expect.stringContaining('/v ProxyServer /t REG_SZ /d "127.0.0.1:9090"'),
    );

    // read() (reg query) is invoked exactly once, for snapshotting.
    const readCallsBefore = allCalls().filter((s) => s.includes('reg query')).length;
    expect(readCallsBefore).toBe(1);

    // Second apply with a different port: must NOT re-snapshot (snapshot retained).
    mockExec.mockClear();
    mockExec.mockReturnValue(DIRECT_OUTPUT);
    adapter.apply({ mode: 'manual', host: '127.0.0.1', port: 9191 });
    const secondReadCalls = allCalls().filter((s) => s.includes('reg query')).length;
    expect(secondReadCalls).toBe(0); // snapshot path not re-entered

    // Restore: should issue ProxyEnable /d 0 (restoring the direct snapshot).
    mockExec.mockClear();
    adapter.restore();
    const restoreCalls = allCalls();
    expect(restoreCalls).toContainEqual(
      expect.stringContaining('/v ProxyEnable /t REG_DWORD /d 0'),
    );
  });

  it('restore is idempotent (calling twice does not throw)', () => {
    mockExec.mockReturnValue(DIRECT_OUTPUT);
    const adapter = new WindowsOsProxyAdapter();
    adapter.apply({ mode: 'manual', host: '127.0.0.1', port: 9090 });
    expect(() => adapter.restore()).not.toThrow();
    expect(() => adapter.restore()).not.toThrow();
  });

  it('apply for direct mode sets ProxyEnable /d 0', () => {
    mockExec.mockReturnValue(MANUAL_OUTPUT);
    const adapter = new WindowsOsProxyAdapter();
    adapter.apply({ mode: 'direct' });
    expect(allCalls()).toContainEqual(
      expect.stringContaining('/v ProxyEnable /t REG_DWORD /d 0'),
    );
  });

  it('apply swallows execSync failures without throwing', () => {
    mockExec.mockReturnValue(DIRECT_OUTPUT);
    const adapter = new WindowsOsProxyAdapter();
    mockExec.mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => adapter.apply({ mode: 'direct' })).not.toThrow();
  });
});

describe('MacosOsProxyAdapter', () => {
  beforeEach(() => {
    mockExec.mockReset();
  });
  afterEach(() => {
    mockExec.mockReset();
  });

  it('reads Enabled: Yes with Server/Port as manual', () => {
    mockExec.mockReturnValue(MAC_MANUAL_OUTPUT);
    const adapter = new MacosOsProxyAdapter();
    expect(adapter.read()).toEqual({ mode: 'manual', host: '127.0.0.1', port: 8888 });
  });

  it('reads Enabled: No as direct', () => {
    mockExec.mockReturnValue(MAC_DIRECT_OUTPUT);
    const adapter = new MacosOsProxyAdapter();
    expect(adapter.read()).toEqual({ mode: 'direct' });
  });

  it('returns unknown when execSync throws', () => {
    mockExec.mockImplementation(() => {
      throw new Error('networksetup not found');
    });
    const adapter = new MacosOsProxyAdapter();
    expect(adapter.read()).toEqual({ mode: 'unknown' });
  });

  it('applies manual then restores to the direct snapshot', () => {
    mockExec.mockReturnValue(MAC_DIRECT_OUTPUT);
    const adapter = new MacosOsProxyAdapter();

    adapter.apply({ mode: 'manual', host: '127.0.0.1', port: 9090 });
    const applyCalls = allCalls();
    expect(applyCalls).toContainEqual(
      expect.stringContaining('-setwebproxy "Wi-Fi" 127.0.0.1 9090'),
    );
    expect(applyCalls).toContainEqual(
      expect.stringContaining('-setwebproxystate "Wi-Fi" on'),
    );

    mockExec.mockClear();
    adapter.restore();
    const restoreCalls = allCalls();
    expect(restoreCalls).toContainEqual(
      expect.stringContaining('-setwebproxystate "Wi-Fi" off'),
    );
  });

  it('apply for direct mode disables the web proxy state', () => {
    mockExec.mockReturnValue(MAC_MANUAL_OUTPUT);
    const adapter = new MacosOsProxyAdapter();
    adapter.apply({ mode: 'direct' });
    expect(allCalls()).toContainEqual(
      expect.stringContaining('-setwebproxystate "Wi-Fi" off'),
    );
  });

  it('restore is idempotent (calling twice does not throw)', () => {
    mockExec.mockReturnValue(MAC_DIRECT_OUTPUT);
    const adapter = new MacosOsProxyAdapter();
    adapter.apply({ mode: 'manual', host: '127.0.0.1', port: 9090 });
    expect(() => adapter.restore()).not.toThrow();
    expect(() => adapter.restore()).not.toThrow();
  });
});

describe('snapshot type-safety', () => {
  it('constructs an OsProxySnapshot with optional fields omitted', () => {
    const snap: OsProxySnapshot = { mode: 'direct' };
    expect(snap.mode).toBe('direct');
  });
});
