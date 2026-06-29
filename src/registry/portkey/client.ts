// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
// src/registry/portkey/client.ts — typed fetch client for the Portkey control-plane API

import type { PortkeyConfig, PortkeyModel, PortkeyRoutingTarget, PortkeyVirtualKey } from './types.js';

export const PORTKEY_BASE_URL = 'https://api.portkey.ai/v1';

/**
 * Strip C0 control characters (0x00-0x1F incl. CR/LF/TAB) and DEL (0x7F)
 * from a routing slug before it is assigned as an HTTP header value.
 * Kept local to avoid a circular import with add.ts.
 */
function sanitizeHeaderValue(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) continue;
    out += ch;
  }
  return out.trim();
}

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Discriminated result returned by every client function.
 * Callers always check `ok` before accessing `data`.
 */
export type PortkeyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function baseHeaders(masterKey: string): Record<string, string> {
  return {
    'x-portkey-api-key': masterKey,
    Accept: 'application/json',
  };
}

async function portkeyFetch(
  url: string,
  headers: Record<string, string>,
): Promise<{ ok: false; error: string; status?: number } | { ok: true; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      return {
        ok: false,
        error: 'Portkey redirected the request — check the base URL.',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: 'Portkey master key was rejected.',
        status: response.status,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: `Portkey returned HTTP ${response.status}.`,
        status: response.status,
      };
    }

    const text = await response.text().catch(() => '');
    return { ok: true, status: response.status, text };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = message.toLowerCase().includes('abort');
    return {
      ok: false,
      error: isAbort
        ? 'Could not reach Portkey (timeout or network error).'
        : 'Could not reach Portkey (timeout or network error).',
    };
  } finally {
    clearTimeout(timer);
  }
}

function tolerantParse(text: string): unknown {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all Configs in the workspace.
 * Maps `is_default` (0/1 integer or boolean) → `isDefault: boolean`.
 */
export async function listConfigs(masterKey: string): Promise<PortkeyResult<PortkeyConfig[]>> {
  const url = `${PORTKEY_BASE_URL}/configs`;
  const result = await portkeyFetch(url, baseHeaders(masterKey));
  if (!result.ok) return result;

  const body = tolerantParse(result.text) as {
    success?: boolean;
    data?: Array<{
      id?: string;
      name?: string;
      slug?: string;
      is_default?: number | boolean;
      status?: string;
    }>;
  };

  const rows = Array.isArray(body.data) ? body.data : [];
  const configs: PortkeyConfig[] = rows
    .filter(r => r.id && r.name && r.slug)
    .map(r => ({
      id: r.id as string,
      name: r.name as string,
      slug: r.slug as string,
      isDefault: r.is_default !== undefined ? Boolean(r.is_default) : undefined,
      status: r.status,
    }));

  return { ok: true, data: configs };
}

/**
 * List Virtual Keys. This endpoint is DEPRECATED upstream and may 404/410.
 * Returns `ok: true, data: []` on 404/410 — not an error, just degradation.
 */
export async function listVirtualKeys(masterKey: string): Promise<PortkeyResult<PortkeyVirtualKey[]>> {
  const url = `${PORTKEY_BASE_URL}/virtual-keys`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: baseHeaders(masterKey),
      redirect: 'manual',
      signal: controller.signal,
    });

    // Deprecated endpoint: treat 404/410 as "not available" rather than an error
    if (response.status === 404 || response.status === 410) {
      return { ok: true, data: [] };
    }

    if (response.status >= 300 && response.status < 400) {
      return { ok: false, error: 'Portkey redirected the request — check the base URL.' };
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'Portkey master key was rejected.', status: response.status };
    }

    if (!response.ok) {
      return { ok: false, error: `Portkey returned HTTP ${response.status}.`, status: response.status };
    }

    const text = await response.text().catch(() => '');
    const body = tolerantParse(text) as {
      data?: Array<{ name?: string; slug?: string }>;
    };

    const rows = Array.isArray(body.data) ? body.data : [];
    const vks: PortkeyVirtualKey[] = rows
      .filter(r => r.name && r.slug)
      .map(r => ({ name: r.name as string, slug: r.slug as string }));

    return { ok: true, data: vks };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = message.toLowerCase().includes('abort');
    return {
      ok: false,
      error: isAbort
        ? 'Could not reach Portkey (timeout or network error).'
        : 'Could not reach Portkey (timeout or network error).',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * List models available through Portkey.
 * Optionally scoped to a routing target (config / virtualKey / provider).
 * Model ids may look like `@openai-prod/gpt-4o` — kept verbatim.
 */
export async function listModels(
  masterKey: string,
  routing?: PortkeyRoutingTarget,
): Promise<PortkeyResult<PortkeyModel[]>> {
  const url = `${PORTKEY_BASE_URL}/models`;

  const headers: Record<string, string> = baseHeaders(masterKey);
  if (routing) {
    if ('config' in routing && routing.config) {
      headers['x-portkey-config'] = sanitizeHeaderValue(routing.config);
    } else if ('virtualKey' in routing && routing.virtualKey) {
      headers['x-portkey-virtual-key'] = sanitizeHeaderValue(routing.virtualKey);
    } else if ('provider' in routing && routing.provider) {
      headers['x-portkey-provider'] = sanitizeHeaderValue(routing.provider);
    }
  }

  const result = await portkeyFetch(url, headers);
  if (!result.ok) return result;

  const body = tolerantParse(result.text) as {
    data?: Array<{ id?: string }>;
  };

  const rows = Array.isArray(body.data) ? body.data : [];
  const models: PortkeyModel[] = rows
    .filter(r => r.id)
    .map(r => ({ id: r.id as string }));

  return { ok: true, data: models };
}
