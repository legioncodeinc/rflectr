// tests/portkey-client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listConfigs,
  listVirtualKeys,
  listModels,
  PORTKEY_BASE_URL,
} from '../src/registry/portkey/client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOkJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

function mockStatus(status: number, body = ''): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// listConfigs
// ---------------------------------------------------------------------------

describe('listConfigs', () => {
  it('maps a successful response to PortkeyConfig[]', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockOkJson({
        success: true,
        data: [
          {
            id: 'cfg-abc',
            name: 'My Config',
            slug: 'my-config',
            is_default: 1,
            status: 'active',
          },
          {
            id: 'cfg-def',
            name: 'Fallback',
            slug: 'fallback',
            is_default: 0,
            status: 'inactive',
          },
        ],
      }),
    );

    const result = await listConfigs('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');

    expect(result.data).toHaveLength(2);

    const first = result.data[0]!;
    expect(first.id).toBe('cfg-abc');
    expect(first.name).toBe('My Config');
    expect(first.slug).toBe('my-config');
    expect(first.isDefault).toBe(true); // numeric 1 → true
    expect(first.status).toBe('active');

    const second = result.data[1]!;
    expect(second.isDefault).toBe(false); // numeric 0 → false
  });

  it('maps boolean is_default correctly', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockOkJson({
        success: true,
        data: [{ id: 'c1', name: 'C1', slug: 'c1', is_default: true }],
      }),
    );

    const result = await listConfigs('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data[0]!.isDefault).toBe(true);
  });

  it('sets the x-portkey-api-key header on the request', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ success: true, data: [] }));

    await listConfigs('my-master-key');

    expect(fetch).toHaveBeenCalledWith(
      `${PORTKEY_BASE_URL}/configs`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-portkey-api-key': 'my-master-key',
        }),
      }),
    );
  });

  it('returns ok:false with rejection message on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(401));

    const result = await listConfigs('bad-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('rejected');
    expect(result.status).toBe(401);
  });

  it('returns ok:false with rejection message on 403', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(403));

    const result = await listConfigs('bad-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('rejected');
    expect(result.status).toBe(403);
  });

  it('returns ok:false on other non-2xx status', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(500));

    const result = await listConfigs('pk-test-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('500');
    expect(result.status).toBe(500);
  });

  it('returns ok:false on redirect', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(301));

    const result = await listConfigs('pk-test-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('redirected');
  });

  it('returns ok:[] when data array is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ success: true, data: [] }));

    const result = await listConfigs('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data).toEqual([]);
  });

  it('skips rows that are missing required fields', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockOkJson({
        success: true,
        data: [
          { id: 'c1', name: 'C1', slug: 'c1' },
          { id: 'c2', name: 'Missing Slug' }, // no slug — should be skipped
          { name: 'No Id', slug: 'no-id' },    // no id — should be skipped
        ],
      }),
    );

    const result = await listConfigs('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('c1');
  });
});

// ---------------------------------------------------------------------------
// listVirtualKeys
// ---------------------------------------------------------------------------

describe('listVirtualKeys', () => {
  it('maps a successful response to PortkeyVirtualKey[]', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockOkJson({
        data: [
          { name: 'OpenAI Key', slug: 'openai-key' },
          { name: 'Anthropic Key', slug: 'anthropic-key' },
        ],
      }),
    );

    const result = await listVirtualKeys('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ name: 'OpenAI Key', slug: 'openai-key' });
    expect(result.data[1]).toEqual({ name: 'Anthropic Key', slug: 'anthropic-key' });
  });

  it('returns ok:true with empty array on 404 (deprecated endpoint)', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(404));

    const result = await listVirtualKeys('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data).toEqual([]);
  });

  it('returns ok:true with empty array on 410 (deprecated endpoint gone)', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(410));

    const result = await listVirtualKeys('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data).toEqual([]);
  });

  it('returns ok:false on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(401));

    const result = await listVirtualKeys('bad-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('rejected');
  });
});

// ---------------------------------------------------------------------------
// listModels
// ---------------------------------------------------------------------------

