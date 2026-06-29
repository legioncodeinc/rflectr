// tests/upstream-forward.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { anthropicUpstreamHeaders, relayAnthropicMessages } from '../src/upstream-forward.js';
import type { ServerResponse } from 'node:http';

describe('anthropicUpstreamHeaders', () => {
  it('includes bearer and x-api-key', () => {
    expect(anthropicUpstreamHeaders('secret-key')).toMatchObject({
      Authorization: 'Bearer secret-key',
      'x-api-key': 'secret-key',
      'anthropic-version': '2023-06-01',
    });
  });

  it('adds stream accept header when requested', () => {
    expect(anthropicUpstreamHeaders('secret-key', true).Accept).toBe('text/event-stream');
  });
});

describe('relayAnthropicMessages — extraHeaders', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('merges extraHeaders into the upstream request, with extra headers taking precedence', async () => {
    // Arrange: upstream returns a non-streaming 200 JSON response.
    // body must be truthy so relayAnthropicMessages doesn't hit the "empty body" 502 guard;
    // the text() call on the mock then returns the JSON string.
    const responseBody = JSON.stringify({ id: 'msg_test', type: 'message' });
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      body: 'non-null-sentinel',
      text: async () => responseBody,
      headers: { get: () => 'application/json' },
    } as unknown as Response);

    // Arrange: a minimal ServerResponse stand-in
    const writtenHeaders: Record<string, unknown> = {};
    let writtenBody = '';
    const res = {
      writeHead: (status: number, headers?: Record<string, unknown>) => {
        writtenHeaders['status'] = status;
        Object.assign(writtenHeaders, headers ?? {});
      },
      end: (body: string) => { writtenBody = body; },
      headersSent: false,
    } as unknown as ServerResponse;

    const extraHeaders: Record<string, string> = {
      'x-portkey-api-key': 'pk-key-123',
      'x-portkey-config': 'my-config-slug',
    };

    // Act
    await relayAnthropicMessages(
      res,
      'https://api.portkey.ai/v1/messages',
      { model: 'claude-sonnet-4-6', messages: [] },
      'anthropic-api-key',
      false,
      undefined,
      extraHeaders,
    );

    // Assert: fetch was called with both the anthropic base headers AND the extra headers
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sentHeaders = init.headers as Record<string, string>;
    expect(sentHeaders['x-portkey-api-key']).toBe('pk-key-123');
    expect(sentHeaders['x-portkey-config']).toBe('my-config-slug');
    expect(sentHeaders['Authorization']).toMatch(/^Bearer /);
    expect(sentHeaders['anthropic-version']).toBe('2023-06-01');

    // Assert: response was proxied
    expect(writtenBody).toBe(responseBody);
  });

  it('works without extraHeaders (backward compatibility)', async () => {
    const responseBody = JSON.stringify({ id: 'msg_test2' });
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      body: 'non-null-sentinel',
      text: async () => responseBody,
      headers: { get: () => 'application/json' },
    } as unknown as Response);

    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
      headersSent: false,
    } as unknown as ServerResponse;

    // No extraHeaders argument — signature stays backward-compatible
    await relayAnthropicMessages(
      res,
      'https://api.anthropic.com/v1/messages',
      { model: 'claude-sonnet-4-6', messages: [] },
      'test-key',
      false,
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sentHeaders = init.headers as Record<string, string>;
    expect(sentHeaders['Authorization']).toBe('Bearer test-key');
    expect(sentHeaders['x-portkey-api-key']).toBeUndefined();
  });
});
