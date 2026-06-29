import { REDACTED, redactHeaders, redactPath, type HeaderMap } from './redaction.js';
import { isVerificationStale, type DesktopAppVersionTuple } from './app-targets.js';

export type VerificationHostState = 'interceptable' | 'pinned' | 'proxy_ignored' | 'blocked' | 'not_observed';
export type VerificationEvidenceSource = 'live' | 'fixture' | 'docs';
export type VerificationSupportState = 'supported' | 'pinned_or_trust_refused' | 'pinned' | 'proxy_ignored' | 'incomplete_evidence' | 'not_installed' | 'stale';

export interface VerificationHostResult {
  readonly host: string;
  readonly state: VerificationHostState;
}

export interface VerificationPayloadSample {
  readonly method: string;
  readonly path: string;
  readonly headers: HeaderMap;
  readonly bodyPreview?: string;
}

export interface DebugCaptureConsent {
  readonly consentedAt: string;
  readonly allowPromptSamples: boolean;
}

export interface VerificationResult {
  readonly appName: string;
  readonly appVersion?: string;
  readonly osName: string;
  readonly osVersion: string;
  readonly verifiedAt: string;
  readonly evidenceSource: VerificationEvidenceSource;
  readonly hosts: readonly VerificationHostResult[];
  readonly supportState: VerificationSupportState;
  readonly enablementBlocked: boolean;
  readonly proxyHonored?: boolean;
  readonly trustHonored?: boolean;
  readonly samples: readonly VerificationPayloadSample[];
}

export const CLAUDE_DESKTOP_REQUIRED_HOSTS = ['api.anthropic.com', 'claude.ai'] as const;

export function createVerificationResult(input: {
  readonly appName: string;
  readonly appVersion?: string;
  readonly osName: string;
  readonly osVersion: string;
  readonly hosts: readonly VerificationHostResult[];
  readonly samples?: readonly VerificationPayloadSample[];
  readonly debugConsent?: DebugCaptureConsent;
  readonly installed?: boolean;
  readonly evidenceSource?: VerificationEvidenceSource;
  readonly proxyHonored?: boolean;
  readonly trustHonored?: boolean;
}): VerificationResult {
  const installed = input.installed !== false;
  const supportState = resolveSupportState(installed, input.hosts);
  return {
    appName: input.appName,
    appVersion: input.appVersion,
    osName: input.osName,
    osVersion: input.osVersion,
    verifiedAt: new Date().toISOString(),
    evidenceSource: input.evidenceSource ?? 'live',
    hosts: input.hosts,
    supportState,
    enablementBlocked: supportState !== 'supported',
    proxyHonored: input.proxyHonored,
    trustHonored: input.trustHonored,
    samples: sanitizeSamples(input.samples ?? [], input.debugConsent),
  };
}

export function staleVerificationResult(
  recorded: DesktopAppVersionTuple | undefined,
  current: DesktopAppVersionTuple,
): VerificationSupportState | undefined {
  return isVerificationStale(recorded, current) ? 'stale' : undefined;
}

export function createClaudeDesktopVerificationResult(input: Omit<Parameters<typeof createVerificationResult>[0], 'appName' | 'hosts'> & {
  readonly hosts: readonly VerificationHostResult[];
}): VerificationResult {
  const byHost = new Map(input.hosts.map(host => [host.host, host]));
  const hosts = CLAUDE_DESKTOP_REQUIRED_HOSTS.map(host => byHost.get(host) ?? {
    host,
    state: 'not_observed' as const,
  });
  return createVerificationResult({
    ...input,
    appName: 'Claude Desktop',
    hosts,
  });
}

export function sanitizeSamples(
  samples: readonly VerificationPayloadSample[],
  debugConsent?: DebugCaptureConsent,
): VerificationPayloadSample[] {
  return samples.map(sample => ({
    method: sample.method,
    path: redactPath(sample.path),
    headers: redactHeaders(sample.headers),
    bodyPreview: debugConsent?.allowPromptSamples && sample.bodyPreview ? REDACTED : undefined,
  }));
}

function resolveSupportState(installed: boolean, hosts: readonly VerificationHostResult[]): VerificationSupportState {
  if (!installed) return 'not_installed';
  if (hosts.some(host => host.state === 'pinned' || host.state === 'proxy_ignored')) return 'pinned_or_trust_refused';
  if (hosts.length === 0 || hosts.some(host => host.state === 'not_observed')) return 'incomplete_evidence';
  return hosts.every(host => host.state === 'interceptable') ? 'supported' : 'incomplete_evidence';
}
