import { join } from 'node:path';
import { z } from 'zod';
import type { DesktopEgressEntry, OwnedLoopbackEndpoint } from './egress.js';

const HostEntrySchema = z.object({
  host: z.string().min(1),
  label: z.string().min(1),
  reason: z.string().min(1),
  includeSubdomains: z.boolean().optional(),
});

const LoopbackSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  label: z.string().min(1),
});

const DesktopInterceptionConfigSchema = z.object({
  port: z.number().int().min(0).max(65535).default(0),
  host: z.literal('127.0.0.1').default('127.0.0.1'),
  closeTimeoutMs: z.number().int().min(1).max(30_000).default(5_000),
  caCertPath: z.string().optional(),
  caKeyPath: z.string().optional(),
  caKeyPermissionsValidated: z.boolean().default(false),
  installId: z.string().optional(),
  allowedHosts: z.array(HostEntrySchema).default([]),
  routingGatewayHosts: z.array(HostEntrySchema).default([]),
  routingEnabled: z.boolean().default(false),
  ownedLoopbackEndpoints: z.array(LoopbackSchema).default([]),
});

export type DesktopInterceptionConfig = z.infer<typeof DesktopInterceptionConfigSchema>;

export interface DesktopInterceptionConfigInput {
  readonly port?: number;
  readonly closeTimeoutMs?: number;
  readonly caCertPath?: string;
  readonly caKeyPath?: string;
  readonly caKeyPermissionsValidated?: boolean;
  readonly installId?: string;
  readonly allowedHosts?: readonly DesktopEgressEntry[];
  readonly routingGatewayHosts?: readonly DesktopEgressEntry[];
  readonly routingEnabled?: boolean;
  readonly ownedLoopbackEndpoints?: readonly OwnedLoopbackEndpoint[];
}

export function createDesktopInterceptionConfig(input: DesktopInterceptionConfigInput = {}): DesktopInterceptionConfig {
  return DesktopInterceptionConfigSchema.parse({
    ...input,
    host: '127.0.0.1',
  });
}

export function loadDesktopInterceptionConfig(env: NodeJS.ProcessEnv = process.env): DesktopInterceptionConfig {
  const home = env['RFLECTR_HOME'] ?? env['USERPROFILE'] ?? env['HOME'] ?? '.';
  const certDir = join(home, '.rflectr', 'desktop-interception');
  return createDesktopInterceptionConfig({
    port: parsePort(env['RFLECTR_DESKTOP_PROXY_PORT']),
    closeTimeoutMs: parseInteger(env['RFLECTR_DESKTOP_CLOSE_TIMEOUT_MS']),
    caCertPath: env['RFLECTR_DESKTOP_CA_CERT'] ?? join(certDir, 'ca-cert.pem'),
    caKeyPath: env['RFLECTR_DESKTOP_CA_KEY'] ?? join(certDir, 'ca-key.pem'),
    allowedHosts: parseHostEntries(env['RFLECTR_DESKTOP_ALLOWED_HOSTS'], 'desktop-target', 'target-app'),
    routingGatewayHosts: parseHostEntries(env['RFLECTR_DESKTOP_GATEWAY_HOSTS'], 'routing-gateway', 'routing'),
    routingEnabled: env['RFLECTR_DESKTOP_ROUTING'] === '1',
  });
}

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  return parseInteger(value);
}

function parseInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseHostEntries(value: string | undefined, label: string, reason: string): DesktopEgressEntry[] {
  if (!value) return [];
  return value
    .split(',')
    .map(host => host.trim())
    .filter(Boolean)
    .map(host => ({ host, label, reason }));
}
