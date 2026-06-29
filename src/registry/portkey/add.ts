// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
// src/registry/portkey/add.ts — interactive Portkey provider add flow

import * as p from '@clack/prompts';
import pc from 'picocolors';

import { saveProviderCredential } from '../../env.js';
import type { ProviderTemplate } from '../../provider-templates.js';
import { loadRegistry, saveRegistry } from '../io.js';
import type { CachedModel, RegistryProvider } from '../types.js';
import { listConfigs, listModels, listVirtualKeys, PORTKEY_BASE_URL } from './client.js';
import type { PortkeyConfig, PortkeyVirtualKey } from './types.js';

// ---------------------------------------------------------------------------
// Pure helper: build CachedModel[] from a selection result
// ---------------------------------------------------------------------------

export interface PortkeySelectionResult {
  route: 'config' | 'virtualkey' | 'individual';
  selectedConfigs?: PortkeyConfig[];
  selectedVirtualKeys?: Array<{
    vk: PortkeyVirtualKey;
    models: Array<{ id: string }>;
  }>;
  selectedModels?: Array<{ id: string }>;
}

const PORTKEY_BASE = PORTKEY_BASE_URL;
const PORTKEY_NPM = '@ai-sdk/openai-compatible';

/**
 * Build the CachedModel[] and RegistryProvider from a selection result.
 * Exported for unit-testing without mocking the interactive UI layer.
 *
 * SECURITY INVARIANT: x-portkey-api-key is NOT set here.
 * It is injected at materialization time (src/registry/materialize.ts).
 */
export function buildPortkeyRegistryEntry(
  selection: PortkeySelectionResult,
  template: ProviderTemplate,
  now: string,
): { provider: RegistryProvider; models: CachedModel[] } {
  const models: CachedModel[] = [];

  if (selection.route === 'config' && selection.selectedConfigs) {
    for (const cfg of selection.selectedConfigs) {
      // Q4 resolution: one pseudo-model per Config (the Config drives upstream model choice).
      models.push({
        id: `portkey/${cfg.slug}`,
        name: `Portkey: ${cfg.name}`,
        upstreamModelId: `portkey/${cfg.slug}`,
        modelFormat: 'openai',
        npm: PORTKEY_NPM,
        apiUrl: PORTKEY_BASE,
        // Non-secret routing header — x-portkey-api-key is injected at materialize time.
        // Slug is sanitized so a malformed control char can never reach the wire as a header value.
        headers: { 'x-portkey-config': sanitizeRoutingHeaderValue(cfg.slug) },
        portkey: { configSlug: cfg.slug },
      });
    }
  } else if (selection.route === 'virtualkey' && selection.selectedVirtualKeys) {
    for (const { vk, models: vkModels } of selection.selectedVirtualKeys) {
      for (const m of vkModels) {
        models.push({
          id: m.id,
          name: m.id,
          upstreamModelId: m.id,
          modelFormat: 'openai',
          npm: PORTKEY_NPM,
          apiUrl: PORTKEY_BASE,
          headers: { 'x-portkey-virtual-key': sanitizeRoutingHeaderValue(vk.slug) },
          portkey: { virtualKeySlug: vk.slug },
        });
      }
    }
  } else if (selection.route === 'individual' && selection.selectedModels) {
    for (const m of selection.selectedModels) {
      const providerSlug = deriveProviderSlugFromId(m.id);
      const routingHeaders: Record<string, string> = providerSlug
        ? { 'x-portkey-provider': sanitizeRoutingHeaderValue(providerSlug) }
        : {};
      models.push({
        id: m.id,
        name: m.id,
        upstreamModelId: m.id,
        modelFormat: 'openai',
        npm: PORTKEY_NPM,
        apiUrl: PORTKEY_BASE,
        ...(Object.keys(routingHeaders).length > 0 ? { headers: routingHeaders } : {}),
        ...(providerSlug ? { portkey: { providerSlug } } : {}),
      });
    }
  }

  const provider: RegistryProvider = {
    id: 'portkey',
    templateId: 'portkey',
    name: template.name,
    enabled: true,
    authRef: 'keyring:provider:portkey',
    authType: 'api',
    api: {
      npm: PORTKEY_NPM,
      url: PORTKEY_BASE,
    },
    addedAt: now,
    refreshedAt: now,
    modelsCache: {
      fetchedAt: now,
      models,
    },
  };

  return { provider, models };
}

