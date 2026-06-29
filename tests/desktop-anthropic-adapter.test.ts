import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyAnthropicDesktopRequest,
  contentBlocksToText,
  parseAnthropicSseEventTypes,
} from '../src/desktop-interception/adapters/anthropic.js';
import type { InterceptedRequest } from '../src/desktop-interception/hooks.js';

function intercepted(overrides: Partial<InterceptedRequest> = {}): InterceptedRequest {
  const body = overrides.body ?? Buffer.from(JSON.stringify({
    model: 'claude-3-5-sonnet-latest',
    system: [{ type: 'text', text: 'system text' }],
    messages: [
      { role: 'system', content: 'inline system' },
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
    ],
    tools: [{ name: 'lookup', input_schema: { type: 'object' } }],
    tool_choice: { type: 'tool', name: 'lookup' },
    stream: true,
    thinking: { type: 'enabled', budget_tokens: 1024 },
  }));
  return {
    app: 'Claude Desktop',
    host: 'api.anthropic.com',
    port: 443,
    method: 'POST',
    path: '/v1/messages?api_key=sk-secret-secret-secret',
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      authorization: 'Bearer sk-secret-secret-secret',
      cookie: 'session=secret',
      'anthropic-beta': 'tools-2024-04-04',
      'x-api-key': 'sk-secret-secret-secret',
    },
    body,
    ...overrides,
  };
}

describe('Claude Desktop Anthropic adapter', () => {
  it('extracts Anthropic Messages fields and redacts diagnostics', () => {
    const result = classifyAnthropicDesktopRequest(intercepted());

    expect(result.decision).toBe('route');
    if (result.decision !== 'route') throw new Error('expected route');
    expect(result.request).toMatchObject({
      model: 'claude-3-5-sonnet-latest',
      stream: true,
      system: [{ type: 'text', text: 'system text' }],
      tools: [{ name: 'lookup', input_schema: { type: 'object' } }],
      tool_choice: { type: 'tool', name: 'lookup' },
      thinking: { type: 'enabled', budget_tokens: 1024 },
      forwardHeaders: { 'anthropic-beta': 'tools-2024-04-04' },
      diagnostic: {
        path: '/v1/messages?api_key=%5BREDACTED%5D',
        model: 'claude-3-5-sonnet-latest',
        stream: true,
        hasSystem: true,
        hasTools: true,
        hasToolChoice: true,
        hasThinking: true,
      },
    });
    expect(JSON.stringify(result.request.diagnostic)).not.toContain('sk-secret');
    expect(result.request.diagnostic.headers.authorization).toBe('[REDACTED]');
    expect(result.request.diagnostic.headers.cookie).toBe('[REDACTED]');
    expect(result.request.diagnostic.headers['x-api-key']).toBe('[REDACTED]');
  });

  it('preserves string system, array system, inline system messages, tools, tool choice, and thinking in rawBody', () => {
    const body = {
      model: 'claude-route',
      system: 'plain system',
      messages: [{ role: 'system', content: 'inline' }, { role: 'user', content: 'hi' }],
      tools: [{ name: 'tool' }],
      tool_choice: { type: 'auto' },
      thinking: { type: 'enabled' },
      stream: false,
    };
    const result = classifyAnthropicDesktopRequest(intercepted({ body: Buffer.from(JSON.stringify(body)) }));

    expect(result.decision).toBe('route');
    if (result.decision !== 'route') throw new Error('expected route');
    expect(result.request.rawBody).toEqual(body);
    expect(result.request.diagnostic.hasSystem).toBe(true);
  });

  it('classifies non-inference Claude traffic as pass-through and other hosts as deny', () => {
    expect(classifyAnthropicDesktopRequest(intercepted({
      host: 'claude.ai',
      method: 'GET',
      path: '/api/bootstrap',
    }))).toMatchObject({
      decision: 'pass_through',
      reason: 'non-inference-claude-desktop-request',
    });

    expect(classifyAnthropicDesktopRequest(intercepted({
      host: 'evil.example',
      path: '/v1/messages',
    }))).toMatchObject({
      decision: 'deny',
      reason: 'host-not-claude-desktop-target',
    });
  });

  it('returns compatible malformed errors without prompt or credential leakage', () => {
    const result = classifyAnthropicDesktopRequest(intercepted({
      body: Buffer.from('{not json sk-secret-secret-secret'),
    }));

    expect(result.decision).toBe('malformed');
    if (result.decision !== 'malformed') throw new Error('expected malformed');
    expect(result.status).toBe(400);
    expect(result.errorBody).toMatchObject({
      type: 'error',
      error: { type: 'invalid_request_error' },
    });
    expect(JSON.stringify(result.diagnostic)).not.toContain('sk-secret');
  });

  it('parses content blocks and Anthropic SSE event ordering fixtures', () => {
    expect(contentBlocksToText([
      { type: 'text', text: 'hello' },
      { type: 'tool_use', id: 'toolu_1' },
      { type: 'text', text: 'world' },
    ])).toBe('hello\nworld');

    expect(parseAnthropicSseEventTypes([
      'event: message_start',
      'data: {"type":"message_start"}',
      '',
      'event: content_block_start',
      'data: {"type":"content_block_start"}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta"}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta"}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n'))).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'message_delta',
      'message_stop',
    ]);
  });

  it('does not transplant old memory, Deeplake, or transcript persistence behavior', () => {
    const source = readFileSync(join(process.cwd(), 'src/desktop-interception/adapters/anthropic.ts'), 'utf8');
    for (const forbidden of ['injectMemory', 'wrapMemory', 'MEMORY_OPEN', 'MEMORY_CLOSE', 'Deeplake', 'transcript']) {
      expect(source).not.toContain(forbidden);
    }
  });
});
