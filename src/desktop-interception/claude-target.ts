import { findClaudeApp } from '../claude-desktop/app-launch.js';
import { canonicalizeHost } from './egress.js';
import {
  CLAUDE_DESKTOP_REQUIRED_HOSTS,
  createClaudeDesktopVerificationResult,
  staleVerificationResult,
  type VerificationHostResult,
  type VerificationResult,
  type VerificationSupportState,
} from './verify.js';
import type { DesktopAppVersionTuple } from './app-targets.js';

export const CLAUDE_DESKTOP_TARGET = {
  appName: 'Claude Desktop',
  supportedHosts: [...CLAUDE_DESKTOP_REQUIRED_HOSTS],
  inferencePath: '/v1/messages',
} as const;

export type ClaudeNativeEnablementState =
  | 'native_supported'
  | 'legacy_fallback_available'
  | 'verification_required'
  | 'not_installed'
  | 'pinned_or_trust_refused';

export interface ClaudeDesktopDetection {
  readonly installed: boolean;
  readonly path: string | null;
}

export interface ClaudeNativeEnablementDecision {
  readonly state: ClaudeNativeEnablementState;
  readonly nativeEnabled: boolean;
  readonly legacyGatewayAvailable: boolean;
  readonly reason: string;
}

export function detectClaudeDesktopInstall(): ClaudeDesktopDetection {
  const path = findClaudeApp();
  return {
    installed: path !== null,
    path,
  };
}

export function isClaudeDesktopHost(host: string): boolean {
  const canonical = canonicalizeHost(host);
  return CLAUDE_DESKTOP_REQUIRED_HOSTS.some(required => canonical === required || canonical.endsWith(`.${required}`));
}

export function isClaudeDesktopInferenceRequest(input: {
  readonly host: string;
  readonly method: string;
  readonly path: string;
}): boolean {
  if (!isClaudeDesktopHost(input.host)) return false;
  if (input.method.toUpperCase() !== 'POST') return false;
  return input.path.split('?')[0] === CLAUDE_DESKTOP_TARGET.inferencePath;
}

export function createNotInstalledClaudeVerification(input: {
  readonly osName: string;
  readonly osVersion: string;
}): VerificationResult {
  return createClaudeDesktopVerificationResult({
    osName: input.osName,
    osVersion: input.osVersion,
    hosts: [],
    installed: false,
  });
}

export function createObservedClaudeVerification(input: {
  readonly osName: string;
  readonly osVersion: string;
  readonly appVersion?: string;
  readonly hosts: readonly VerificationHostResult[];
  readonly evidenceSource?: VerificationResult['evidenceSource'];
  readonly proxyHonored?: boolean;
  readonly trustHonored?: boolean;
}): VerificationResult {
  return createClaudeDesktopVerificationResult({
    osName: input.osName,
    osVersion: input.osVersion,
    appVersion: input.appVersion,
    hosts: input.hosts,
    installed: true,
    evidenceSource: input.evidenceSource,
    proxyHonored: input.proxyHonored,
    trustHonored: input.trustHonored,
  });
}

export function evaluateClaudeNativeEnablement(input: {
  readonly verification?: VerificationResult;
  readonly recorded?: DesktopAppVersionTuple;
  readonly current?: DesktopAppVersionTuple;
}): ClaudeNativeEnablementDecision {
  const supportState: VerificationSupportState | undefined = input.current
    ? staleVerificationResult(input.recorded, input.current)
    : input.verification?.supportState;

  const state = supportState ?? input.verification?.supportState;
  if (!state || state === 'stale') {
    return {
      state: 'verification_required',
      nativeEnabled: false,
      legacyGatewayAvailable: true,
      reason: 'Native interception requires a fresh Claude Desktop verification.',
    };
  }
  if (state === 'not_installed') {
    return {
      state: 'not_installed',
      nativeEnabled: false,
      legacyGatewayAvailable: true,
      reason: 'Claude Desktop is not installed.',
    };
  }
  if (state === 'pinned_or_trust_refused' || state === 'pinned' || state === 'proxy_ignored') {
    return {
      state: 'pinned_or_trust_refused',
      nativeEnabled: false,
      legacyGatewayAvailable: true,
      reason: 'Claude Desktop did not accept the local proxy/trust path.',
    };
  }
  if (state !== 'supported') {
    return {
      state: 'legacy_fallback_available',
      nativeEnabled: false,
      legacyGatewayAvailable: true,
      reason: 'Native interception is not fully verified for this app and OS.',
    };
  }
  return {
    state: 'native_supported',
    nativeEnabled: true,
    legacyGatewayAvailable: true,
    reason: 'Native interception is verified for this Claude Desktop target.',
  };
}