/**
 * Derive the Portkey provider slug from a model catalog id.
 * Model ids like `@openai-prod/gpt-4o` → provider slug `openai-prod`.
 * Plain ids (no `@` prefix) → null (no per-model provider header needed).
 */
export function deriveProviderSlugFromId(modelId: string): string | null {
  if (!modelId.startsWith('@')) return null;
  const slash = modelId.indexOf('/');
  if (slash < 0) return null;
  return modelId.slice(1, slash); // strip leading '@'
}

/**
 * Sanitize a Portkey slug before it is used as an HTTP header VALUE.
 *
 * Slugs (`config.slug`, `vk.slug`, derived provider slug) originate from the
 * Portkey control-plane API response and are interpolated verbatim into the
 * `x-portkey-config` / `x-portkey-virtual-key` / `x-portkey-provider` request
 * headers. Although Node's `fetch`/undici rejects raw CR/LF (so request
 * splitting is not possible), a value carrying CR/LF would throw deep inside
 * the SDK at request time, and control/tab characters would pass through
 * unchecked. Strip CR, LF, and C0 control characters here so a malformed or
 * hostile slug can never reach the wire as a header value.
 */
export function sanitizeRoutingHeaderValue(value: string): string {
  // Drop every C0 control char (code points 0x00-0x1F, incl. CR/LF/TAB/NUL) and
  // DEL (0x7F) without relying on control-char literals in source. Then trim.
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) continue;
    out += ch;
  }
  return out.trim();
}

// ---------------------------------------------------------------------------
// Interactive add flow
// ---------------------------------------------------------------------------

/**
 * Interactive Portkey add flow.
 *
 * Steps:
 * 1. Guard against duplicate provider.
 * 2. Prompt for master API key.
 * 3. Spinner: call listConfigs + listVirtualKeys + listModels concurrently.
 * 4. Dispatch to config / VK / individual selection based on what came back.
 * 5. Persist credential + registry entry.
 */
export async function runPortkeyAddFlow(template: ProviderTemplate): Promise<number> {
  // Guard: already configured.
  const registry = loadRegistry();
  const existing = registry.providers.find(pr => pr.id === 'portkey');
  if (existing) {
    p.log.error(`Portkey is already configured.`);
    p.log.info(`Remove it first with: ${pc.cyan('rflectr providers remove portkey')}`);
    return 1;
  }

  // Prompt for master API key.
  const masterKeyInput = await p.password({
    message: 'Paste your Portkey master API key:',
    validate: v => v.trim() ? undefined : 'API key cannot be empty',
  });
  if (p.isCancel(masterKeyInput)) {
    p.cancel('Cancelled.');
    return 0;
  }
  const masterKey = String(masterKeyInput).trim();

  // Concurrently fetch configs, virtual keys, and models.
  const spinner = p.spinner();
  spinner.start('Fetching your Portkey workspace...');

  const [configsResult, vksResult, modelsResult] = await Promise.all([
    listConfigs(masterKey),
    listVirtualKeys(masterKey),
    listModels(masterKey),
  ]);

  spinner.stop('');

  // If ALL three failed with auth rejection, surface a clear error.
  const allAuthRejected = [configsResult, vksResult, modelsResult].every(
    r => !r.ok && (r.status === 401 || r.status === 403),
  );
  if (allAuthRejected) {
    p.log.error('Portkey master key was rejected (HTTP 401/403).');
    p.log.info(`Check your key at: ${pc.cyan(template.signupUrl ?? 'https://app.portkey.ai/')}`);
    return 1;
  }

  const configs = configsResult.ok ? configsResult.data : [];
  const virtualKeys = vksResult.ok ? vksResult.data : [];
  const models = modelsResult.ok ? modelsResult.data : [];

  const hasConfigs = configs.length > 0;
  const hasVKs = virtualKeys.length > 0;
  const hasModels = models.length > 0;

  if (!hasConfigs && !hasVKs && !hasModels) {
    p.log.error('No Configs, Virtual Keys, or Models were reachable from your Portkey workspace.');
    p.log.info(`Make sure your key has workspace access: ${pc.cyan(template.signupUrl ?? 'https://app.portkey.ai/')}`);
    return 1;
  }

  // Build routing target selection options.
  let selection: PortkeySelectionResult | null = null;

  if (!hasConfigs && !hasVKs && hasModels) {
    // Degenerate case: only models available — skip the routing-target selector.
    selection = await selectIndividualModels(models);
  } else {
    const routeOptions: Array<{ value: string; label: string; hint?: string }> = [];
    if (hasConfigs) {
      routeOptions.push({
        value: 'config',
        label: 'Route through a Config',
        hint: `${configs.length} Config${configs.length === 1 ? '' : 's'} found`,
      });
    }
    if (hasVKs) {
      routeOptions.push({
        value: 'virtualkey',
        label: 'Route through a Virtual Key / Provider',
        hint: `${virtualKeys.length} Virtual Key${virtualKeys.length === 1 ? '' : 's'} found`,
      });
    }
    if (hasModels) {
      routeOptions.push({
        value: 'individual',
        label: 'Pick individual models',
        hint: `${models.length} model${models.length === 1 ? '' : 's'} available`,
      });
    }

    const routeChoice = await p.select({
      message: 'How should rflectr route requests through Portkey?',
      options: routeOptions,
    });
    if (p.isCancel(routeChoice)) {
      p.cancel('Cancelled.');
      return 0;
    }

    if (routeChoice === 'config') {
      selection = await selectConfigs(configs);
    } else if (routeChoice === 'virtualkey') {
      selection = await selectVirtualKeys(virtualKeys, masterKey);
    } else {
      selection = await selectIndividualModels(models);
    }
  }

  if (!selection) {
    // User cancelled during inner selection.
    p.cancel('Cancelled.');
    return 0;
  }

  // Persist credential.
  const credSaved = await saveProviderCredential('keyring:provider:portkey', masterKey);
  if (!credSaved) {
    p.log.error('Could not save Portkey API key to keyring.');
    p.log.info('Grant Keychain access or try again.');
    return 1;
  }

  // Build and persist registry entry.
  const now = new Date().toISOString();
  const { provider } = buildPortkeyRegistryEntry(selection, template, now);

  const freshRegistry = loadRegistry();
  freshRegistry.providers.push(provider);
  saveRegistry(freshRegistry);

  const modelCount = provider.modelsCache?.models.length ?? 0;
  p.log.success(
    `Portkey added — ${modelCount} model${modelCount === 1 ? '' : 's'} configured.`,
  );
  return 0;
}

