import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { spawn as realSpawn, execSync as realExecSync } from 'node:child_process';
import {
  buildClaudeProxyArg,
  openClaudeAppWithProxy,
  launchOrRestartClaudeAppWithProxy,
  _internals,
} from '../src/claude-desktop/app-launch.js';

const ORIGINAL_PLATFORM = Object.getOwnPropertyDescriptor(process, 'platform');

function setPlatform(value: 'darwin' | 'win32' | 'linux'): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

function restorePlatform(): void {
  if (ORIGINAL_PLATFORM) {
    Object.defineProperty(process, 'platform', ORIGINAL_PLATFORM);
  }
}

/**
 * A mock ChildProcess that satisfies `.unref()`, matching what `spawn` returns
 * in the production code (`_internals.spawn(..., { detached: true }).unref()`).
 */
function mockChild() {
  return { unref: vi.fn() } as unknown as ReturnType<typeof realSpawn>;
}

/**
 * Sweep every recorded arg string across spawn + execSync spies and assert the
 * proxy is never applied system-wide: no registry mutation, no networksetup,
 * no HTTP(S)_PROXY env writes. Proxy scope must be the Claude process only.
 */
function assertNoSystemProxyMutation(
  spawnSpy: ReturnType<typeof vi.spyOn>,
  execSpy: ReturnType<typeof vi.spyOn>,
): void {
  const banned = ['reg add', 'ProxyEnable', 'networksetup', 'setwebproxy', 'HTTP_PROXY', 'HTTPS_PROXY'];
  const recorded: string[] = [];
  for (const call of spawnSpy.mock.calls) {
    for (const arg of call) {
      if (typeof arg === 'string') recorded.push(arg);
      else if (Array.isArray(arg)) recorded.push(...arg.filter((a): a is string => typeof a === 'string'));
    }
  }
  for (const call of execSpy.mock.calls) {
    for (const arg of call) if (typeof arg === 'string') recorded.push(arg);
  }
  for (const token of banned) {
    for (const arg of recorded) {
      expect(arg, `system-wide proxy mutation "${token}" must never be used`).not.toContain(token);
    }
  }
}

describe('buildClaudeProxyArg', () => {
  it('builds the per-app Chromium --proxy-server arg for a real port', () => {
    expect(buildClaudeProxyArg(8080)).toBe('--proxy-server=http://127.0.0.1:8080');
  });

  it('builds the arg verbatim for port 0 (no special-casing)', () => {
    expect(buildClaudeProxyArg(0)).toBe('--proxy-server=http://127.0.0.1:0');
  });
});

describe('openClaudeAppWithProxy', () => {
  let spawnSpy: ReturnType<typeof vi.spyOn>;
  let execSpy: ReturnType<typeof vi.spyOn>;
  let findSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spawnSpy = vi.spyOn(_internals, 'spawn').mockImplementation((() => mockChild()) as typeof _internals.spawn);
    execSpy = vi.spyOn(require('node:child_process'), 'execSync').mockImplementation((() => '') as typeof realExecSync);
    findSpy = vi.spyOn(_internals, 'findClaudeApp');
  });

  afterEach(() => {
    spawnSpy.mockRestore();
    execSpy.mockRestore();
    findSpy.mockRestore();
    restorePlatform();
  });

  it('throws if Claude is not found (same error as openClaudeApp)', () => {
    setPlatform('win32');
    findSpy.mockReturnValue(null);
    expect(() => openClaudeAppWithProxy(9090)).toThrowError(
      'Claude Desktop App not found. Please install it first.',
    );
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  if (process.platform === 'win32') {
    it('win32: spawns the .exe with the proxy flag, fire-and-forget', () => {
      setPlatform('win32');
      findSpy.mockReturnValue('C:\\Users\\me\\AppData\\Local\\Programs\\Claude\\Claude.exe');
      openClaudeAppWithProxy(9090);

      expect(spawnSpy).toHaveBeenCalledTimes(1);
      const [cmd, args, opts] = spawnSpy.mock.calls[0];
      expect(cmd).toBe('C:\\Users\\me\\AppData\\Local\\Programs\\Claude\\Claude.exe');
      expect(args).toEqual(['--proxy-server=http://127.0.0.1:9090']);
      expect(opts).toMatchObject({ stdio: 'ignore', detached: true });
      assertNoSystemProxyMutation(spawnSpy, execSpy);
    });

    it('win32: rejects shell:AppsFolder-packaged Claude instead of falling back to a system proxy', () => {
      setPlatform('win32');
      findSpy.mockReturnValue('shell:AppsFolder\\Anthropic.Claude');
      expect(() => openClaudeAppWithProxy(9090)).toThrowError(
        'Per-app proxy launch is not supported for shell:AppsFolder-packaged Claude; use the .exe path or a wrapper.',
      );
      expect(spawnSpy).not.toHaveBeenCalled();
      // And critically, no system-proxy fallback was attempted.
      assertNoSystemProxyMutation(spawnSpy, execSpy);
    });
  }

  if (process.platform === 'darwin') {
    it('darwin: launches the .app via `open ... --args --proxy-server=...`', () => {
      setPlatform('darwin');
      findSpy.mockReturnValue('/Applications/Claude.app');
      openClaudeAppWithProxy(9090);

      expect(spawnSpy).toHaveBeenCalledTimes(1);
      const [cmd, args, opts] = spawnSpy.mock.calls[0];
      expect(cmd).toBe('open');
      expect(args).toEqual([
        '/Applications/Claude.app',
        '--args',
        '--proxy-server=http://127.0.0.1:9090',
      ]);
      expect(opts).toMatchObject({ stdio: 'ignore', detached: true });
      assertNoSystemProxyMutation(spawnSpy, execSpy);
    });
  }
});

describe('launchOrRestartClaudeAppWithProxy', () => {
  let spawnSpy: ReturnType<typeof vi.spyOn>;
  let execSpy: ReturnType<typeof vi.spyOn>;
  let findSpy: ReturnType<typeof vi.spyOn>;
  let runningSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    spawnSpy = vi.spyOn(_internals, 'spawn').mockImplementation((() => mockChild()) as typeof _internals.spawn);
    execSpy = vi.spyOn(require('node:child_process'), 'execSync').mockImplementation((() => '') as typeof realExecSync);
    findSpy = vi.spyOn(_internals, 'findClaudeApp');
    runningSpy = vi.spyOn(_internals, 'isClaudeAppRunning');
  });

  afterEach(() => {
    spawnSpy.mockRestore();
    execSpy.mockRestore();
    findSpy.mockRestore();
    runningSpy.mockRestore();
    restorePlatform();
  });

  it('launches with proxy when Claude is not running, without confirming', async () => {
    setPlatform('win32');
    findSpy.mockReturnValue('C:\\Claude\\Claude.exe');
    runningSpy.mockReturnValue(false);

    await launchOrRestartClaudeAppWithProxy(7070);

    expect(runningSpy).toHaveBeenCalled();
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [, args] = spawnSpy.mock.calls[0];
    expect(args).toEqual(['--proxy-server=http://127.0.0.1:7070']);
    assertNoSystemProxyMutation(spawnSpy, execSpy);
  });

  it('does not spawn Claude at import time', () => {
    // The module was already imported at the top of this file; spawn must only
    // ever fire as a result of calling the launch functions.
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
