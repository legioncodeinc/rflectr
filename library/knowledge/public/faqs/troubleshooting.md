# Troubleshooting

> Category: FAQ | Version: 1.0 | Date: June 2026 | Status: Active

Common issues when launching **Claude Code** through `rflectr claude`. For Claude Desktop gateway issues, see the [Claude Desktop guide](../guides/claude-desktop.md). For agent/headless issues, see [AI Agents & automation](../guides/ai-agents.md).

---

## "Not logged in · Please run /login" after picking a model

**What you see:** Claude Code starts and shows the right model in the status bar (e.g. `moonshotai/kimi-k2.6`), but sending a message returns `Not logged in · Please run /login`.

**Common cause — you chose "No" on the API key prompt.** When Claude Code detects an `ANTHROPIC_API_KEY` in the session (rflectr sets this for your chosen provider), it may ask:

```text
Detected a custom API key in your environment
Do you want to use this API key?
  1. Yes
  2. No (recommended)
```

If you pick **No**, Claude Code remembers that and refuses to use the key. rflectr is routing through your provider correctly — Claude Code is blocking the key you rejected. This is **not** a rflectr bug and doesn't mean your provider is misconfigured.

**Fix — approve the key in Claude Code's config.** Claude Code stores your answer in `~/.claude.json` under `customApiKeyResponses`.

1. Quit Claude Code.
2. Open `~/.claude.json`.
3. Find the key suffix shown in the prompt (the last part of the masked key, e.g. `iFYB03v8xy4E-xJEYpN8`).
4. Move that suffix from `rejected` to `approved`:

```json
"customApiKeyResponses": {
  "approved": ["anything", "iFYB03v8xy4E-xJEYpN8"],
  "rejected": []
}
```

5. Save and run `rflectr claude` again.

> 💡 **Easier next time:** choose **Yes** when the prompt appears — Claude Code remembers approved keys and won't ask again.

**If you use Claude Max / Pro elsewhere:** you may also have a real Anthropic key in your shell (`~/.zshrc`, etc.). That's fine for other tools. rflectr replaces `ANTHROPIC_API_KEY` in the Claude Code child process with your **provider** key (OpenCode, Nvidia, Groq, …). Pick **Yes** when launching through rflectr.

---

## Provider works in `rflectr models` but not in `providers list`

Zen and Go are **cloud builtins** — they appear when you have an OpenCode API key, even if they aren't saved in `~/.rflectr/providers.json`. `rflectr providers list` shows them tagged `· cloud builtin`. Imported BYOK providers (Anthropic, Nvidia, Groq, …) come from the registry file.

---

## OpenCode import saved placeholder API keys

If you ran `rflectr providers import` on an older build and see refresh failures for Anthropic (`anything`) or Vertex (`a`), those came from **OpenCode's config**, not Claude Desktop.

**Current behavior:** import validates keys before saving to the keychain:

- Placeholders like `anything`, `a`, `ollama` → **not saved** (models still imported).
- Real keys → probed against the provider API before save.
- Vertex / Bedrock / Azure → key not saved (gcloud / AWS auth).

**To clean up an old placeholder:** re-run import (choose **Use imported** for each provider), or remove the provider and import again:

```bash
rflectr providers import
```

---

## Use `--trace` for proxy / API errors

If a model fails mid-session (not the login prompt above):

```bash
rflectr claude --trace
```

After exit, rflectr prints errors from `~/.rflectr/logs/claude-debug.log` (secrets redacted in the summary). The proxy also logs to `~/.rflectr/logs/proxy-debug.log` when `--trace` is set.

---

## Still stuck?

1. `rflectr providers list` — confirm the provider is there and enabled.
2. `rflectr claude --dry-run` — preview provider, model, and endpoint without launching.
3. Open a GitHub issue with the provider name, model id, and (redacted) error text.

---

## Related guides

- [Claude Desktop](../guides/claude-desktop.md) · [Codex](../guides/codex.md) · [AI Agents](../guides/ai-agents.md) · [Providers](../guides/providers.md)
