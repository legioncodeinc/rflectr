<div align="center">

<a href="https://www.ospry.ai">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/legioncodeinc/brands/main/ospry/logos/png/core-assets/transparent/horizontal-white-1024.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/legioncodeinc/brands/main/ospry/logos/png/core-assets/transparent/horizontal-ink-1024.png">
    <img alt="OSPRY" src="https://raw.githubusercontent.com/legioncodeinc/brands/main/ospry/logos/png/core-assets/transparent/horizontal-ink-1024.png" width="300">
  </picture>
</a>

<sub>Want to know what will actually drive more revenue? **[OSPRY](https://www.ospry.ai)** is the insight engine built for exactly that. Check it out at [ospry.ai](https://www.ospry.ai).</sub>

</div>

---

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/legioncodeinc/brands/main/legion-code-inc/logos/legion-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/legioncodeinc/brands/main/legion-code-inc/logos/legion-logo-light.svg">
  <img alt="Legion" src="https://raw.githubusercontent.com/legioncodeinc/brands/main/legion-code-inc/logos/legion-logo-light.svg" width="280">
</picture>

<br>
<br>

# rflectr

### Relay any model into any coding agent.

Launch your tools, switch providers mid-session, and run local API gateways &mdash; all from one CLI.

<br>

[![npm version](https://img.shields.io/npm/v/@legioncodeinc/rflectr?style=for-the-badge&logo=npm&color=CB3837&label=npm)](https://www.npmjs.com/package/@legioncodeinc/rflectr)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%E2%89%A518-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

[![macOS](https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white)](#supported-tools)
[![Windows](https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white)](#supported-tools)
[![Linux](https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux&logoColor=black)](#supported-tools)

<br>

<img alt="rflectr — relay any model into any coding agent. You pick a coding tool, rflectr launches it and routes requests to any model provider you choose." src="https://github.com/legioncodeinc/rflectr/raw/cdaf2738d5e33e83a2c3b09d4bf604ef8426ca86/assets/733630021_1421561133353555_3999689754075308337_n.jpg" width="900">

<br>
<br>

```bash
npm install -g @legioncodeinc/rflectr
```

</div>

---

## What is rflectr?

**rflectr** is an interactive CLI that launches AI coding tools and runs local API gateways on your machine &mdash; so you can point any coding agent at any model provider.

It currently supports **Claude Code**, **Claude Desktop (Cowork + Code)**, the **OpenAI Codex CLI**, the **Codex desktop app**, and the **Google Gemini CLI**.

**Pick your backend:**

| | Backend | Set up with |
|:---:|---|---|
| 🔌 | **Your providers** | `rflectr providers` &mdash; Groq, Mistral, Nvidia, DeepSeek, custom OpenAI/Anthropic endpoints, and more |
| ☁️ | **OpenCode Zen / Go** | Cloud models with your OpenCode API key (optional; add via `rflectr providers`) |
| 📦 | **One-time OpenCode import** | Bring existing OpenCode provider settings into the registry (`rflectr providers import`) |
| 🟢 | **Google Vertex AI** | Claude on Vertex via `rflectr server --vertex` and local gcloud credentials (no OpenCode key required) |

---

## Contents

- [Commands](#commands)
- [Features](#features)
- [Supported tools](#supported-tools)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
- [Server mode](#server-mode)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Commands

> **Platform key:** ✅ supported &nbsp;·&nbsp; ❌ not available. Commands without a platform-specific note run on **macOS, Windows, and Linux**.

| Command | Description | 🍎 macOS | 🪟 Windows | 🐧 Linux |
|---------|-------------|:---:|:---:|:---:|
| `rflectr` | Print help (does not launch Claude Code) | ✅ | ✅ | ✅ |
| `rflectr claude` | Pick a provider → launch Claude Code | ✅ | ✅ | ✅ |
| `rflectr providers` | Add, import, list, remove, and refresh your AI providers | ✅ | ✅ | ✅ |
| `rflectr models` | Manage favorite models for mid-session `/model` switching | ✅ | ✅ | ✅ |
| `rflectr server` | Foreground API gateway (registry providers + optional Zen/Go) | ✅ | ✅ | ✅ |
| `rflectr server --vertex` | Foreground Anthropic-compatible gateway to Claude on Vertex AI | ✅ | ✅ | ✅ |
| `rflectr claude-app` | Launch Claude Desktop app with registry providers · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/claude-desktop.md) | ✅ | ✅ | ❌ |
| `rflectr codex` | Launch OpenAI Codex CLI with registry providers · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/codex.md) | ✅ | ✅ | ✅ |
| `rflectr codex-app` | Launch Codex desktop app with registry providers · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/codex.md) | ✅ | ✅ | ❌ |
| `rflectr gemini` | Launch Google Gemini CLI with registry providers | ✅ | ✅ | ✅ |
| `rflectr --ai` | Full agent reference for scripts and alef-agent · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/ai-agents.md) | ✅ | ✅ | ✅ |

---

## Features

#### 🗂️ Providers & models
- **Native provider registry** &mdash; `rflectr providers` stores config in `~/.rflectr/providers.json` and secrets in the OS keychain. No OpenCode binary required at launch. See the **[Providers guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/providers.md)** for the full list and known issues.
- **Provider templates** &mdash; Add Groq, Mistral, Together, OpenRouter, and 15+ SDK-backed providers, plus custom OpenAI/Anthropic-compatible endpoints.
- **OpenCode import** &mdash; One-time migration from OpenCode (`providers import`); validates API keys and skips placeholders like `anything`.
- **OpenCode Zen / Go** &mdash; Optional cloud backends when you have an OpenCode API key.
- **Favorite models** &mdash; Save up to 20 and switch mid-session with Claude Code's `/model` command.
- **Smart model pickers** &mdash; Recent models per provider, search for large lists (>25), paginated browse (15 per page).
- **Refresh model lists** &mdash; `rflectr providers refresh-models` updates cached catalogs per provider.

#### 🛰️ Gateways & routing
- **SDK adapter proxy** &mdash; Non-Anthropic providers route through the Vercel AI SDK (same packages OpenCode uses), so Claude Code still speaks Anthropic format. Labeled `via proxy` in the picker.
- **API server** &mdash; Run a local gateway on port **`17645`** for Claude Code, Claude Desktop, or any Anthropic-compatible client.
- **Server wizard** &mdash; Filter exposed providers, mask discovery ids for Claude Desktop, optional favorites-only catalog, local vs network listen mode.
- **Vertex gateway** &mdash; Anthropic-compatible Claude on Google Vertex AI using gcloud Application Default Credentials.

#### 🔒 Safety & ergonomics
- **Clean environment isolation** &mdash; We strip 17 conflicting env vars (Vertex AI, Bedrock, AWS, Foundry, stale Anthropic config) from the child process only. We never touch `~/.claude/settings.json` (see caveat below).
- **Secure key storage** &mdash; Per-provider keys and the OpenCode API key go in the OS credential store (macOS Keychain, Windows Credential Manager, Linux Secret Service) or your shell profile.
- **Cross-platform** &mdash; macOS, Windows, Linux (Ubuntu, Fedora, distros with GNOME Keyring or KWallet).
- **Dry run mode** &mdash; Walk through the full wizard and preview the launch command without starting anything.
- **Preference memory** &mdash; Last provider and model are pre-selected next time.
- **Agent / headless launch** &mdash; Boot flags (`--provider`, `--model`), clean NDJSON/JSONL stdout for alef-agent, and `rflectr --ai` reference. See the **[AI Agents guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/ai-agents.md)**.

---

## Supported tools

> **Platform key:** ✅ supported &nbsp;·&nbsp; ❌ not available. Rows without a platform-specific note run on **macOS, Windows, and Linux**. The desktop apps are macOS + Windows only.

| Tool | Command | 🍎 macOS | 🪟 Windows | 🐧 Linux | Status |
|------|---------|:---:|:---:|:---:|--------|
| Provider registry | `rflectr providers` | ✅ | ✅ | ✅ | ✅ Supported · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/providers.md) |
| Claude Code | `rflectr claude` | ✅ | ✅ | ✅ | ✅ Supported |
| Favorite models | `rflectr models` | ✅ | ✅ | ✅ | ✅ Supported |
| OpenCode API server | `rflectr server` | ✅ | ✅ | ✅ | ✅ Supported |
| Vertex API gateway | `rflectr server --vertex` | ✅ | ✅ | ✅ | ✅ Supported |
| Claude Desktop (Cowork + Code) | `rflectr claude-app` | ✅ | ✅ | ❌ | ✅ Supported · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/claude-desktop.md) |
| Codex CLI | `rflectr codex` | ✅ | ✅ | ✅ | ✅ Supported · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/codex.md) |
| Codex desktop app | `rflectr codex-app` | ✅ | ✅ | ❌ | ✅ Supported · [guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/codex.md) |
| Google Gemini CLI | `rflectr gemini` | ✅ | ✅ | ✅ | ⚠️ Experimental · model switching via `.model` prompt |

---

## Prerequisites

| Requirement | Needed for |
|---|---|
| **Node.js 18+** | Everything |
| A supported AI coding tool installed | Launching that tool &mdash; [Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code), [OpenAI Codex](https://www.npmjs.com/package/@openai/codex), or [Google Gemini CLI](https://www.npmjs.com/package/@google/gemini-cli) |
| At least one provider | Configure via `rflectr providers add` / `import`, **or** an [OpenCode API key](https://opencode.ai/auth) for Zen/Go cloud backends |
| [OpenCode CLI](https://opencode.ai) *(optional)* | One-time import from an existing OpenCode setup |
| [Google Cloud SDK](https://cloud.google.com/sdk) *(Vertex only)* | `gcloud auth application-default login`, a GCP project with Vertex AI enabled, and Claude partner models enabled |

> [!NOTE]
> **On providers:** rflectr keeps your provider list in `~/.rflectr/providers.json`. You can add providers directly (API key + template), import from OpenCode once, or use Zen/Go cloud backends. OpenCode is not required after setup.

---

## Installation

Install the CLI globally:

```bash
npm install -g @legioncodeinc/rflectr
```

<details>
<summary><strong>Upgrading & uninstalling</strong></summary>

<br>

**Upgrade to the latest version:**

```bash
npm update -g @legioncodeinc/rflectr
```

**Uninstall:**

```bash
npm uninstall -g @legioncodeinc/rflectr
```

> [!NOTE]
> If you use a Node version manager like **NVM**, run the uninstall command using the active Node version that was used to install it (e.g., run `nvm use <version>` first).

**Remove all configuration data** by deleting the `.rflectr` directory:

| Platform | Command |
|---|---|
| 🍎 macOS / 🐧 Linux | `rm -rf ~/.rflectr` |
| 🪟 Windows (cmd) | `rmdir /s /q "%USERPROFILE%\.rflectr"` |
| 🪟 Windows (PowerShell) | `Remove-Item -Recurse -Force "$env:USERPROFILE\.rflectr"` |

</details>

---

## Setup

### 1. Configure providers

```bash
rflectr providers          # hub: add, import, list, refresh models
rflectr providers add      # pick a template or custom endpoint
rflectr providers import   # one-time migration from OpenCode (optional)
```

On first `rflectr claude` run with an empty registry, an inline wizard walks you through Quick start (Zen), import, or opening `rflectr providers`.

### 2. OpenCode API key *(Zen/Go only)*

Grab your key at [opencode.ai/auth](https://opencode.ai/auth) if you use OpenCode Zen or Go (skip for registry-only or Vertex setups).

| Platform | 🔐 Secure storage | 📄 Plaintext fallback |
|----------|---------------|-------------------|
| 🍎 macOS | Keychain (optional: + `~/.zshrc` auto-load) | Shell profile |
| 🪟 Windows | Credential Manager | `setx` user env var |
| 🐧 Linux (desktop) | Secret Service (GNOME Keyring / KWallet) | Shell profile |
| 🐧 Linux (headless) | *n/a* | Shell profile |

> [!TIP]
> The key is active in your current session right away, no matter which option you pick. No terminal restart needed.

---

## Usage

### Launch Claude Code

```bash
rflectr claude
```

First run: pick a provider from your registry (or complete the inline setup wizard). If you've added OpenCode Zen/Go, those appear alongside registry providers like Groq, Nvidia, or DeepSeek.

#### Favorite models and mid-session switching

Save the models you bounce between:

```bash
rflectr models
```

Add up to 20 favorites from Zen, Go, or any OpenCode-configured provider. When you have favorites, `rflectr claude` starts a multi-route proxy automatically. Claude Code's `/model` command lists your starting model plus favorites. Switch live, no restart.

No favorites? Launch works like before: single model, no switch menu. `--dry-run` ignores saved favorites so you can preview a single-model launch.

#### `rflectr claude` options

| Flag | Description |
|------|-------------|
| `--dry-run` | Run the full wizard but preview the launch command instead of executing |
| `--setup` | Reminder to use `rflectr providers` for provider setup |
| `--trace` | Write debug logs to `~/.rflectr/logs/` and show errors on exit |
| `--help` | Show command help |
| `--version` | Show version |

```bash
rflectr claude --dry-run
rflectr claude --setup
rflectr claude --trace
```

Claude Code flags and session IDs pass through unchanged:

```bash
rflectr claude -c
rflectr claude --resume abc-123
rflectr claude abc-123
```

**Non-interactive / agent launch** &mdash; skip the wizard with boot flags:

```bash
rflectr claude --provider groq --model llama-3.3-70b-versatile -p "Summarize README.md"
rflectr claude --model zen__deepseek-v4-flash-free -p "task" --output-format stream-json
```

| Flag | Description |
|------|-------------|
| `--provider` | Boot provider id (skip wizard with `--model` or in print mode) |
| `--model` | Boot model id, or slug `provider__model-id` |

For alef-agent, NDJSON streaming, Codex `exec --json`, and sandbox defaults, see the **[AI Agents guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/ai-agents.md)** and run `rflectr --ai`.

Use `--` when you want every following token passed directly to Claude Code:

```bash
rflectr claude -- --print "hello"
rflectr claude -- --dangerously-skip-permissions
rflectr claude --dry-run -- --print "test"
```

---

## Server mode

Run rflectr as a foreground API gateway on port **`17645`**:

| Mode | Command | Auth | Models |
|------|---------|------|--------|
| **Registry gateway** | `rflectr server` | Per-provider keys in registry (+ OpenCode key for Zen/Go if exposed) | Providers you configured |
| **Vertex gateway** | `rflectr server --vertex` | gcloud Application Default Credentials | Claude on Vertex AI |

> [!TIP]
> **Claude Desktop (Cowork + Code):** For the automated macOS/Windows setup, use `rflectr claude-app`. For manual or network setups, see the [Claude Desktop guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/claude-desktop.md).

### Registry gateway (`rflectr server`)

Works with any providers in your registry. Zen/Go models appear when you have an OpenCode API key and those providers are exposed.

**The wizard asks:**

| Prompt | What it does |
|--------|--------------|
| **Configure & start** vs **Start with saved settings** | Full wizard or reuse saved server preferences |
| **Exposed providers** | Limit which providers appear in the catalog (Zen, Go, Groq, OpenAI, etc.) |
| **Mask gateway model ids for discovery?** | Recommended **Yes** for Claude Desktop &mdash; hides competitor vendor strings in model ids so discovery works |
| **Expose only favorite models?** | Optional cap at your favorites (manage with `rflectr models`) |
| **Listen mode** | **Local only** (`127.0.0.1`) or **Network** (`0.0.0.0` + server password) |

**Local mode** &mdash; point any Anthropic-compatible client at your machine:

```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:17645/anthropic"
export ANTHROPIC_API_KEY="anything"
```

**Network mode** &mdash; other devices on your LAN:

```bash
export ANTHROPIC_BASE_URL="http://<server-ip>:17645/anthropic"
export ANTHROPIC_API_KEY="<server-password>"
```

By default the server password stays in memory only. If you choose to save it, rflectr stores it in `~/.rflectr/config.json`.

OpenAI-format models also get an OpenAI-compatible endpoint:

```bash
export OPENAI_BASE_URL="http://127.0.0.1:17645/openai/v1"
export OPENAI_API_KEY="anything"
```

**Health check:**

```bash
curl -s http://127.0.0.1:17645/health
curl -s http://127.0.0.1:17645/anthropic/v1/models | head
```

The spinner reports how many models loaded and how many came from registry providers.

### Vertex gateway (`rflectr server --vertex`)

Anthropic-compatible gateway to Claude on Google Vertex AI. No OpenCode API key required.

**Setup:**

```bash
gcloud auth application-default login
export ANTHROPIC_VERTEX_PROJECT_ID="your-gcp-project"   # or GOOGLE_CLOUD_PROJECT
export GOOGLE_CLOUD_LOCATION="global"                   # optional; default: global
rflectr server --vertex
```

- **Default models:** `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5`
- **Shorthand aliases** (for Claude Code `/model` and `settings.json`): `sonnet`, `opus`, `haiku`. Append `[1m]` for 1M context on Sonnet and Opus only (Haiku stays 200k).
- **Custom catalog:** copy `assets/vertex-models.example.json` to `~/.rflectr/vertex-models.json` and edit. Override the config directory with `RFLECTR_HOME`.

When the gateway is running:

```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:17645/anthropic"
export ANTHROPIC_API_KEY="anything"
```

> [!TIP]
> **Claude Code tip:** When routing through the gateway, unset native Vertex env vars so Claude Code doesn't bypass the proxy:
> ```bash
> unset CLAUDE_CODE_USE_VERTEX ANTHROPIC_VERTEX_PROJECT_ID CLOUD_ML_REGION
> ```

### Codex CLI (`rflectr codex`)

Launch [OpenAI Codex CLI](https://developers.openai.com/codex/cli) with registry providers. Requires `npm install -g @openai/codex`.

```bash
rflectr providers add    # Anthropic, xAI, OpenAI, etc.
rflectr codex            # pick provider + model → Codex TUI
```

rflectr writes a **temporary** profile (`~/.codex/rflectr-launch.config.toml`) and removes it when Codex exits. After a crash: `rflectr codex --restore`.

**Sandbox / network:** `rflectr codex` defaults to **`danger-full-access`** (profile + `-s` flag) so shell tools like `curl`, `nlm`, and npm can reach the network. Override for one session:

```bash
rflectr codex -s workspace-write
```

Pass Codex flags directly after `rflectr codex` &mdash; you do **not** need `--` before `-s`. Codex's `--dangerously-bypass-approvals-and-sandbox` also passes through if you need it.

Full details: **[Codex guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/codex.md)** &mdash; CLI + desktop app, configs, restore, sandbox, routing. For agent / alef-agent integration (boot flags, NDJSON, JSONL): **[AI Agents guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/ai-agents.md)** and `rflectr --ai`.

### Claude Desktop app (`rflectr claude-app`)

Launch **Claude Desktop** (macOS or Windows) with registry providers:

```bash
rflectr claude-app
```

This command automates the "Third-Party Inference" (Developer Mode) setup. It temporarily configures Claude Desktop to point at a local gateway, launches the app, and routes traffic to your chosen provider.

- **Keep the terminal open** &mdash; The proxy runs in the foreground.
- **Ctrl+C to restore** &mdash; When you're done, press `Ctrl+C` in the terminal to automatically restore Claude Desktop to its normal Anthropic cloud mode.
- **Cleanup** &mdash; If the terminal crashes, run `rflectr claude-app --restore`.

For manual network setups (e.g., remote cloud desktop), you can still use `rflectr server`. See the full [Claude Desktop Setup Guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/claude-desktop.md).

### Codex desktop app (`rflectr codex-app`)

Launch the **Codex app** (macOS or Windows) with registry providers:

```bash
rflectr codex-app
```

Patches `~/.codex/config.toml` with backup; **Ctrl+C** in the rflectr terminal restores your config. The app keeps Codex's built-in `openai` provider active so existing conversation history remains visible, and routes the selected model through a foreground local proxy. Preview config without writing: `rflectr codex-app --config`. Recovery: `rflectr codex-app --restore`.

See the **[Codex guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/codex.md)** for CLI vs app differences, file ownership, and troubleshooting.

> [!TIP]
> **Reasoning effort:** Capable models show Codex's native reasoning picker (low/medium/high, etc.). rflectr maps your choice to each provider's SDK options and preserves existing `model_reasoning_effort` in Codex config. Claude Code `/effort` and the `rflectr server` gateway use the same mapping &mdash; see the [reasoning section in the Codex guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/codex.md#reasoning-effort).

### Google Gemini CLI (`rflectr gemini`)

Launch the [Google Gemini CLI](https://www.npmjs.com/package/@google/gemini-cli) with registry providers.

```bash
rflectr gemini
```

Pick provider → pick model → Gemini prompt loop opens. Non-interactive tasks with streaming NDJSON are also fully supported:

```bash
rflectr gemini --provider google --model gemini-2.5-flash -p "Review this file" -o stream-json
```

For agent / alef-agent integration (boot flags, NDJSON): **[AI Agents guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/guides/ai-agents.md)** and `rflectr --ai`.

---

## How it works

### OpenCode Zen / Go filtering

When OpenCode Zen is in your registry, `subscriptionFilter` controls which Zen models appear (`free` = free tier only; default = all Zen models). Add or change Zen via `rflectr providers`.

### Environment isolation

When you launch, rflectr builds a clean child environment:

1. Removes 17 conflicting env vars from the child process (Vertex AI, Bedrock, AWS, Foundry, stale Anthropic config)
2. Sets `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_MODEL` for the session
3. Passes `--model <selected>` to Claude Code as a backup override

When Claude Code exits (normal exit, Ctrl+C, terminal close), your shell is unchanged. No cleanup step. No restore needed.

> [!WARNING]
> **Claude Code persists the model.** rflectr doesn't edit `~/.claude/settings.json`, but Claude Code saves the model you launched with (via `--model` and `ANTHROPIC_MODEL`). A later bare `claude` launch may still show that model, e.g. `anthropic-opencode-go__deepseek-v4-flash` from a prior rflectr session. To get back to a first-party default, run `claude --model sonnet` (or your preferred Claude model), or remove the `"model"` key from `~/.claude/settings.json`. If you used the favorites switch menu, Claude Code may also cache the gateway catalog at `~/.claude/cache/gateway-models.json`. Delete that file if `/model` shows stale entries from a dead proxy.

### Model compatibility

OpenCode exposes models through different API formats. rflectr handles them when it can:

| Model format | Examples | How it works | Label |
|---|---|---|---|
| **Anthropic native** | Claude, Qwen, MiniMax (Go) | Direct connection | *(none)* |
| **OpenAI chat completions** | DeepSeek, Kimi, MiMo, GLM, Grok, GPT-4o | SDK adapter proxy (Vercel AI SDK) | `via proxy` |
| **OpenAI Responses API** | GPT-5.4+, GPT-5.5, Codex, o-series | Same proxy; SDK picks Responses API | `via proxy` |
| **Gemini native** | Gemini (OpenCode Google provider) | SDK adapter, Gemini native API | `via proxy` |
| **Other SDK providers** | Cerebras, Perplexity, Bedrock, Vertex, Together AI | Whatever `api.npm` OpenCode assigns | `via proxy` |
| **Not in cloud wizard** | GPT, Gemini on OpenCode Zen/Go | Use an OpenCode-configured provider instead | `not yet supported` |

The SDK adapter proxy starts on a random local port for proxy-routed models and stops when Claude Code exits. Each `rflectr claude` session gets its own port, so multiple terminals are fine. (`rflectr server` uses fixed port `17645` &mdash; one server instance per machine.)

### Provider notes

> [!NOTE]
> **Mistral (free tier):** Rate limits are tight. Expect HTTP 429 during tool-heavy sessions. Claude Code retries with backoff. That's Mistral throttling, not a proxy bug.

> [!NOTE]
> **OpenAI (OpenCode-configured provider):** Configure OpenAI in [OpenCode](https://opencode.ai) with your API key, then pick the OpenAI provider at launch. Newer GPT models use OpenAI's Responses API. The SDK picks `responses` vs `chat` from the model ID. OpenCode catalog IDs can differ from API IDs (e.g. `gpt-5.5-fast` maps to upstream `gpt-5.5`). If you see "model not available", run `rflectr claude --trace` and check `~/.rflectr/logs/claude-debug.log`.

`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` is set for direct (non-proxy) routes only. Proxy sessions keep tool-search betas.

### API key storage

rflectr uses [`@napi-rs/keyring`](https://www.npmjs.com/package/@napi-rs/keyring) for the OS credential store. On later runs it checks silently. Key found? Wizard skips the prompt.

| Platform | Credential store | Notes |
|----------|-----------------|-------|
| 🍎 macOS | macOS Keychain | Optional `~/.zshrc` auto-load line for system-wide availability |
| 🪟 Windows | Windows Credential Manager | `setx` available as plaintext alternative |
| 🐧 Linux (desktop) | Secret Service API (GNOME Keyring, KWallet) | Needs a running keyring daemon |
| 🐧 Linux (headless) | Not available | Falls back to shell profile or session-only |

If the native module fails to load, credential store options are skipped and you get shell profile / session-only storage.

---

## Configuration

**Provider registry** (no secrets in this file):

```text
~/.rflectr/providers.json
```

Manage with `rflectr providers`. API keys are stored in the OS keychain (`keyring:provider:<id>`).

**App preferences** &mdash; favorites, last provider/model, server settings, optional server password:

```text
~/.rflectr/config.json
```

**Override the config directory:**

```bash
export RFLECTR_HOME="/path/to/your/rflectr-home"
```

The OpenCode API key (for Zen/Go) and per-provider keys are stored separately, based on what you chose during setup (Keychain, credential store, or shell profile).

---

## Troubleshooting

See the **[Troubleshooting guide](https://github.com/legioncodeinc/rflectr/blob/main/library/knowledge/public/faqs/troubleshooting.md)** for common issues &mdash; especially **"Not logged in"** after accidentally choosing **No** on Claude Code's custom API key prompt.

<details>
<summary><strong>Upgrading from opencode-starter</strong></summary>

<br>

If you used the old **opencode-starter** CLI, rflectr migrates automatically on first run:

- Config moves from `~/.opencode-starter/` → `~/.rflectr/`
- Legacy Keychain / credential-store entries are read and re-saved under `rflectr`
- The CLI command is now `rflectr` (not `opencode-starter`)
- Launch Claude Code with `rflectr claude` (bare `rflectr` prints help)

The deprecated `OPENCODE_STARTER_HOME` env var still works as a fallback for `RFLECTR_HOME`.

</details>

---

## Contributing

Public beta right now. Issues and PRs welcome on [GitHub](https://github.com/legioncodeinc/rflectr).

## Disclaimer

This project and its creator have **no affiliation** with OpenCode, Anthropic, Claude, Google, or any other vendor named or integrated here. Trademarks belong to their respective owners.

rflectr was built for **education and research**.

---

## License

rflectr is free software, licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

You may use, study, share, and modify it. If you run a modified version to provide a network service, or you distribute it, you must make the complete corresponding source code available under the same license. See [`LICENSE`](LICENSE) for the full terms.

Copyright © 2026 Legion Code Inc. (Mario Aldayuz).

---

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/legioncodeinc/brands/main/legion-code-inc/logos/legion-symbol-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/legioncodeinc/brands/main/legion-code-inc/logos/legion-symbol-light.svg">
  <img alt="Legion symbol" src="https://raw.githubusercontent.com/legioncodeinc/brands/main/legion-code-inc/logos/legion-symbol-light.svg" width="32">
</picture>

<sub>We are Legion. Vibe with Legion.</sub>

</div>
