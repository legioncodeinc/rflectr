import { isClaudeDesktopHost, isClaudeDesktopInferenceRequest } from '../claude-target.js';
import type { InterceptedRequest } from '../hooks.js';
import { redactHeaders, redactPath, redactText } from '../redaction.js';
import type {
  AnthropicDesktopClassification,
  ParsedAnthropicDesktopRequest,
  RedactedAnthropicDiagnostic,
} from './types.js';

const FORWARD_HEADER_ALLOWLIST = new Set([
  'anthropic-beta',
  'anthropic-version',
]);

export function classifyAnthropicDesktopRequest(req: InterceptedRequest): AnthropicDesktopClassification {
  const baseDiagnostic = diagnosticFor(req);

  if (!isClaudeDesktopHost(req.host)) {
    return {
      decision: 'deny',
      reason: 'host-not-claude-desktop-target',
      diagnostic: baseDiagnostic,
    };
  }

  if (!isClaudeDesktopInferenceRequest(req)) {
    return {
      decision: 'pass_through',
      reason: 'non-inference-claude-desktop-request',
      diagnostic: baseDiagnostic,
    };
  }

  const text = req.body.toString('utf8');
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    return malformed(req, 'Malformed Anthropic Messages JSON body');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return malformed(req, 'Anthropic Messages body must be a JSON object');
  }

  const body = parsed as Record<string, unknown>;
  if (typeof body.model !== 'string' || body.model.trim() === '') {
    return malformed(req, 'Anthropic Messages body must include a model string');
  }
  if (!Array.isArray(body.messages)) {
    return malformed(req, 'Anthropic Messages body must include a messages array');
  }

  const routedBody = { ...body };
  const parsedRequest: ParsedAnthropicDesktopRequest = {
    model: body.model,
    messages: body.messages,
    system: body.system,
    tools: body.tools,
    tool_choice: body.tool_choice,
    stream: body.stream === true,
    thinking: body.thinking,
    rawBody: routedBody,
    forwardHeaders: safeForwardHeaders(req.headers),
    diagnostic: diagnosticFor(req, routedBody),
  };

  return {
    decision: 'route',
    request: parsedRequest,
  };
}

export function createAnthropicMalformedError(message: string) {
  return {
    type: 'error' as const,
    error: {
      type: 'invalid_request_error' as const,
      message,
    },
  };
}

export function parseAnthropicSseEventTypes(streamText: string): string[] {
  const events: string[] = [];
  for (const line of streamText.split(/\r?\n/)) {
    if (!line.startsWith('event:')) continue;
    const event = line.slice('event:'.length).trim();
    if (event) events.push(event);
  }
  return events;
}

export function contentBlocksToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map(block => {
      if (!block || typeof block !== 'object') return '';
      const typed = block as { type?: unknown; text?: unknown };
      return typed.type === 'text' && typeof typed.text === 'string' ? typed.text : '';
    })
    .filter(Boolean)
    .join('\n');
}

function malformed(req: InterceptedRequest, message: string): AnthropicDesktopClassification {
  return {
    decision: 'malformed',
    status: 400,
    errorBody: createAnthropicMalformedError(message),
    diagnostic: {
      ...diagnosticFor(req),
      error: redactText(message),
    },
  };
}

function diagnosticFor(req: InterceptedRequest, body?: Record<string, unknown>): RedactedAnthropicDiagnostic {
  return {
    host: req.host,
    method: req.method,
    path: redactPath(req.path),
    model: typeof body?.model === 'string' ? body.model : undefined,
    stream: typeof body?.stream === 'boolean' ? body.stream : undefined,
    hasSystem: body ? body.system !== undefined || hasInlineSystemMessage(body.messages) : undefined,
    hasTools: Array.isArray(body?.tools),
    hasToolChoice: body?.tool_choice !== undefined,
    hasThinking: body?.thinking !== undefined,
    headers: redactHeaders(req.headers),
  };
}

function safeForwardHeaders(headers: InterceptedRequest['headers']): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (!FORWARD_HEADER_ALLOWLIST.has(lower)) continue;
    if (Array.isArray(value)) output[lower] = value.join(',');
    else if (typeof value === 'string') output[lower] = value;
  }
  return output;
}

function hasInlineSystemMessage(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  return messages.some(message => (
    message
    && typeof message === 'object'
    && (message as { role?: unknown }).role === 'system'
  ));
}
