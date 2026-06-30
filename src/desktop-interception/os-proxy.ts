import { execSync } from 'node:child_process';

export interface OsProxySnapshot {
  readonly mode: 'unknown' | 'direct' | 'manual';
  readonly host?: string;
  readonly port?: number;
  readonly ownerInstallId?: string;
}

export interface OsProxyAdapter {
  read(): Promise<OsProxySnapshot> | OsProxySnapshot;
  apply?(next: OsProxySnapshot): Promise<void> | void;
  restore?(previous: OsProxySnapshot): Promise<void> | void;
}

export const noopOsProxyAdapter: OsProxyAdapter = {
  read() {
    return { mode: 'unknown' };
  },
};

const WIN_INTERNET_SETTINGS =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
const WIN_READ_STDIO: ['pipe', 'pipe', 'pipe'] = ['pipe', 'pipe', 'pipe'];

/**
 * Proxy host/port values are interpolated into `reg`/`networksetup` shell
 * commands. `read()` pulls host from OS output via a `\S+` regex (which only
 * incidentally excludes whitespace) and `restore(previous)` accepts an external
 * snapshot, so neither source is a trusted constant. Reject anything outside a
 * strict hostname/IPv4/IPv6-hex character set (host) or integer port range so a
 * crafted or corrupted value can never break out of the argument. This guard is
 * load-bearing: the macOS `networksetup` interpolation is entirely unquoted.
 *
 * The surrounding apply()/restore() try/catch swallows the throw, so an unsafe
 * value fails closed (the command is simply not executed) rather than injecting.
 */
const SAFE_PROXY_HOST_RE = /^[A-Za-z0-9._:-]+$/;

function assertSafeProxyHost(host: unknown): asserts host is string {
  if (typeof host !== 'string' || !SAFE_PROXY_HOST_RE.test(host)) {
    throw new Error(`Refusing to interpolate unsafe proxy host into OS command: ${JSON.stringify(host)}`);
  }
}

