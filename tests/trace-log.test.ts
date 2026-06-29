import { describe, it, expect } from 'vitest';
import { redactTraceLine, redactTraceLog } from '../src/trace-log.js';

describe('trace log redaction', () => {
  it('redacts bearer tokens', () => {
    expect(redactTraceLine('Authorization: Bearer sk-ant-api03-secret123')).toContain('[REDACTED]');
    expect(redactTraceLine('Authorization: Bearer sk-ant-api03-secret123')).not.toContain('secret123');
  });

  it('redacts sk- prefixed keys', () => {
    expect(redactTraceLine('key=sk-abc1234567890')).toBe('key=sk-[REDACTED]');
  });

  it('redacts full log content', () => {
    const log = redactTraceLog('line1\nBearer sk-test123456789012345678901234\nline3');
    expect(log).not.toContain('sk-test123456789012345678901234');
  });
});

describe('Portkey header redaction', () => {
  it('redacts x-portkey-api-key value in JSON form', () => {
    const line = 'headers: {"x-portkey-api-key":"pk-master-secret-abc123","x-portkey-config":"my-slug"}';
    const redacted = redactTraceLine(line);
    expect(redacted).not.toContain('pk-master-secret-abc123');
    expect(redacted).toContain('[REDACTED]');
    // non-secret routing header value stays intact
    expect(redacted).toContain('my-slug');
  });

  it('redacts x-portkey-api-key value in HTTP header form', () => {
    const line = 'x-portkey-api-key: pk-super-secret-key-xyz';
    const redacted = redactTraceLine(line);
    expect(redacted).not.toContain('pk-super-secret-key-xyz');
    expect(redacted).toContain('[REDACTED]');
  });

  it('is case-insensitive when redacting x-portkey-api-key', () => {
    const line = 'X-Portkey-Api-Key: UPPERCASE-SECRET-999';
    const redacted = redactTraceLine(line);
    expect(redacted).not.toContain('UPPERCASE-SECRET-999');
    expect(redacted).toContain('[REDACTED]');
  });

  it('does NOT redact x-portkey-config values', () => {
    const line = 'x-portkey-config: my-routing-config-slug';
    const redacted = redactTraceLine(line);
    expect(redacted).toBe(line);
  });

  it('does NOT redact x-portkey-virtual-key values', () => {
    const line = '"x-portkey-virtual-key":"openai-vk-prod"';
    const redacted = redactTraceLine(line);
    expect(redacted).toBe(line);
  });

  it('does NOT redact x-portkey-provider values', () => {
    const line = 'x-portkey-provider: openai';
    const redacted = redactTraceLine(line);
    expect(redacted).toBe(line);
  });
});
