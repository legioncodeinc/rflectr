import { randomUUID } from 'node:crypto';

export type NativeDesktopState =
  | 'not_installed'
  | 'transport_available'
  | 'verification_required'
  | 'not_verified'
  | 'install_blocked'
  | 'route_blocked'
  | 'installed'
  | 'running'
  | 'stop_pending'
  | 'uninstall_pending'
  | 'error';

export interface NativeInstallState {
  readonly installId: string;
  readonly caPresent: boolean;
  readonly caTrusted: boolean;
  readonly proxyConfigured: boolean;
  readonly proxyOwnerInstallId?: string;
  readonly recoverablePartialState: boolean;
  readonly ownedFilePaths: readonly string[];
  readonly installedAt?: string;
  readonly verifiedTarget?: {
    readonly appName: string;
    readonly appVersion: string;
    readonly osName: string;
    readonly osVersion: string;
  };
}

export interface NativeRuntimeState {
  readonly state: NativeDesktopState;
  readonly port?: number;
  readonly startedAt?: string;
  readonly lastError?: string;
}

export function createInstallId(): string {
  return `rflectr-${randomUUID()}`;
}

export function emptyInstallState(installId = createInstallId()): NativeInstallState {
  return {
    installId,
    caPresent: false,
    caTrusted: false,
    proxyConfigured: false,
    recoverablePartialState: false,
    ownedFilePaths: [],
  };
}

export function summarizeInstallState(state: NativeInstallState) {
  return {
    caPresent: state.caPresent,
    caTrusted: state.caTrusted,
    proxyConfigured: state.proxyConfigured,
    proxyOwnerInstallId: state.proxyOwnerInstallId,
    recoverablePartialState: state.recoverablePartialState,
  };
}

export function detectRecoverablePartialState(state: NativeInstallState): boolean {
  const hasAnyOwnedState = state.caPresent || state.caTrusted || state.proxyConfigured || state.ownedFilePaths.length > 0;
  const hasCompleteState = state.caPresent && state.caTrusted && state.proxyConfigured && state.proxyOwnerInstallId === state.installId;
  return hasAnyOwnedState && !hasCompleteState;
}