function assertSafeProxyPort(port: unknown): asserts port is number {
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Refusing to interpolate unsafe proxy port into OS command: ${String(port)}`);
  }
}

/**
 * Windows adapter. Reads / writes the per-user WinINet proxy settings under
 * HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings via `reg`.
 */
export class WindowsOsProxyAdapter implements OsProxyAdapter {
  private snapshot?: OsProxySnapshot;

  read(): OsProxySnapshot {
    try {
      const out = execSync(`reg query "${WIN_INTERNET_SETTINGS}"`, {
        encoding: 'utf8',
        stdio: WIN_READ_STDIO,
      });
      const enableMatch = out.match(/ProxyEnable\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
      const enabled = enableMatch !== null && enableMatch[1] === '1';
      if (!enabled) {
        return { mode: 'direct' };
      }
      const serverMatch = out.match(/ProxyServer\s+REG_SZ\s+(\S+)/);
      if (serverMatch === null) {
        return { mode: 'manual' };
      }
      const [host, portStr] = serverMatch[1].split(':');
      const port = portStr !== undefined && portStr !== '' ? Number(portStr) : undefined;
      return {
        mode: 'manual',
        host,
        ...(port !== undefined ? { port } : {}),
      };
    } catch {
      // reg missing / query failed: surface as unknown so callers can react.
      return { mode: 'unknown' };
    }
  }

  apply(next: OsProxySnapshot): void {
    if (this.snapshot === undefined) {
      this.snapshot = this.read();
    }
    try {
      if (next.mode === 'manual' && next.host !== undefined && next.port !== undefined) {
        assertSafeProxyHost(next.host);
        assertSafeProxyPort(next.port);
        execSync(`reg add "${WIN_INTERNET_SETTINGS}" /v ProxyEnable /t REG_DWORD /d 1 /f`, {
          stdio: WIN_READ_STDIO,
        });
        execSync(
          `reg add "${WIN_INTERNET_SETTINGS}" /v ProxyServer /t REG_SZ /d "${next.host}:${next.port}" /f`,
          { stdio: WIN_READ_STDIO },
        );
      } else if (next.mode === 'direct') {
        execSync(`reg add "${WIN_INTERNET_SETTINGS}" /v ProxyEnable /t REG_DWORD /d 0 /f`, {
          stdio: WIN_READ_STDIO,
        });
      }
    } catch {
      // best-effort application; read() reports the resulting state.
    }
  }

  restore(previous?: OsProxySnapshot): void {
    const snap = previous ?? this.snapshot;
    if (snap === undefined) {
      return;
    }
    try {
      if (snap.mode === 'manual' && snap.host !== undefined && snap.port !== undefined) {
        assertSafeProxyHost(snap.host);
        assertSafeProxyPort(snap.port);
        execSync(`reg add "${WIN_INTERNET_SETTINGS}" /v ProxyEnable /t REG_DWORD /d 1 /f`, {
          stdio: WIN_READ_STDIO,
        });
        execSync(
          `reg add "${WIN_INTERNET_SETTINGS}" /v ProxyServer /t REG_SZ /d "${snap.host}:${snap.port}" /f`,
          { stdio: WIN_READ_STDIO },
        );
      } else if (snap.mode === 'direct') {
        execSync(`reg add "${WIN_INTERNET_SETTINGS}" /v ProxyEnable /t REG_DWORD /d 0 /f`, {
          stdio: WIN_READ_STDIO,
        });
      }
    } catch {
      // best-effort restore; idempotent.
    }
  }
}

/**
 * macOS adapter. Reads / writes the Wi-Fi web proxy via `networksetup`.
 */
export class MacosOsProxyAdapter implements OsProxyAdapter {
  private snapshot?: OsProxySnapshot;

  read(): OsProxySnapshot {
    try {
      const out = execSync('networksetup -getwebproxy "Wi-Fi"', { encoding: 'utf8' });
      const enabled = /Enabled:\s*Yes/i.test(out);
      if (!enabled) {
        return { mode: 'direct' };
      }
      const serverMatch = out.match(/Server:\s*(\S+)/);
      const portMatch = out.match(/Port:\s*(\d+)/);
      const host = serverMatch !== null ? serverMatch[1] : undefined;
      const port = portMatch !== null ? Number(portMatch[1]) : undefined;
      if (host === undefined) {
        return { mode: 'manual' };
      }
      return {
        mode: 'manual',
        host,
        ...(port !== undefined ? { port } : {}),
      };
    } catch {
      // networksetup missing / failed: surface as unknown.
      return { mode: 'unknown' };
    }
  }

  apply(next: OsProxySnapshot): void {
    if (this.snapshot === undefined) {
      this.snapshot = this.read();
    }
    try {
      if (next.mode === 'manual' && next.host !== undefined && next.port !== undefined) {
        assertSafeProxyHost(next.host);
        assertSafeProxyPort(next.port);
        execSync(`networksetup -setwebproxy "Wi-Fi" ${next.host} ${next.port}`, {
          stdio: WIN_READ_STDIO,
        });
        execSync('networksetup -setwebproxystate "Wi-Fi" on', { stdio: WIN_READ_STDIO });
      } else if (next.mode === 'direct') {
        execSync('networksetup -setwebproxystate "Wi-Fi" off', { stdio: WIN_READ_STDIO });
      }
    } catch {
      // best-effort application; read() reports the resulting state.
    }
  }

  restore(previous?: OsProxySnapshot): void {
    const snap = previous ?? this.snapshot;
    if (snap === undefined) {
      return;
    }
    try {
      if (snap.mode === 'manual' && snap.host !== undefined && snap.port !== undefined) {
        assertSafeProxyHost(snap.host);
        assertSafeProxyPort(snap.port);
        execSync(`networksetup -setwebproxy "Wi-Fi" ${snap.host} ${snap.port}`, {
          stdio: WIN_READ_STDIO,
        });
        execSync('networksetup -setwebproxystate "Wi-Fi" on', { stdio: WIN_READ_STDIO });
      } else if (snap.mode === 'direct') {
        execSync('networksetup -setwebproxystate "Wi-Fi" off', { stdio: WIN_READ_STDIO });
      }
    } catch {
      // best-effort restore; idempotent.
    }
  }
}

/**
 * Returns the OS proxy adapter appropriate for the current platform:
 * WindowsOsProxyAdapter on win32, MacosOsProxyAdapter on darwin, noop otherwise.
 */
export function createOsProxyAdapter(): OsProxyAdapter {
  if (process.platform === 'win32') {
    return new WindowsOsProxyAdapter();
  }
  if (process.platform === 'darwin') {
    return new MacosOsProxyAdapter();
  }
  return noopOsProxyAdapter;
}