// ---------------------------------------------------------------------------
// Private selection helpers
// ---------------------------------------------------------------------------

async function selectConfigs(
  configs: PortkeyConfig[],
): Promise<PortkeySelectionResult | null> {
  const options = configs.map(c => ({
    value: c.slug,
    label: c.name,
    hint: c.slug,
  }));

  const picked = await p.multiselect({
    message: 'Select Configs to route through (space to toggle, enter to confirm):',
    options,
    required: true,
  });
  if (p.isCancel(picked)) return null;

  const selectedSlugs = new Set(picked as string[]);
  const selectedConfigs = configs.filter(c => selectedSlugs.has(c.slug));
  return { route: 'config', selectedConfigs };
}

async function selectVirtualKeys(
  virtualKeys: PortkeyVirtualKey[],
  masterKey: string,
): Promise<PortkeySelectionResult | null> {
  const options = virtualKeys.map(vk => ({
    value: vk.slug,
    label: vk.name,
    hint: vk.slug,
  }));

  const picked = await p.multiselect({
    message: 'Select Virtual Keys to route through (space to toggle, enter to confirm):',
    options,
    required: true,
  });
  if (p.isCancel(picked)) return null;

  const selectedSlugs = picked as string[];
  const selectedVKs = virtualKeys.filter(vk => selectedSlugs.includes(vk.slug));

  // Enumerate models for each selected VK.
  const spinner = p.spinner();
  spinner.start('Fetching models for selected Virtual Keys...');

  const selectedVirtualKeys: Array<{ vk: PortkeyVirtualKey; models: Array<{ id: string }> }> = [];
  for (const vk of selectedVKs) {
    const result = await listModels(masterKey, { virtualKey: vk.slug });
    const vkModels = result.ok ? result.data : [];
    selectedVirtualKeys.push({ vk, models: vkModels });
  }

  spinner.stop('');
  return { route: 'virtualkey', selectedVirtualKeys };
}

async function selectIndividualModels(
  models: Array<{ id: string }>,
): Promise<PortkeySelectionResult | null> {
  const options = models.map(m => ({
    value: m.id,
    label: m.id,
    hint: deriveProviderSlugFromId(m.id) ?? '',
  }));

  const picked = await p.multiselect({
    message: 'Select models (space to toggle, enter to confirm):',
    options,
    required: true,
  });
  if (p.isCancel(picked)) return null;

  const selectedIds = new Set(picked as string[]);
  const selectedModels = models.filter(m => selectedIds.has(m.id));
  return { route: 'individual', selectedModels };
}