describe('listModels', () => {
  it('maps a successful response to PortkeyModel[]', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockOkJson({
        data: [
          { id: '@openai-prod/gpt-4o' },
          { id: '@anthropic/claude-sonnet-4' },
          { id: 'gpt-3.5-turbo' },
        ],
      }),
    );

    const result = await listModels('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');

    expect(result.data).toHaveLength(3);
    expect(result.data[0]!.id).toBe('@openai-prod/gpt-4o');
    expect(result.data[1]!.id).toBe('@anthropic/claude-sonnet-4');
    expect(result.data[2]!.id).toBe('gpt-3.5-turbo');
  });

  it('keeps model ids with @ prefix verbatim', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockOkJson({ data: [{ id: '@openai-prod/gpt-4o-mini' }] }),
    );

    const result = await listModels('pk-test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data[0]!.id).toBe('@openai-prod/gpt-4o-mini');
  });

  it('attaches x-portkey-config header when routing.config is set', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ data: [] }));

    await listModels('pk-test-key', { config: 'my-config-slug' });

    expect(fetch).toHaveBeenCalledWith(
      `${PORTKEY_BASE_URL}/models`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-portkey-api-key': 'pk-test-key',
          'x-portkey-config': 'my-config-slug',
        }),
      }),
    );
  });

  it('attaches x-portkey-virtual-key header when routing.virtualKey is set', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ data: [] }));

    await listModels('pk-test-key', { virtualKey: 'my-vk-slug' });

    expect(fetch).toHaveBeenCalledWith(
      `${PORTKEY_BASE_URL}/models`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-portkey-virtual-key': 'my-vk-slug',
        }),
      }),
    );
  });

  it('attaches x-portkey-provider header when routing.provider is set', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ data: [] }));

    await listModels('pk-test-key', { provider: 'openai' });

    expect(fetch).toHaveBeenCalledWith(
      `${PORTKEY_BASE_URL}/models`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-portkey-provider': 'openai',
        }),
      }),
    );
  });

  it('does not attach any routing header when no routing target is provided', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ data: [] }));

    await listModels('pk-test-key');

    expect(fetch).toHaveBeenCalledWith(
      `${PORTKEY_BASE_URL}/models`,
      expect.not.objectContaining({
        headers: expect.objectContaining({ 'x-portkey-config': expect.anything() }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      `${PORTKEY_BASE_URL}/models`,
      expect.not.objectContaining({
        headers: expect.objectContaining({ 'x-portkey-virtual-key': expect.anything() }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      `${PORTKEY_BASE_URL}/models`,
      expect.not.objectContaining({
        headers: expect.objectContaining({ 'x-portkey-provider': expect.anything() }),
      }),
    );
  });

  it('returns ok:false on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(mockStatus(401));

    const result = await listModels('bad-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('rejected');
    expect(result.status).toBe(401);
  });

  it('returns ok:false with network-error message on AbortError (timeout)', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));

    const result = await listModels('pk-test-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('timeout or network error');
  });

  it('returns ok:false with network-error message on generic fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await listModels('pk-test-key');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected not-ok');
    expect(result.error).toContain('timeout or network error');
  });

  // F3 regression: routing slugs with CR/LF must be sanitized before assignment
  // to header values in listModels — not passed through raw.
  it('F3: strips CR/LF from routing.config before setting the header value', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ data: [] }));

    await listModels('pk-test-key', { config: 'slug\r\nx-injected: evil' });

    const call = vi.mocked(fetch).mock.calls[0]![1] as RequestInit;
    const headers = call.headers as Record<string, string>;
    const sent = headers['x-portkey-config'] ?? '';
    expect(sent).not.toMatch(/[\r\n]/);
    // Must not throw when used in a real Headers object
    expect(() => new Headers({ 'x-portkey-config': sent })).not.toThrow();
  });

  it('F3: strips CR/LF from routing.virtualKey before setting the header value', async () => {
    vi.mocked(fetch).mockResolvedValue(mockOkJson({ data: [] }));

    await listModels('pk-test-key', { virtualKey: 'vk\r\nevil: 1' });

    const call = vi.mocked(fetch).mock.calls[0]![1] as RequestInit;
    const headers = call.headers as Record<string, string>;
    const sent = headers['x-portkey-virtual-key'] ?? '';
    expect(sent).not.toMatch(/[\r\n]/);
  });
});
