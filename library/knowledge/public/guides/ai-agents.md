# AI Agents & Automation

> Category: Guide | Version: 1.0 | Date: June 2026 | Status: Active

rflectr is built so **AI agents** (scripts, CI, alef-agent, Cursor subagents, …) can launch Claude Code, OpenAI Codex, or Google Gemini CLI against your provider registry **without interactive wizards**, with **clean machine-readable stdout** when needed.

For the full machine-readable reference — including your live provider/model list — run:

```bash
rflectr --ai
rflectr --ai --install    # install SKILL.md to agent skill dirs
```

---

## Quick reference

| Goal | Command |
|---|---|
| Agent reference | `rflectr --ai` |
| Install agent skill | `rflectr --ai --install` |
| Claude one-shot (text) | `rflectr claude --provider <id> --model <id> -p "prompt"` |
| Claude NDJSON stream | `rflectr claude --provider <id> --model <id> -p "…" --output-format stream-json` |
| Codex one-shot (text) | `rflectr codex --provider <id> --model <id> exec "prompt"` |
| Codex JSONL events | `rflectr codex --provider <id> --model <id> exec --json "prompt"` |
| Gemini one-shot (text) | `rflectr gemini --provider <id> --model <id> -p "prompt"` |
| Gemini NDJSON stream | `rflectr gemini --provider <id> --model <id> -p "…" -o stream-json` |
| Model slug | `--model zen__deepseek-v4-flash-free` (= `--provider zen --model deepseek-v4-flash-free`) |
| List providers/models | `rflectr providers list` or read `~/.rflectr/providers.json` |

---

## Boot flags (`--provider` / `--model`)

rflectr consumes these flags **before** spawning the child. They are **not** passed through.

| Flag | Purpose |
|---|---|
| `--provider <id>` | Registry provider id (`groq`, `google`, `zen`, `go`, …). |
| `--model <id>` | Model id from that provider's cache. |
| `--model <provider>__<model-id>` | Slug form — provider embedded in the model string. |

### When the wizard is skipped

- **Claude (`rflectr claude`):** both `--provider` and `--model` set, **or** print mode (`-p` / `--print`) with saved prefs from a prior interactive launch.
- **Codex (`rflectr codex`):** both flags set, **or** non-interactive args (`exec` or a positional prompt) with saved prefs.
- **Gemini (`rflectr gemini`):** both flags set, **or** non-interactive args (`-p`, `-i`, or a positional query) with saved prefs.

> In CI / headless loops, **always pass `--provider` and `--model`** — never rely on saved prefs alone.

### Examples

```bash
# Claude — explicit boot
rflectr claude --provider groq --model llama-3.3-70b-versatile -p "Summarize README.md"
# Claude — slug
rflectr claude --model zen__deepseek-v4-flash-free -p "Review this diff"

# Codex — explicit boot
rflectr codex --provider openai --model gpt-5.4 exec "implement feature X"
# Codex — slug
rflectr codex --model zen__deepseek-v4-flash-free exec "fix the test"

# Gemini — explicit boot
rflectr gemini --provider google --model gemini-2.5-flash -p "Review this file"
# Gemini — slug
rflectr gemini --model zen__deepseek-v4-flash-free -p "Refactor the module"
```

---

## Clean stdout for NDJSON / JSONL

When an agent parses **every line on stdout as JSON**, rflectr must not print boot UI (intro, spinner, proxy banners) on stdout. It detects machine-readable mode and **suppresses all boot UI on stdout** — messages still go to **stderr**.

| Agent | Trigger | Child output |
|---|---|---|
| Claude | `-p` + `--output-format stream-json` or `json` | NDJSON (one object per line) |
| Claude | `-p` + `--input-format stream-json` | NDJSON |
| Codex | `exec --json` | JSONL event stream |
| Gemini | `-p` + `-o stream-json` or `json` | NDJSON |

> **Claude `--verbose`** is required by Claude Code for `stream-json` in print mode. rflectr **auto-adds `--verbose`** when it's missing.

**Verify clean stdout:**

```bash
rflectr claude --provider zen --model deepseek-v4-flash-free \
  -p "PONG" --output-format stream-json 2>/dev/null \
  | node -e "process.stdin.on('data',d=>d.toString().split('\n').filter(Boolean).forEach(l=>JSON.parse(l))); console.log('ok')"
```

Interactive TTY launches (`rflectr claude` with no `-p`) still show the normal human UI.

---

## Codex sandbox (network for shell tools)

`rflectr codex` defaults to **`danger-full-access`** — written into the launch profile (`sandbox = "danger-full-access"`) and passed on spawn as `-s danger-full-access` (needed on macOS even when in the profile). This lets Codex shell tools reach the network (`curl`, `nlm`, npm, MCP CLIs).

```bash
rflectr codex -s workspace-write exec "task"                       # override for one session
rflectr codex --dangerously-bypass-approvals-and-sandbox exec "x"  # bypass entirely (Codex flag)
```

