# Architecture

System-level design docs and Architecture Decision Records (ADRs).

| Doc | Covers |
|---|---|
| [`system-overview.md`](system-overview.md) | What rflectr is, its surfaces, the shared translation core, env isolation. **Start here.** |
| [`launch-flow-claude.md`](launch-flow-claude.md) | The `rflectr claude` flow: single-model vs switch-menu launch paths. |
| [`ADR-001-data-path-owner-attach-mechanisms.md`](ADR-001-data-path-owner-attach-mechanisms.md) | rflectr attach mechanisms: env redirect, config/profile redirect, and native desktop interception. |
| [`ADR-002-native-desktop-interception.md`](ADR-002-native-desktop-interception.md) | Future Claude Desktop routing uses native interception; 3P gateway config remains fallback. |
| [`ADR-003-local-trust-egress-consent.md`](ADR-003-local-trust-egress-consent.md) | Consent, local trust, bounded egress, redaction, and reversible cleanup for native interception. |

ADRs (when added) live here as `ADR-<n>-<kebab-slug>.md`.
