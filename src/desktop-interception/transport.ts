import { Server as NetServer } from 'node:net';
import { getLocal, type CompletedRequest, type CompletedResponse, type Mockttp, type requestSteps } from 'mockttp';
import { createDesktopInterceptionConfig, type DesktopInterceptionConfig, type DesktopInterceptionConfigInput } from './config.js';
import { DesktopEgress, formatLeakAttempt } from './egress.js';
import {
  noopDesktopInterceptionHooks,
  redactRequestSnapshot,
  redactResponseSnapshot,
  type DesktopInterceptionHooks,
  type InterceptedRequest,
} from './hooks.js';
import { redactText } from './redaction.js';
import { checkPrivateKeyStorage, isRflectrOwnedDesktopPath } from './trust.js';

type CallbackRequestResult = requestSteps.CallbackRequestResult;

export interface DesktopInterceptionTransportStatus {
  readonly state: 'starting' | 'running' | 'stopped' | 'error';
  readonly port?: number;
  readonly allowedHosts: readonly string[];
  readonly egress: ReturnType<DesktopEgress['status']>;
  readonly lastError?: string;
}

export interface DesktopInterceptionTransport {
  readonly port: number;
  status(): DesktopInterceptionTransportStatus;
  close(): Promise<void>;
}

export interface DesktopInterceptionTransportOptions extends DesktopInterceptionConfigInput {
  readonly hooks?: DesktopInterceptionHooks;
  readonly config?: DesktopInterceptionConfig;
}

export async function startDesktopInterceptionTransport(
  options: DesktopInterceptionTransportOptions = {},
): Promise<DesktopInterceptionTransport> {
  const config = options.config ?? createDesktopInterceptionConfig(options);
  const hooks = options.hooks ?? noopDesktopInterceptionHooks;
  const egress = new DesktopEgress(config);
  const server = createMockttpServer(config);
  const pending = new Map<string, InterceptedRequest>();
  const status: {
    state: DesktopInterceptionTransportStatus['state'];
    port?: number;
    lastError?: string;
  } = { state: 'starting' };

  try {
    await startMockttpServerOnHost(server, config.port, config.host);
    status.state = 'running';
    status.port = server.port;

    await server.on('response', async (res: CompletedResponse) => {
      const intercepted = pending.get(res.id);
      if (!intercepted) return;
      pending.delete(res.id);
      const response = {
        status: res.statusCode,
        headers: res.headers,
        body: res.body.buffer,
        completedAt: new Date().toISOString(),
      };
      void hooks.afterResponse?.(redactRequestSnapshot(intercepted), redactResponseSnapshot(response));
      void hooks.onResponseComplete?.(intercepted, response);
    });

    await server.forAnyRequest().thenPassThrough({
      beforeRequest: async (req: CompletedRequest): Promise<CallbackRequestResult | void> => {
        const url = new URL(req.url);
        const decision = egress.check(url);
        const body = req.body.buffer;

        if (!decision.allowed) {
          process.stderr.write(formatLeakAttempt({
            destination: decision.destination,
            method: req.method,
            path: `${url.pathname}${url.search}`,
            headers: req.headers,
            app: 'desktop',
            reason: decision.reason,
          }) + '\n');
          return { response: { statusCode: 403, body: 'rflectr: egress denied' } };
        }

        const intercepted: InterceptedRequest = {
          app: decision.targetApp,
          host: decision.destination.host,
          port: decision.destination.port,
          method: req.method,
          path: `${url.pathname}${url.search}`,
          url: url.toString(),
          headers: req.headers,
          body,
        };

        const outcome = await hooks.beforeRequest(intercepted);
        if (outcome.action === 'deny') {
          return { response: { statusCode: 403, body: 'rflectr: request blocked' } };
        }
        if (outcome.action === 'respond') {
          return {
            response: {
              statusCode: outcome.response?.statusCode ?? 200,
              headers: sanitizeReplacementHeaders(outcome.response?.headers ?? {}),
              rawBody: typeof outcome.response?.body === 'string'
                ? Buffer.from(outcome.response.body)
                : outcome.response?.body,
            },
          };
        }

        const routedRequest = outcome.body ? { ...intercepted, body: outcome.body } : intercepted;
        pending.set(req.id, routedRequest);

        const patch: Record<string, unknown> = {};
        if (outcome.body) patch['rawBody'] = outcome.body;
        if (outcome.headers) patch['headers'] = sanitizeReplacementHeaders(outcome.headers);
        if (outcome.upstreamUrl) patch['url'] = outcome.upstreamUrl;
        return patch;
      },
    });

    return {
      port: server.port,
      status: () => ({
        state: status.state,
        port: status.port,
        allowedHosts: egress.allowedHostLabels().map(entry => entry.host),
        egress: egress.status(),
        lastError: status.lastError,
      }),
      close: async () => {
        if (status.state === 'stopped') return;
        const stop = server.stop();
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('desktop transport close timeout')), config.closeTimeoutMs);
        });
        try {
          await Promise.race([stop, timeout]);
          status.state = 'stopped';
        } catch (error) {
          status.state = 'error';
          status.lastError = safeErrorMessage(error);
          throw error;
        }
      },
    };
  } catch (error) {
    status.state = 'error';
    status.lastError = safeErrorMessage(error);
    await server.stop().catch(() => undefined);
    throw error;
  }
}

