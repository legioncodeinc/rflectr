# Security

Credential handling, environment isolation, and trust boundaries.

| Doc | Covers |
|---|---|
| [`credential-storage.md`](credential-storage.md) | Keyring accounts, credential resolution order, the `buildChildEnv` contract (set/removed vars), per-platform key setup, trust boundaries, server-mode caveat. |
| [`desktop-egress-and-trust.md`](desktop-egress-and-trust.md) | Native desktop interception trust boundary, consent model, egress allowlist, redaction, and cleanup contract. |

For the OAuth sign-in flows that produce stored tokens, see [`../auth/oauth-device-flows.md`](../auth/oauth-device-flows.md).
