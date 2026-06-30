import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { platform, release } from 'node:os';
import { dirname, join } from 'node:path';
import { getAppHome } from '../paths.js';
import {
  CLAUDE_DESKTOP_REQUIRED_HOSTS,
  createClaudeDesktopVerificationResult,
  type VerificationHostResult,
  type VerificationResult,
} from './verify.js';
import { CLAUDE_DESKTOP_TARGET } from './claude-target.js';
import type { DesktopAppVersionTuple } from './app-targets.js';

export interface ClaudeNativeVerificationStore {
  readonly schemaVersion: 1;
  readonly result: VerificationResult;
}

export function getClaudeNativeVerificationPath(): string {
  return join(getAppHome(), 'desktop-interception', 'claude-desktop-verification.json');
}

export function loadClaudeNativeVerification(): VerificationResult | undefined {
  const path = getClaudeNativeVerificationPath();
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as ClaudeNativeVerificationStore;
    return parsed?.schemaVersion === 1 ? parsed.result : undefined;
  } catch {
    return undefined;
  }
}

export function saveClaudeNativeVerification(result: VerificationResult): void {
  const path = getClaudeNativeVerificationPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, result }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

export function currentClaudeNativeTuple(): DesktopAppVersionTuple {
  return {
    appName: CLAUDE_DESKTOP_TARGET.appName,
    appVersion: 'unknown',
    osName: platform(),
    osVersion: release(),
    supportHosts: CLAUDE_DESKTOP_REQUIRED_HOSTS,
    trustMechanism: trustMechanismForPlatform(),
    proxyMechanism: proxyMechanismForPlatform(),
  };
}

export function recordedClaudeNativeTuple(result: VerificationResult): DesktopAppVersionTuple {
  return {
    appName: CLAUDE_DESKTOP_TARGET.appName,
    appVersion: result.appVersion ?? 'unknown',
    osName: result.osName,
    osVersion: result.osVersion,
    supportHosts: CLAUDE_DESKTOP_REQUIRED_HOSTS,
    trustMechanism: trustMechanismForPlatform(),
    proxyMechanism: proxyMechanismForPlatform(),
  };
}

export function createObservedClaudeNativeVerification(input: {
  readonly observedHosts: Iterable<string>;
  readonly appVersion?: string;
  readonly installed?: boolean;
}): VerificationResult {
  const observed = new Set([...input.observedHosts].map(host => host.toLowerCase()));
  const hosts: VerificationHostResult[] = CLAUDE_DESKTOP_REQUIRED_HOSTS.map(host => ({
    host,
    state: observed.has(host) ? 'interceptable' : 'not_observed',
  }));
  return createClaudeDesktopVerificationResult({
    osName: platform(),
    osVersion: release(),
    appVersion: input.appVersion,
    installed: input.installed ?? observed.size > 0,
    evidenceSource: 'live',
    proxyHonored: hosts.some(host => host.state === 'interceptable'),
    trustHonored: hosts.some(host => host.state === 'interceptable'),
    hosts,
  });
}

function trustMechanismForPlatform(): string {
  if (platform() === 'win32') return 'windows-user-root-ca';
  if (platform() === 'darwin') return 'macos-user-keychain';
  return 'unsupported';
}

function proxyMechanismForPlatform(): string {
  if (platform() === 'win32') return 'windows-user-proxy';
  if (platform() === 'darwin') return 'macos-network-proxy';
  return 'unsupported';
}