export function safeTransportDiagnostic(req: InterceptedRequest, statusCode: number) {
  return {
    request: redactRequestSnapshot(req),
    response: redactResponseSnapshot({
      status: statusCode,
      headers: {},
      body: Buffer.alloc(0),
      completedAt: new Date().toISOString(),
    }),
  };
}

function createMockttpServer(config: DesktopInterceptionConfig): Mockttp {
  if (config.caCertPath && config.caKeyPath) {
    if (!config.installId) {
      throw new Error('desktop interception CA install id is required');
    }
    if (!isRflectrOwnedDesktopPath(config.caKeyPath, config.installId)) {
      throw new Error('desktop interception CA key path is not rflectr-owned');
    }
    const storage = checkPrivateKeyStorage(config.caKeyPath, config.caKeyPermissionsValidated);
    if (!storage.ok) {
      throw new Error(`desktop interception CA key storage rejected: ${storage.reason ?? 'unknown_reason'}`);
    }
    return getLocal({
      https: { certPath: config.caCertPath, keyPath: config.caKeyPath },
      recordTraffic: false,
      suggestChanges: false,
      http2: 'fallback',
    });
  }
  return getLocal({ recordTraffic: false, suggestChanges: false, http2: 'fallback' });
}

async function startMockttpServerOnHost(server: Mockttp, port: number, host: string): Promise<void> {
  const prototype = NetServer.prototype as unknown as {
    listen: (this: NetServer, ...args: unknown[]) => unknown;
  };
  const originalListen = prototype.listen;
  prototype.listen = function patchedListen(this: NetServer, ...args: unknown[]) {
    if (args.length === 1 && typeof args[0] === 'number') {
      return originalListen.call(this, args[0], host);
    }
    if (
      args.length === 1
      && typeof args[0] === 'object'
      && args[0] !== null
      && 'port' in args[0]
      && !('host' in args[0])
    ) {
      return originalListen.call(this, { ...(args[0] as object), host });
    }
    return originalListen.apply(this, args);
  };

  try {
    await server.start(port);
  } finally {
    prototype.listen = originalListen;
  }

  const address = (server as unknown as { address?: { address?: string } }).address;
  if (!address || address.address !== host) {
    await server.stop().catch(() => undefined);
    throw new Error('desktop interception transport failed to bind to loopback host');
  }
}

function safeErrorMessage(error: unknown): string {
  return redactText(error instanceof Error ? error.message : String(error));
}

function sanitizeReplacementHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const next = { ...headers };
  for (const key of Object.keys(next)) {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === ':authority') delete next[key];
  }
  return next;
}
