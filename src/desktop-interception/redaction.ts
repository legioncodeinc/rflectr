const SECRET_HEADER_PATTERNS = [
  /^authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^x-api-key$/i,
  /api[-_]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /^api-key$/i,
  /^anthropic-api-key$/i,
  /^openai-api-key$/i,
  /^proxy-authorization$/i,
];

const SECRET_KEY_PATTERNS = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /cookie/i,
  /secret/i,
  /token/i,
  /password/i,
  /private[_-]?key/i,
];

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\b(sk|ak|rk|pk|xox[abp])-[-A-Za-z0-9_]{12,}\b/gi,
];

export const REDACTED = '[REDACTED]';

export type HeaderValue = string | string[] | undefined;
export type HeaderMap = Readonly<Record<string, HeaderValue>>;

export function isSecretName(name: string): boolean {
  return SECRET_KEY_PATTERNS.some(pattern => pattern.test(name));
}

export function redactHeaders(headers: HeaderMap): Record<string, HeaderValue> {
  const redacted: Record<string, HeaderValue> = {};
  for (const [key, value] of Object.entries(headers)) {
    redacted[key] = SECRET_HEADER_PATTERNS.some(pattern => pattern.test(key)) ? REDACTED : value;
  }
  return redacted;
}

export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    for (const key of [...url.searchParams.keys()]) {
      if (isSecretName(key)) url.searchParams.set(key, REDACTED);
    }
    return url.toString();
  } catch {
    return redactText(input);
  }
}

export function redactPath(input: string): string {
  try {
    const url = new URL(input, 'http://rflectr.local');
    for (const key of [...url.searchParams.keys()]) {
      if (isSecretName(key)) url.searchParams.set(key, REDACTED);
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return redactText(input);
  }
}

export function redactText(input: string): string {
  let output = input;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    output = output.replace(pattern, REDACTED);
  }
  return output;
}

export function redactBodyPreview(body: Buffer | string | undefined, maxLength = 512): string | undefined {
  if (body === undefined) return undefined;
  const text = Buffer.isBuffer(body) ? body.toString('utf8') : body;
  return redactText(text.slice(0, maxLength));
}

export function redactUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(item => redactUnknown(item));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = isSecretName(key) ? REDACTED : redactUnknown(nested);
    }
    return output;
  }
  return REDACTED;
}
