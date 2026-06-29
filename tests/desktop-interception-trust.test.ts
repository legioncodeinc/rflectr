import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkPrivateKeyStorage, planInstallWithoutMutation, planUninstallWithoutMutation, trustStatusDto, uninstallOwnedNativeState } from '../src/desktop-interception/trust.js';
import { detectRecoverablePartialState, emptyInstallState } from '../src/desktop-interception/state.js';

describe('desktop interception trust planning', () => {
  it('blocks install without consent and does not report mutation-ready state', () => {
    const result = planInstallWithoutMutation({ verified: true });

    expect(result.status).toBe('blocked');
    expect(result.reason).toBe('consent_required');
    expect(trustStatusDto(result.installState)).toEqual({
      caPresent: false,
      caTrusted: false,
      proxyConfigured: false,
      proxyOwnerInstallId: undefined,
      recoverablePartialState: false,
    });
  });

  it('returns verification_required without partial installation', () => {
    const result = planInstallWithoutMutation({
      verified: false,
      osName: 'darwin',
      consent: { action: 'install', consentedAt: '2026-06-29T00:00:00.000Z' },
    });

    expect(result.status).toBe('verification_required');
    expect(result.installState.caPresent).toBe(false);
    expect(result.installState.proxyConfigured).toBe(false);
  });

  it('detects recoverable partial owned install state after interruption', () => {
    const partial = {
      ...emptyInstallState('rflectr-test-install'),
      caPresent: true,
      ownedFilePaths: ['C:/Users/test/.rflectr/desktop-interception/rflectr-test-install/ca-key.pem'],
    };

    expect(detectRecoverablePartialState(partial)).toBe(true);
    expect(detectRecoverablePartialState({
      ...partial,
      caTrusted: true,
      proxyConfigured: true,
      proxyOwnerInstallId: 'rflectr-test-install',
    })).toBe(false);
  });

  it('returns unsupported for explicitly unsupported install planning', () => {
    const result = planInstallWithoutMutation({
      verified: false,
      osName: 'unsupported',
      consent: { action: 'install', consentedAt: '2026-06-29T00:00:00.000Z' },
    });

    expect(result.status).toBe('unsupported');
    expect(result.reason).toBe('unsupported');
  });

  it('refuses uninstall when ownership cannot be proven', () => {
    const state = {
      ...emptyInstallState('rflectr-test-install'),
      caPresent: true,
      ownedFilePaths: ['C:/Users/test/.rflectr/desktop/ca-key.pem'],
    };

    const result = planUninstallWithoutMutation({
      installState: state,
      consent: { action: 'uninstall', consentedAt: '2026-06-29T00:00:00.000Z' },
    });

    expect(result.status).toBe('not_owned');
    expect(result.manualRecovery?.installId).toBe('rflectr-test-install');
    expect(result.manualRecovery?.checklist.join(' ')).toContain('unrelated user proxy');
  });

  it('refuses uninstall when owned artifact paths are outside rflectr desktop-interception state', () => {
    const state = {
      ...emptyInstallState('rflectr-test-install'),
      proxyOwnerInstallId: 'rflectr-test-install',
      ownedFilePaths: ['C:/Users/test/.rflectr/desktop/ca-key.pem'],
    };

    expect(planUninstallWithoutMutation({
      installState: state,
      consent: { action: 'uninstall', consentedAt: '2026-06-29T00:00:00.000Z' },
    })).toMatchObject({ status: 'not_owned', reason: 'owned_artifact_path_unproven' });
  });

  it('allows uninstall planning only for owned desktop-interception artifacts', () => {
    const state = {
      ...emptyInstallState('rflectr-test-install'),
      proxyOwnerInstallId: 'rflectr-test-install',
      ownedFilePaths: ['C:/Users/test/.rflectr/desktop-interception/ca-key.pem'],
    };

    expect(planUninstallWithoutMutation({
      installState: state,
      consent: { action: 'uninstall', consentedAt: '2026-06-29T00:00:00.000Z' },
    })).toMatchObject({ status: 'ready', reason: 'ready_for_owned_uninstall' });
  });

  it('executes owned uninstall cleanup without touching unowned or legacy state', async () => {
    const restored: unknown[] = [];
    const state = {
      ...emptyInstallState('rflectr-test-install'),
      proxyConfigured: true,
      proxyOwnerInstallId: 'rflectr-test-install',
      ownedFilePaths: ['C:/Users/test/.rflectr/desktop-interception/rflectr-test-install/ca-key.pem'],
    };

    const result = await uninstallOwnedNativeState({
      installState: state,
      consent: { action: 'uninstall', consentedAt: '2026-06-29T00:00:00.000Z' },
      removeArtifacts: false,
      proxyAdapter: {
        read: () => ({ mode: 'manual', host: '127.0.0.1', port: 1234, ownerInstallId: 'rflectr-test-install' }),
        restore: previous => { restored.push(previous); },
      },
    });

    expect(result).toMatchObject({
      status: 'ready',
      reason: 'owned_state_removed',
      installState: {
        installId: 'rflectr-test-install',
        proxyConfigured: false,
        caPresent: false,
      },
    });
    expect(restored).toEqual([{ mode: 'direct' }]);
  });
});

describe('desktop interception private-key storage checks', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('fails closed for group/world-readable private key files on POSIX', () => {
    if (process.platform === 'win32') return;
    dir = mkdtempSync(join(tmpdir(), 'rflectr-trust-'));
    const keyPath = join(dir, 'ca-key.pem');
    writeFileSync(keyPath, 'synthetic-private-key');
    chmodSync(keyPath, 0o644);

    expect(checkPrivateKeyStorage(keyPath)).toMatchObject({
      ok: false,
      reason: 'private_key_group_or_world_readable',
    });
  });

  it('requires explicit ACL validation on Windows', () => {
    if (process.platform !== 'win32') return;

    expect(checkPrivateKeyStorage('C:/Users/test/.rflectr/ca-key.pem')).toMatchObject({
      ok: false,
      reason: 'windows_acl_validation_required',
    });
    expect(checkPrivateKeyStorage('C:/Users/test/.rflectr/ca-key.pem', true)).toMatchObject({ ok: true });
  });
});
