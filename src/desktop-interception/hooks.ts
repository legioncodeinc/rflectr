import { REDACTED, redactHeaders, redactPath, type HeaderMap } from './redaction.js';

export interface InterceptedRequest {
  readonly app: string;
  readonly host: string;
  readonly port: number;
  readonly method: string;
  readonly path: string;
  readonly url: string;
  readonly headers: HeaderMap;
  readonly body: Buffer;
}

export interface InterceptedResponse {
  readonly status: number;
  readonly headers: HeaderMap;
  readonly body: Buffer;
  readonly completedAt: string;
}

export type HookAction = 'allow' | 'deny' | 'redact' | 'respond';

export interface HookResponse {
  readonly statusCode: number;
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly body?: string | Buffer;
}

export interface RequestOutcome {
  readonly action: HookAction;
  readonly body?: Buffer;
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly upstreamUrl?: string;
  readonly response?: HookResponse;
  readonly reason?: string;
}

export interface DesktopInterceptionHooks {
  beforeRequest(req: InterceptedRequest): Promise<RequestOutcome> | RequestOutcome;
  afterResponse?(req: RedactedRequestSnapshot, res: RedactedResponseSnapshot): Promise<void> | void;
  onResponseComplete?(req: InterceptedRequest, res: InterceptedResponse): Promise<void> | void;
}

export const noopDesktopInterceptionHooks: DesktopInterceptionHooks = {
  beforeRequest() {
    return { action: 'allow' };
  },
};

export interface RedactedRequestSnapshot {
  readonly app: string;
  readonly host: string;
  readonly port: number;
  readonly method: string;
  readonly path: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly bodyPreview?: string;
}

export interface RedactedResponseSnapshot {
  readonly status: number;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly bodyPreview?: string;
  readonly completedAt: string;
}

export function redactRequestSnapshot(req: InterceptedRequest): RedactedRequestSnapshot {
  return {
    app: req.app,
    host: req.host,
    port: req.port,
    method: req.method,
    path: redactPath(req.path),
    headers: redactHeaders(req.headers),
    bodyPreview: req.body.length > 0 ? REDACTED : undefined,
  };
}

export function redactResponseSnapshot(res: InterceptedResponse): RedactedResponseSnapshot {
  return {
    status: res.status,
    headers: redactHeaders(res.headers),
    bodyPreview: res.body.length > 0 ? REDACTED : undefined,
    completedAt: res.completedAt,
  };
}