`rflectr codex-app` does **not** change your personal `~/.codex/config.toml` sandbox. See [Codex § Sandbox](codex.md#sandbox-and-network-cli).

---

## Provider discovery

**Machine-readable catalog (recommended for agents):**

```text
~/.rflectr/providers.json
  → providers[].id
  → providers[].modelsCache.models[].id
  → providers[].enabled
```

```bash
rflectr providers refresh-models          # refresh all stale lists
rflectr providers refresh-models groq      # refresh one provider
```

**Built-in cloud providers** (not in `providers.json`): `zen` and `go`, both requiring `OPENCODE_API_KEY`.

**Preview without launching:**

```bash
rflectr claude --dry-run --provider groq --model llama-3.3-70b-versatile
rflectr codex --config --provider zen --model deepseek-v4-flash-free
```

---

## Tool calling & MCP

**Claude Code** — pass tool flags **after** rflectr's boot flags (they go to Claude):

```bash
rflectr claude --provider google --model gemini-2.5-flash \
  -p "How many notebooks?" \
  --output-format stream-json \
  --allowed-tools mcp__notebooklm-mcp__notebook_list
```

**Codex** — MCP servers come from your Codex config (`~/.codex/config.toml`), not rflectr. With default `danger-full-access`, network-blocked MCP/CLI errors should be resolved; MCP must still be configured in Codex.

---

## Multi-model agent loops

```bash
for model in llama-3.3-70b-versatile mixtral-8x7b-32768; do
  rflectr claude --provider groq --model "$model" -p "Same prompt for all models"
done

for model in deepseek-v4-flash-free qwen3.6-plus-free; do
  rflectr codex --provider zen --model "$model" exec --json "Same task"
done

for model in gemini-2.5-flash gemini-2.5-pro; do
  rflectr gemini --provider google --model "$model" -p "Same task"
done
```

Boot flags use **single-model launch** (the favorites catalog is skipped) — better for one-shot jobs. Use `rflectr models` + interactive launch for mid-session `/model` switching.

---

## Zen / Go cloud providers

For Claude `-p` and Codex `exec` against OpenCode Zen or Go:

- Pass `--provider zen` or `--provider go` explicitly in agent configs.
- Ensure `OPENCODE_API_KEY` is in the environment or OS keychain (rflectr resolves it before launch).

---

## Codex proxy notes (DeepSeek / reasoning models)

Non-OpenAI models routed through rflectr's Codex proxy use the Responses API adapter. **Reasoning content** from thinking models (e.g. DeepSeek) is round-tripped on tool loops, so turn 2+ doesn't fail with missing `reasoning_content`.

---

## alef-agent integration

alef-agent shells out to CLI backends and parses **NDJSON/JSONL on stdout**. Use rflectr as the **wrapper executable** with boot flags prepended.

**Claude backend (stream-json):**

```bash
rflectr claude --provider <id> --model <id> -p "<prompt>" \
  --output-format stream-json [--verbose] \
  [--max-turns, --permission-mode, --allowed-tools, …]
```

**Codex backend (exec --json):**

```bash
rflectr codex --provider <id> --model <id> exec --json "<prompt>" [codex flags]
```

**Gemini backend (stream-json):**

```bash
rflectr gemini --provider <id> --model <id> -p "<prompt>" -o stream-json [gemini flags]
```

### Checklist

1. **Executable:** `rflectr` on `PATH` (`npm link` after dev builds).
2. **Always set** `--provider` + `--model` (or a slug on `--model`).
3. **Claude:** use `--output-format stream-json`; rflectr adds `--verbose` if needed.
4. **Codex:** use `exec --json` — **not** `-p` (in Codex, `-p` means profile).
5. **Gemini:** use `-o stream-json` or `-o json` with `-p`.
6. **Parse stdout only** — boot/errors go to stderr in machine-readable mode.
7. **Codex network:** the default sandbox is already full access; no extra `-s` needed.
8. **Discovery:** run `rflectr --ai` or read `providers.json` to populate model lists.
9. **Skill:** `rflectr --ai --install` drops `rflectr-cli/SKILL.md` into agent skill dirs.

### Stdout contract

```text
stderr  → rflectr boot/errors (safe to log; ignore for parsing)
stdout  → child NDJSON/JSONL only (when stream-json / exec --json)
exit    → rflectr exit code (non-zero on launch/config errors)
```

The full alef section is also embedded at the bottom of `rflectr --ai`.

---

## Agent rules of thumb

**Do:**

- Run `rflectr --ai` when unsure.
- Use `--provider` + `--model` for every headless invocation.
- Use Claude `-p` / Codex `exec` for one-shots that must exit.
- Read `providers.json` for authoritative model ids.
- Send machine-readable flags so stdout stays parseable.

**Don't:**

- Rely on interactive wizards in CI or agent loops.
- Pass `--provider` / `--model` to Claude/Codex/Gemini directly — rflectr consumes them.
- Use Codex `-p` for print mode (it's `--profile` in Codex).
- Expect the favorites catalog in print/exec mode — use explicit boot flags.
- Edit `~/.claude/settings.json`, `~/.gemini/config/config.json`, or `~/.codex/config.toml` from rflectr — it uses env + temporary overlays.

---

## Troubleshooting (agents)

| Symptom | Fix |
|---|---|
| JSON parse error on first stdout lines | Missing `--output-format stream-json` (Claude) or `exec --json` (Codex). |
| `Print mode requires --provider and --model` | Add boot flags, or run interactive once to save prefs. |
| `requires an interactive terminal` (Codex) | Add `--provider` and `--model`. |
| Zen/Go "Not logged in" | Set `OPENCODE_API_KEY`; pass `--provider zen` explicitly. |
| Codex shell network blocked | Should be default; confirm `rflectr codex --config` shows `sandbox = "danger-full-access"`. |
| DeepSeek tool loop 400 | Update rflectr — reasoning round-trip fix in the Codex proxy. |
| Stale overlay after crash | `rflectr codex --restore`. |

See [Troubleshooting](../faqs/troubleshooting.md) for general rflectr issues.

---

## Related guides

- [Codex](codex.md) · [Gemini CLI](gemini-cli.md) · [Providers](providers.md) · [Troubleshooting](../faqs/troubleshooting.md)
