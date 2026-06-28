// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Legion Code Inc. (Mario Aldayuz)
// oauth/refresh.ts — refresh OAuth tokens before inference

import { refreshOpenAiAccessToken } from './openai.js';
import { refreshGithubCopilotToken } from './github.js';
import type { StoredOAuthCredential } from './types.js';
import { accessTokenIsExpiring, NATIVE_OAUTH_PROVIDER_IDS, oauthCredentialNeedsRefresh, tokensToStoredCredential } from './types.js';
import { refreshXaiAccessToken } from './xai.js';

export function oauthCredentialShouldRefresh(
  cred: StoredOAuthCredential,
  providerId: string,
): boolean {
  if (oauthCredentialNeedsRefresh(cred)) return true;
  // All native OAuth providers use short-lived access tokens — check expiry proactively
  if ((NATIVE_OAUTH_PROVIDER_IDS as readonly string[]).includes(providerId) && accessTokenIsExpiring(cred.access)) return true;
  return false;
}

export async function refreshStoredOAuthCredential(
  providerId: string,
  cred: StoredOAuthCredential,
): Promise<StoredOAuthCredential> {
  if (!cred.refresh) {
    throw new Error(`${providerId}: OAuth refresh token missing — run rflectr providers auth ${providerId}`);
  }

  let tokens;
  if (providerId === 'openai' || providerId === 'openai-oauth') {
    tokens = await refreshOpenAiAccessToken(cred.refresh);
  } else if (providerId === 'xai' || providerId === 'xai-oauth') {
    tokens = await refreshXaiAccessToken(cred.refresh);
  } else if (providerId === 'github-copilot') {
    // cred.refresh is the long-lived ghu_ token; re-exchange for a new Copilot session token
    tokens = await refreshGithubCopilotToken(cred.refresh);
  } else {
    throw new Error(`OAuth refresh not implemented for provider "${providerId}"`);
  }

  return tokensToStoredCredential(tokens, cred.refresh, cred.accountId);
}
