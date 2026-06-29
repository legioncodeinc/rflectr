import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDesktopCa, loadDesktopCaPublicStatus, removeOwnedDesktopCa, resolveDesktopCaPaths } from '../src/desktop-interception/ca.js';

describe('desktop interception CA storage', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('creates a CA in an rflectr-owned per-install path without exposing private key material', () => {
    dir = mkdtempSync(join(tmpdir(), 'rflectr-ca-test-'));
    const baseDir = join(dir, '.rflectr', 'desktop-interception');
    const result = createDesktopCa({
      baseDir,
      installId: 'rflectr-test-install',
      windowsAclValidated: process.platform === 'win32',
    });

    expect(result.certPath).toContain('rflectr-test-install');
    expect(result.keyPath).toContain('rflectr-test-install');
    if (process.platform !== 'win32') {
      expect(statSync(result.keyPath).mode & 0o077).toBe(0);
    }
    const status = loadDesktopCaPublicStatus(result);
    expect(status).toMatchObject({
      installId: 'rflectr-test-install',
      caPresent: true,
      keyPresent: true,
      privateKeyMaterial: undefined,
    });
    expect(JSON.stringify(status)).not.toContain('PRIVATE KEY');
  });

  it('removes only owned CA artifacts', () => {
    dir = mkdtempSync(join(tmpdir(), 'rflectr-ca-test-'));
    const result = createDesktopCa({
      baseDir: join(dir, '.rflectr', 'desktop-interception'),
      installId: 'rflectr-test-install',
      windowsAclValidated: process.platform === 'win32',
    });

    expect(removeOwnedDesktopCa(result)).toBe(true);
    expect(statSync(dir).isDirectory()).toBe(true);
    expect(removeOwnedDesktopCa({
      ...resolveDesktopCaPaths(join(dir, 'outside'), 'rflectr-test-install'),
      keyPath: join(dir, 'outside', 'ca-key.pem'),
    })).toBe(false);
    expect(removeOwnedDesktopCa({
      ...result,
      baseDir: dir,
    })).toBe(false);
    expect(statSync(dir).isDirectory()).toBe(true);
  });
});
