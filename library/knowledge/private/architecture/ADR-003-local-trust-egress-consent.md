# ADR-003: Local Trust, Egress, and Consent for Native Desktop Interception

> Category: Architecture | Version: 1.0 | Date: June 2026 | Status: Active

Native desktop interception requires explicit trust, bounded egress, and reversible installation.

---

## Context

The native desktop interception transport terminates TLS for a user's own desktop app traffic on the user's machine. That is a larger trust boundary than env-var redirects or local config profiles. The old rflectr security docs name this directly: the local proxy can see prompts, responses, authorization headers, cookies, and other provider traffic unless implementation narrows what it parses and logs.

The current rflectr codebase already has strong local-first patterns: loopback ports, no raw API key display, credential redaction, and backup/restore for config-patched desktop apps. Native interception needs a stronger and more explicit contract.

## Decision

Native desktop interception must ship with these controls:

- **Explicit consent:** installing a trusted CA and proxying a desktop app requires a plain-language confirmation.
- **Per-install CA:** the CA is unique to the local machine and removable by rflectr.
- **Narrow proxy scope:** prefer per-app proxy configuration; use system proxy only as a documented fallback.
- **Allowlisted egress:** the proxy forwards only app provider hosts and configured routing gateway hosts. Future memory or policy hosts must be added deliberately.
- **Secret redaction:** authorization headers, cookies, API keys, and tokens are never logged, captured, rendered in dashboard, or written to PRD/QA fixtures.
- **Reversible uninstall:** dashboard and CLI must provide stop, uninstall, and trust cleanup paths.
- **Empirical app gates:** no app/OS pair is enabled until proxy use and no-pinning behavior are verified.

## Consequences

- The implementation needs new modules for CA lifecycle, proxy settings, egress allowlisting, leak-attempt logging, and desktop proxy status.
- The dashboard must show trust state and uninstall state, not only "configured".
- Tests need redaction assertions and destructive-action idempotence checks.
- Any future policy guard or memory feature must use the same native interception trust surface, not bolt on a separate hidden proxy.

## Alternatives Considered

### Silent local proxy installation

Rejected. Installing a trusted CA without explicit consent is unacceptable.

### System proxy as the default

Rejected as a default. It can be a fallback, but per-app scope is the safer user experience where achievable.

### No egress allowlist for local desktop proxy

Rejected. Without an allowlist, native interception increases trust burden without a provable boundary.

## Related

- [`../security/desktop-egress-and-trust.md`](../security/desktop-egress-and-trust.md)
- [`../integrations/native-desktop-interception.md`](../integrations/native-desktop-interception.md)
- [`ADR-002-native-desktop-interception.md`](ADR-002-native-desktop-interception.md)
- `rflectr.old/library/knowledge/private/security/desktop-egress-and-trust.md`
