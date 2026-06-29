// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
// src/registry/types.ts — native provider registry schema (no secrets)

export const REGISTRY_SCHEMA_VERSION = 1;

export type RegistrySubscriptionFilter = 'free' | 'zen' | 'go';

export interface CachedModel {
  id: string;
  name: string;
  upstreamModelId: string;
  family?: string;
  brand?: string;
  contextWindow?: number;
  cost?: { input: number; output: number };
  modelFormat: 'anthropic' | 'openai';
  /** Per-model override — wins over provider-level api.npm */
  npm?: string;
  /** Per-model override — wins over provider-level api.url */
  apiUrl?: string;
  sourceBackend?: string;
  /** Provider-reported request parameters, e.g. OpenRouter supported_parameters. */
  supportedParameters?: string[];
  /** Broad model metadata: model can produce reasoning/thinking output. */
  reasoning?: boolean;
  /** Streaming/interleaved reasoning field name from metadata, e.g. reasoning_content. */
  interleavedReasoningField?: string;
  /**
   * Non-secret per-model routing headers (e.g. x-portkey-virtual-key, x-portkey-config).
   * Merged over provider-level api.headersTemplate at materialization.
   * NEVER include secret values here — those are injected at runtime from the keyring.
   */
  headers?: Record<string, string>;
  /**
   * Portkey-specific display/refresh hint for this model entry.
   * Carries the slug identifiers used to reconstruct routing during refresh.
   */
  portkey?: {
    configSlug?: string;
    virtualKeySlug?: string;
    providerSlug?: string;
  };
}

export interface RegistryProvider {
  id: string;
  templateId: string;
  name: string;
  enabled: boolean;
  authRef: string;
  authType?: 'api' | 'oauth' | 'none';
  subscriptionFilter?: RegistrySubscriptionFilter;
  api: {
    npm?: string;
    url?: string;
    id?: string;
    /**
     * Non-secret provider-wide routing headers applied to every model (e.g. a default
     * x-portkey-config chosen during provider setup).
     * NEVER include secret values here — those are injected at runtime from the keyring.
     */
    headersTemplate?: Record<string, string>;
  };
  modelsCache?: {
    fetchedAt: string;
    models: CachedModel[];
  };
  addedAt: string;
  refreshedAt?: string;
}

export interface ProviderRegistry {
  schemaVersion: number;
  providers: RegistryProvider[];
  importedAt?: string;
  pricingCacheAt?: string;
}
