import { createServer, request, type Server } from 'node:http';
import { mkdtempSync, writeFileSync, chmodSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startDesktopInterceptionTransport, type DesktopInterceptionTransport } from '../src/desktop-interception/transport.js';
import type { InterceptedRequest } from '../src/desktop-interception/hooks.js';

interface Upstream {
  readonly url: string;
  readonly port: number;
  readonly requests: Array<{ method: string; url: string; body: string; headers: Record<string, string | string[] | undefined> }>;
  close(): Promise<void>;
}

const openTransports: DesktopInterceptionTransport[] = [];
const openUpstreams: Upstream[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(openTransports.splice(0).map(transport => transport.close().catch(() => undefined)));
  await Promise.all(openUpstreams.splice(0).map(upstream => upstream.close()));
  tempDirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true }));
});

describe('desktop interception transport', () => {
  it('binds an ephemeral local proxy and closes idempotently', async () => {
    const upstream = await startUpstream((_req, res) => res.end('ok'));
    const transport = await startDesktopInterceptionTransport({
      allowedHosts: [{ host: '127.0.0.1', label: 'test upstream', reason: 'test' }],
      ownedLoopbackEndpoints: [{ host: '127.0.0.1', port: upstream.port, label: 'test upstream' }],
    });
    openTransports.push(transport);

    expect(transport.port).toBeGreaterThan(0);
    expect(transport.status()).toMatchObject({ state: 'running', port: transport.port });
    await expect(requestDirectly('127.0.0.1', transport.port)).resolves.toBe(403);

    await transport.close();
    await transport.close();
    expect(transport.status().state).toBe('stopped');
    await expect(requestDirectly('127.0.0.1', transport.port)).rejects.toThrow();
  });

  it('fails closed before using an unvalidated CA private key', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rflectr-desktop-ca-'));
    tempDirs.push(dir);
    const ownedDir = join(dir, '.rflectr', 'desktop-interception', 'rflectr-test-install');
    const certPath = join(ownedDir, 'ca-cert.pem');
    const keyPath = join(ownedDir, 'ca-key.pem');
    mkdirSync(ownedDir, { recursive: true });
    writeFileSync(certPath, 'synthetic-cert');
    writeFileSync(keyPath, 'synthetic-key');
    if (process.platform !== 'win32') chmodSync(keyPath, 0o644);

    await expect(startDesktopInterceptionTransport({
      caCertPath: certPath,
      caKeyPath: keyPath,
      installId: 'rflectr-test-install',
    })).rejects.toThrow(/CA key storage rejected/);
  });

  it('rejects CA key paths that are not under an owned per-install desktop path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rflectr-unowned-ca-'));
    tempDirs.push(dir);
    const certPath = join(dir, 'ca-cert.pem');
    const keyPath = join(dir, 'ca-key.pem');
    writeFileSync(certPath, 'synthetic-cert');
    writeFileSync(keyPath, 'synthetic-key', { mode: 0o600 });

    await expect(startDesktopInterceptionTransport({
      caCertPath: certPath,
      caKeyPath: keyPath,
      caKeyPermissionsValidated: true,
      installId: 'rflectr-test-install',
    })).rejects.toThrow(/not rflectr-owned/);
  });

  it('requires an install id before starting with CA material', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rflectr-missing-install-id-'));
    tempDirs.push(dir);
    const ownedDir = join(dir, '.rflectr', 'desktop-interception', 'rflectr-test-install');
    mkdirSync(ownedDir, { recursive: true });
    const certPath = join(ownedDir, 'ca-cert.pem');
    const keyPath = join(ownedDir, 'ca-key.pem');
    writeFileSync(certPath, 'synthetic-cert');
    writeFileSync(keyPath, 'synthetic-key', { mode: 0o600 });

    await expect(startDesktopInterceptionTransport({
      caCertPath: certPath,
      caKeyPath: keyPath,
      caKeyPermissionsValidated: true,
    })).rejects.toThrow(/install id is required/);
  });

  it('forwards unchanged allowlisted requests without body corruption', async () => {
    const upstream = await startUpstream((_req, res) => res.end('ok'));
    const transport = await startDesktopInterceptionTransport({
      allowedHosts: [{ host: '127.0.0.1', label: 'test upstream', reason: 'test' }],
      ownedLoopbackEndpoints: [{ host: '127.0.0.1', port: upstream.port, label: 'test upstream' }],
    });
    openTransports.push(transport);

    const response = await proxyRequest(transport.port, upstream.url + '/echo', 'POST', 'hello');

    expect(response.body).toBe('ok');
    expect(upstream.requests[0]).toMatchObject({ method: 'POST', url: '/echo', body: 'hello' });
  });

  it('applies beforeRequest body and header modifications only when requested', async () => {
    const upstream = await startUpstream((_req, res) => res.end('changed'));
    const seen: InterceptedRequest[] = [];
    const transport = await startDesktopInterceptionTransport({
      allowedHosts: [{ host: '127.0.0.1', label: 'test upstream', reason: 'test' }],
      ownedLoopbackEndpoints: [{ host: '127.0.0.1', port: upstream.port, label: 'test upstream' }],
      hooks: {
        beforeRequest(req) {
          seen.push(req);
          return {
            action: 'allow',
            body: Buffer.from('modified'),
            headers: { ...req.headers, 'x-rflectr-test': 'yes' },
          };
        },
      },
    });
    openTransports.push(transport);

    await proxyRequest(transport.port, upstream.url + '/modify', 'POST', 'original');

    expect(seen[0]?.body.toString()).toBe('original');
    expect(upstream.requests[0]?.body).toBe('modified');
    expect(upstream.requests[0]?.headers['x-rflectr-test']).toBe('yes');
  });

  it('can answer allowlisted requests from a hook without forwarding upstream', async () => {
    const upstream = await startUpstream((_req, res) => res.end('should not be reached'));
    const transport = await startDesktopInterceptionTransport({
      allowedHosts: [{ host: '127.0.0.1', label: 'test upstream', reason: 'test' }],
      ownedLoopbackEndpoints: [{ host: '127.0.0.1', port: upstream.port, label: 'test upstream' }],
      hooks: {
        beforeRequest() {
          return {
            action: 'respond',
            response: {
              statusCode: 202,
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ ok: true }),
            },
          };
        },
      },
    });
    openTransports.push(transport);

    const response = await proxyRequest(transport.port, upstream.url + '/local-response', 'POST', 'original');

    expect(response.status).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ ok: true });
    expect(upstream.requests).toHaveLength(0);
  });

  it('denies non-allowlisted requests and records redacted leak attempts', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const transport = await startDesktopInterceptionTransport();
    openTransports.push(transport);

    const response = await proxyRequest(transport.port, 'http://example.com/path?api_key=sk-secret-secret-secret', 'GET');

    expect(response.status).toBe(403);
    const log = stderr.mock.calls.map(call => String(call[0])).join('\n');
    expect(log).toContain('egress.leak_attempt');
    expect(log).not.toContain('sk-secret-secret-secret');
    stderr.mockRestore();
  });

  it('streams SSE chunks progressively without beforeResponse buffering', async () => {
    const upstream = await startUpstream((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('data: one\n\n');
      setTimeout(() => {
        res.write('data: two\n\n');
        res.end();
      }, 80);
    });
    const transport = await startDesktopInterceptionTransport({
      allowedHosts: [{ host: '127.0.0.1', label: 'test upstream', reason: 'test' }],
      ownedLoopbackEndpoints: [{ host: '127.0.0.1', port: upstream.port, label: 'test upstream' }],
    });
    openTransports.push(transport);

    const timings = await proxyRequestTimings(transport.port, upstream.url + '/sse');

    expect(timings.firstChunkMs).toBeLessThan(70);
    expect(timings.totalMs).toBeGreaterThanOrEqual(70);
    expect(timings.body).toContain('data: one');
    expect(timings.body).toContain('data: two');
  });

  it('calls afterResponse with redacted snapshots and completion metadata', async () => {
    const upstream = await startUpstream((_req, res) => res.end('Bearer response-secret-response-secret'));
    const afterResponse = vi.fn();
    const transport = await startDesktopInterceptionTransport({
      allowedHosts: [{ host: '127.0.0.1', label: 'test upstream', reason: 'test' }],
      ownedLoopbackEndpoints: [{ host: '127.0.0.1', port: upstream.port, label: 'test upstream' }],
      hooks: {
        beforeRequest() {
          return { action: 'allow' };
        },
        afterResponse,
      },
    });
    openTransports.push(transport);

    await proxyRequest(
      transport.port,
      upstream.url + '/done?api_key=sk-secret-secret-secret',
      'POST',
      JSON.stringify({ prompt: 'full prompt text' }),
    );
    await waitFor(() => expect(afterResponse).toHaveBeenCalled());
    const [req, res] = afterResponse.mock.calls[0]!;

    expect(req.path).not.toContain('sk-secret-secret-secret');
    expect(req.bodyPreview).toBe('[REDACTED]');
    expect(res.bodyPreview).toBe('[REDACTED]');
    expect(res.completedAt).toEqual(expect.any(String));
  });
});

