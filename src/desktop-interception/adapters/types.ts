import type { HeaderMap } from '../redaction.js';

export type DesktopRouteDecision = 'route' | 'pass_through' | 'deny' | 'malformed';

export interface ParsedAnthropicDesktopRequest {
  readonly model: string;
  readonly messages: unknown;
  readonly system?: unknown;
  readonly tools?: unknown;
  readonly tool_choice?: unknown;
  readonly stream: boolean;
  readonly thinking?: unknown;
  readonly rawBody: Record<string, unknown>;
  readonly forwardHeaders: Record<string, string>;
  readonly diagnostic: RedactedAnthropicDiagnostic;
}

export interface RedactedAnthropicDiagnostic {
  readonly host: string;
  readonly method: string;
  readonly path: string;
  readonly model?: string;
  readonly stream?: boolean;
  readonly hasSystem?: boolean;
  readonly hasTools?: boolean;
  readonly hasToolChoice?: boolean;
  readonly hasThinking?: boolean;
  readonly headers: HeaderMap;
  readonly error?: string;
}

export type AnthropicDesktopClassification =
  | {
      readonly decision: 'route';
      readonly request: ParsedAnthropicDesktopRequest;
    }
  | {
      readonly decision: 'pass_through';
      readonly diagnostic: RedactedAnthropicDiagnostic;
      readonly reason: string;
    }
  | {
      readonly decision: 'deny';
      readonly diagnostic: RedactedAnthropicDiagnostic;
      readonly reason: string;
    }
  | {
      readonly decision: 'malformed';
      readonly diagnostic: RedactedAnthropicDiagnostic;
      readonly status: number;
      readonly errorBody: {
        readonly type: 'error';
        readonly error: {
          readonly type: 'invalid_request_error';
          readonly message: string;
        };
      };
    };
