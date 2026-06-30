import { rmSync, statSync } from 'node:fs';
import { platform } from 'node:os';
import { normalize, sep } from 'node:path';
import type { NativeInstallState } from './state.js';
import { emptyInstallState, summarizeInstallState } from './state.js';
import type { OsProxyAdapter } from './os-proxy.js';

export type TrustActionStatus =
  | 'blocked'
  | 'unsupported'
  | 'verification_required'
  | 'not_owned'
  | 'noop'
  | 'ready';

export interface ConsentRecord {
  readonly action: 'install' | 'uninstall';
  readonly consentedAt: string;
}

export interface TrustActionResult {
  readonly status: TrustActionStatus;
  readonly reason: string;
  readonly installState: NativeInstallState;
  readonly manualRecovery?: {
    readonly installId?: string;
    readonly affectedSettings: readonly string[];
    readonly checklist: readonly string[];
  };
}

export interface PrivateKeyStorageCheck {
  readonly ok: boolean;
  readonly path: string;
  readonly reason?: string;
}

export function planInstallWithoutMutation(options: {
  readonly consent?: ConsentRecord;
  readonly verified: boolean;
  readonly osName?: string;
  readonly installState?: NativeInstallState;
}): TrustActionResult {
  const installState = options.installState ?? emptyInstallState();
  if (!options.consent || options.consent.action !== 'install') {
    return { status: 'blocked', reason: 'consent_required', installState };
  }
  if (!options.verified) {
    if (options.osName === 'unsupported') {
      return { status: 'unsupported', reason: 'unsupported', installState };
    }
    return {
      status: options.osName === 'darwin' ? 'verification_required' : 'verification_required',
      reason: 'verification_required',
      installState,
    };
  }
  return { status: 'ready', reason: 'ready_for_os_adapter', installState };
}

export function planUninstallWithoutMutation(options: {
  readonly installState: NativeInstallState;
  readonly consent?: ConsentRecord;
}): TrustActionResult {
  if (!options.consent || options.consent.action !== 'uninstall') {
    return { status: 'blocked', reason: 'consent_required', installState: options.installState };
  }
  if (!options.installState.caPresent && !options.installState.caTrusted && !options.installState.proxyConfigured && options.installState.ownedFilePaths.length === 0) {
    return { status: 'noop', reason: 'owned_state_not_present', installState: options.installState };
  }
  if (options.installState.proxyOwnerInstallId !== options.installState.installId) {
    return {
      status: 'not_owned',
      reason: 'ownership_unproven',
      installState: options.installState,
      manualRecovery: {
        installId: options.installState.installId,
        affectedSettings: options.installState.ownedFilePaths,
        checklist: [
          'Confirm the proxy or trust setting was created by this rflectr install id.',
          'Remove only the listed owned files/settings.',
          'Leave unrelated user proxy and trust settings untouched.',
        ],
      },
    };
  }
  const unprovenPath = options.installState.ownedFilePaths.find(path => !isRflectrOwnedDesktopPath(path));
  if (unprovenPath) {
    return {
      status: 'not_owned',
      reason: 'owned_artifact_path_unproven',
      installState: options.installState,
      manualRecovery: {
        installId: options.installState.installId,
        affectedSettings: [unprovenPath],
        checklist: [
          'Confirm the artifact is inside the rflectr desktop-interception state directory.',
          'Remove it manually only if it is known to belong to this rflectr install id.',
          'Leave unrelated user files, proxy settings, and trust settings untouched.',
        ],
      },
    };
  }
  return { status: 'ready', reason: 'ready_for_owned_uninstall', installState: options.installState };
}

export function idempotentStopState(active: boolean): TrustActionResult {
  return {
    status: active ? 'ready' : 'noop',
    reason: active ? 'runtime_active' : 'runtime_not_active',
    installState: emptyInstallState(),
  };
}

export async function uninstallOwnedNativeState(options: {
  readonly installState: NativeInstallState;
  readonly consent?: ConsentRecord;
  readonly proxyAdapter?: OsProxyAdapter;
  readonly removeArtifacts?: boolean;
}): Promise<TrustActionResult> {
  const planned = planUninstallWithoutMutation({
    installState: options.installState,
    consent: options.consent,
  });
  if (planned.status !== 'ready') return planned;

  if (options.installState.proxyConfigured) {
    if (!options.proxyAdapter?.restore) {
      return {
        status: 'unsupported',
        reason: 'proxy_restore_adapter_missing',
        installState: options.installState,
      };
    }
    await options.proxyAdapter.restore({ mode: 'direct' });
  }

  if (options.removeArtifacts !== false) {
    for (const path of options.installState.ownedFilePaths) {
      if (isRflectrOwnedDesktopPath(path, options.installState.installId)) {
        rmSync(path, { force: true, recursive: false });
      }
    }
  }

  return {
    status: 'ready',
    reason: 'owned_state_removed',
    installState: emptyInstallState(options.installState.installId),
  };
}

export function checkPrivateKeyStorage(path: string, permissionsValidated = false): PrivateKeyStorageCheck {
  if (platform() === 'win32') {
    return permissionsValidated
      ? { ok: true, path }
      : { ok: false, path, reason: 'windows_acl_validation_required' };
  }

  const stats = statSync(path);
  const mode = stats.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    return { ok: false, path, reason: 'private_key_group_or_world_readable' };
  }
  return { ok: true, path };
}

export function trustStatusDto(state: NativeInstallState) {
  return summarizeInstallState(state);
}

export function isRflectrOwnedDesktopPath(path: string, installId?: string): boolean {
  const normalized = normalize(path).replace(/[\\/]+/g, sep).toLowerCase();
  const marker = `${sep}.rflectr${sep}desktop-interception${sep}`;
  if (!normalized.includes(marker)) return false;
  return installId ? normalized.includes(`${marker}${installId.toLowerCase()}${sep}`) : true;
}