async function startUpstream(handler: Parameters<typeof createServer>[0]): Promise<Upstream> {
  const requests: Upstream['requests'] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    requests.push({
      method: req.method ?? '',
      url: req.url ?? '',
      body: Buffer.concat(chunks).toString(),
      headers: req.headers as Record<string, string | string[] | undefined>,
    });
    handler(req, res);
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing upstream port');
  const upstream = {
    url: `http://127.0.0.1:${address.port}`,
    port: address.port,
    requests,
    close: () => closeServer(server),
  };
  openUpstreams.push(upstream);
  return upstream;
}

async function proxyRequest(proxyPort: number, url: string, method = 'GET', body?: string): Promise<{ status: number; body: string }> {
  const timings = await proxyRequestTimings(proxyPort, url, method, body);
  return { status: timings.status, body: timings.body };
}

async function requestDirectly(host: string, port: number): Promise<number> {
  return await new Promise((resolve, reject) => {
    const req = request({ host, port, method: 'GET', path: 'http://example.com/' }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode ?? 0));
    });
    req.on('error', reject);
    req.end();
  });
}

async function proxyRequestTimings(proxyPort: number, url: string, method = 'GET', body?: string): Promise<{ status: number; body: string; firstChunkMs: number; totalMs: number }> {
  const started = Date.now();
  return await new Promise((resolve, reject) => {
    const req = request({
      host: '127.0.0.1',
      port: proxyPort,
      method,
      path: url,
      headers: body ? { 'content-length': Buffer.byteLength(body) } : undefined,
    }, res => {
      const chunks: Buffer[] = [];
      let firstChunkMs = Number.POSITIVE_INFINITY;
      res.on('data', chunk => {
        if (firstChunkMs === Number.POSITIVE_INFINITY) firstChunkMs = Date.now() - started;
        chunks.push(Buffer.from(chunk));
      });
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        body: Buffer.concat(chunks).toString(),
        firstChunkMs,
        totalMs: Date.now() - started,
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

async function waitFor(assertion: () => void, timeoutMs = 500): Promise<void> {
  const started = Date.now();
  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - started > timeoutMs) throw error;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
