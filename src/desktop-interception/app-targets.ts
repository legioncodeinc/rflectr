export interface DesktopAppVersionTuple {
  readonly appName: string;
  readonly appVersion: string;
  readonly osName: string;
  readonly osVersion: string;
  readonly supportHosts?: readonly string[];
  readonly trustMechanism?: string;
  readonly proxyMechanism?: string;
}

export interface DesktopAppTarget {
  readonly appName: string;
  readonly supportedHosts: readonly string[];
}

export function isVerificationStale(
  recorded: DesktopAppVersionTuple | undefined,
  current: DesktopAppVersionTuple,
): boolean {
  if (!recorded) return true;
  return recorded.appName !== current.appName
    || recorded.appVersion !== current.appVersion
    || recorded.osName !== current.osName
    || recorded.osVersion !== current.osVersion
    || normalizeList(recorded.supportHosts).join('\0') !== normalizeList(current.supportHosts).join('\0')
    || normalizeString(recorded.trustMechanism) !== normalizeString(current.trustMechanism)
    || normalizeString(recorded.proxyMechanism) !== normalizeString(current.proxyMechanism);
}

function normalizeList(values: readonly string[] | undefined): string[] {
  return [...(values ?? [])].map(value => value.trim().toLowerCase()).filter(Boolean).sort();
}

function normalizeString(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}
