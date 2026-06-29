// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
// src/registry/portkey/types.ts — Portkey control-plane domain types

/** A saved Portkey Config (routing / fallback / cache rules). */
export interface PortkeyConfig {
  id: string;
  name: string;
  slug: string;
  isDefault?: boolean;
  status?: string;
}

/** A Portkey Virtual Key (deprecated upstream in favour of Integrations/Providers). */
export interface PortkeyVirtualKey {
  name: string;
  slug: string;
}

/** A model returned by the Portkey Model Catalog. Ids look like `@openai-prod/gpt-4o`. */
export interface PortkeyModel {
  id: string;
}

/**
 * Describes which Portkey routing directive to attach to a request.
 * Exactly one of the three fields should be present.
 */
export type PortkeyRoutingTarget =
  | { config: string; virtualKey?: never; provider?: never }
  | { virtualKey: string; config?: never; provider?: never }
  | { provider: string; config?: never; virtualKey?: never };
