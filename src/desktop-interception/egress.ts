import { domainToASCII } from 'node:url';
import ipaddr from 'ipaddr.js';
import type { HeaderMap } from './redaction.js';

export type DesktopEgressEntry =
  | {
      readonly host: string;
      readonly label: string;
      readonly reason: string;
      readonly includeSubdomains?: false;
    }
  | {
      readonly host: string;
      readonly label: string;
      readonly reason: string;
      readonly includeSubdomains: true;
    };

export interface OwnedLoopbackEndpoint {
  readonly host: string;
  readonly port: number;
  readonly label: string;
}

export interface DesktopEgressConfig {
  readonly allowedHosts?: readonly DesktopEgressEntry[];
  readonly routingGatewayHosts?: readonly DesktopEgressEntry[];
  readonly routingEnabled?: boolean;
  readonly ownedLoopbackEndpoints?: readonly OwnedLoopbackEndpoint[];
}

export interface DesktopEgressStatus {
  readonly allowedHosts: Array<{ host: string; label: string; reason: string; includeSubdomains: boolean }>;
  readonly lastDenied?: {
    readonly host: string;
    readonly port: number;
    readonly reason: string;
  };
}

export interface CanonicalDestination {
  readonly scheme: string;
  readonly host: string;
  readonly port: number;
  readonly isIpLiteral: boolean;
  readonly isLoopback: boolean;
}

export type DesktopEgressDecision =
  | {
      readonly allowed: true;
      readonly reason: string;
      readonly targetApp: string;
      readonly destination: CanonicalDestination;
    }
  | {
      readonly allowed: false;
      readonly reason: string;
      readonly targetApp?: string;
      readonly destination: CanonicalDestination;
    };

export interface LeakAttemptInput {
  readonly destination: CanonicalDestination;
  readonly method?: string;
  readonly path?: string;
  readonly headers?: HeaderMap;
  readonly bodyPreview?: string;
  readonly app?: string;
  readonly reason: string;
}

interface NormalizedEntry {
  readonly host: string;
  readonly label: string;
  readonly reason: string;
  readonly includeSubdomains: boolean;
}

export class DesktopEgress {
  private readonly allowedHosts: readonly NormalizedEntry[];
  private readonly ownedLoopback: readonly OwnedLoopbackEndpoint[];
  private lastDenied?: DesktopEgressStatus['lastDenied'];

  constructor(config: DesktopEgressConfig = {}) {
    const hosts = [...(config.allowedHosts ?? [])];
    if (config.routingEnabled) hosts.push(...(config.routingGatewayHosts ?? []));

    this.allowedHosts = hosts.map(entry => ({
      host: canonicalizeHost(entry.host),
      label: entry.label,
      reason: entry.reason,
      includeSubdomains: entry.includeSubdomains === true,
    }));
    this.ownedLoopback = (config.ownedLoopbackEndpoints ?? []).map(endpoint => ({
      ...endpoint,
      host: canonicalizeHost(endpoint.host),
    }));
  }

  allowedHostLabels(): Array<{ host: string; label: string; reason: string; includeSubdomains: boolean }> {
    return this.allowedHosts.map(entry => ({ ...entry })).sort((a, b) => a.host.localeCompare(b.host));
  }

  status(): DesktopEgressStatus {
    return {
      allowedHosts: this.allowedHostLabels(),
      lastDenied: this.lastDenied ? { ...this.lastDenied } : undefined,
    };
  }

  check(input: string | URL): DesktopEgressDecision {
    const destination = canonicalizeDestination(input);

    if (destination.isLoopback) {
      const owned = this.ownedLoopback.find(endpoint => (
        endpoint.host === destination.host && endpoint.port === destination.port
      ));
      if (owned) {
        return { allowed: true, reason: 'owned-loopback', targetApp: owned.label, destination };
      }
      this.recordDenied(destination, 'loopback-not-owned');
      return { allowed: false, reason: 'loopback-not-owned', destination };
    }

    if (destination.isIpLiteral) {
      this.recordDenied(destination, 'ip-literal-denied');
      return { allowed: false, reason: 'ip-literal-denied', destination };
    }

    for (const entry of this.allowedHosts) {
      if (destination.host === entry.host || (
        entry.includeSubdomains && destination.host.endsWith(`.${entry.host}`)
      )) {
        return {
          allowed: true,
          reason: entry.reason,
          targetApp: entry.label,
          destination,
        };
      }
    }

    this.recordDenied(destination, 'not-on-allowlist');
    return { allowed: false, reason: 'not-on-allowlist', destination };
  }

  private recordDenied(destination: CanonicalDestination, reason: string): void {
    this.lastDenied = { host: destination.host, port: destination.port, reason };
  }
}

export function canonicalizeDestination(input: string | URL): CanonicalDestination {
  const url = input instanceof URL ? input : parseDestination(input);
  const scheme = url.protocol.replace(/:$/, '').toLowerCase();
  const host = canonicalizeHost(url.hostname);
  const defaultPort = scheme === 'http' ? 80 : 443;
  const port = url.port ? Number.parseInt(url.port, 10) : defaultPort;
  const isIpLiteral = ipaddr.isValid(host);

  return {
    scheme,
    host,
    port,
    isIpLiteral,
    isLoopback: isIpLiteral ? ipaddr.parse(host).range() === 'loopback' : host === 'localhost',
  };
}

export function canonicalizeHost(host: string): string {
  const trimmed = host.trim().replace(/\.$/, '').toLowerCase();
  const withoutBrackets = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;
  return domainToASCII(withoutBrackets) || withoutBrackets;
}

export function formatLeakAttempt(input: LeakAttemptInput): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level: 'warn',
    component: 'rflectr-desktop',
    event: 'egress.leak_attempt',
    app: input.app ?? 'desktop',
    reason: input.reason,
    destination: {
      scheme: input.destination.scheme,
      host: input.destination.host,
      port: input.destination.port,
    },
    request: {
      method: input.method,
    },
  });
}

function parseDestination(input: string): URL {
  try {
    return new URL(input);
  } catch {
    return new URL(`https://${input}`);
  }
}
