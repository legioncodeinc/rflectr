# Claude Desktop Setup

> Category: Guide | Version: 1.0 | Date: June 2026 | Status: Active

Point **Claude Desktop** at an **rflectr** gateway on your machine. This guide documents the legacy third-party gateway fallback path. The newer native interception architecture keeps Claude Desktop on its normal app path after live verification; use the legacy gateway mode when native interception is unsupported, not yet verified, or explicitly preferred.

In legacy gateway mode, you get OpenCode Zen, Go, and your configured providers (Groq, Mistral, OpenAI, Gemini, Ollama, ...) in Desktop's model picker, with a catalog size you control.

**What's available:** with third-party inference, Desktop gives you **Cowork** and **Code** only. The regular **Chat** tab (claude.ai-style chat) is not available in this mode. Anthropic calls this **third-party inference** in the Developer menu.

For Anthropic's upstream docs, see [Installation and setup](https://claude.com/docs/cowork/3p/installation) and [Configuration reference](https://claude.com/docs/cowork/3p/configuration).

---

## Contents

- [What you get](#what-you-get)
- [Known limitations](#known-limitations)
- [Prerequisites](#prerequisites)
- [Quick start: automated setup](#quick-start-automated-setup)
- [Manual setup (network / advanced)](#manual-setup-network--advanced)
- [Gateway values cheat sheet](#gateway-values-cheat-sheet)
- [Restore Claude Desktop to Anthropic's servers](#restore-claude-desktop-to-anthropics-servers)
- [Disable Developer Mode](#disable-developer-mode)
- [Troubleshooting](#troubleshooting)
- [Official references](#official-references)

---

## What you get

| Piece | Role |
|---|---|
| `rflectr server` | Local gateway on port **17645** — Zen, Go, and registry providers. |
| Claude Desktop gateway config | Desktop sends inference to your machine instead of only claude.ai. |
| Server wizard filters | Exposed providers, optional favorites-only catalog, discovery-id masking. |
| **Cowork** tab | Agentic sessions (files, research, multi-step) against your gateway models. |
| **Code** tab | Claude Code inside Desktop, against your gateway models. |

**Not included:** Chat (the standard claude.ai chat UI). For that, sign in to Claude Desktop normally without a custom gateway, or use claude.ai in the browser. Billing runs through your OpenCode / provider keys. Keep the server terminal open while you use Desktop.

---

## Known limitations

These are Anthropic product constraints, not rflectr bugs.

| Feature | With rflectr gateway (3P) | With Anthropic 1P (normal sign-in) |
|---|---|---|
| **Chat tab** | Not available | Available |
| **Cowork / Code** | Available | Available (with subscription) |
| **Claude in Chrome** (browser extension) | **Not available** | Requires Pro, Max, Team, or Enterprise |

### Claude in Chrome does not work with the gateway

**Claude in Chrome** (Anthropic's browser-automation extension) is **not compatible** with third-party inference — including a rflectr gateway on `127.0.0.1`. Per Anthropic's [Claude Code + Chrome docs](https://code.claude.com/docs/en/chrome):

- It requires a direct Anthropic plan (Pro, Max, Team, or Enterprise).
- It is **not available** through third-party providers (Bedrock, Vertex, Foundry, or a custom gateway).
- Using Claude exclusively through a gateway means you'd need a **separate claude.ai paid account** for Claude in Chrome — and that extension routes through **Anthropic's servers**, not your gateway.

API/console credits do not unlock it. **What gateway users can do instead:** use Cowork and Code in Desktop (this guide), use `rflectr claude` in the terminal, or use a dedicated browser-automation tool (e.g. Playwright, a browser MCP). To use Claude in Chrome, [restore 1P mode](#restore-claude-desktop-to-anthropics-servers) and sign in with a paid claude.ai plan.

---

## Prerequisites

1. **rflectr** installed: `npm install -g @legioncodeinc/rflectr`.
2. **OpenCode API key** configured at least once (for `rflectr server`):
   ```bash
   rflectr providers add   # if starting fresh
   rflectr claude          # stores the key in Keychain / credential store
   ```
3. **Latest Claude Desktop** from [claude.com/download](https://claude.com/download). Older builds may not show the third-party inference UI.
4. *(Optional)* providers configured in rflectr — whatever you've set up appears in the server catalog automatically.
5. *(Optional)* **Favorites** via `rflectr models` to cap the catalog at up to 20 models.
6. *(Optional)* **Google Vertex** — configure in Desktop (**Developer → third-party inference → Vertex**).

---

## Quick start: automated setup

On macOS or Windows, the easiest path is the **automated** command:

```bash
rflectr claude-app
```

1. Run it.
2. Select a provider and a model.
3. rflectr **enables Developer Mode**, configures the gateway to point at itself, and launches Claude Desktop.
4. **Keep the terminal running** — it's the live proxy for Desktop.
5. When done, press `Ctrl+C` to stop the proxy and restore your original Desktop configuration.

If the terminal crashes or you need to recover manually:

```bash
rflectr claude-app --restore
```

---

## Manual setup (network / advanced)

Use this if the gateway runs on a different machine (remote desktop, container, home server) or you want a permanent background gateway.

### Step 1: Start the rflectr server

```bash
rflectr server
```

Leave it running. First-time wizard recommendations:

| Prompt | Recommendation |
|---|---|
| **Configure & start** vs **Start with saved settings** | *Configure & start* the first time. |
| **Exposed providers** | Add only what you want in Desktop (Zen, Go, OpenAI, …). |
| **Mask gateway model ids for discovery?** | **Yes** — Desktop filters competitor names in gateway ids; masking keeps discovery working while display names stay readable. |
| **Expose only favorite models?** | Optional. |
| **Listen mode** | **Local only** (`127.0.0.1`) when Desktop runs on the same machine. |

When it's up:

```text
Rflectr server running
  Anthropic:  http://127.0.0.1:17645/anthropic
  OpenAI:     http://127.0.0.1:17645/openai
  API key:    any non-empty value
```

Optional health check:

```bash
curl -s http://127.0.0.1:17645/health
curl -s http://127.0.0.1:17645/anthropic/v1/models | head
```

### Step 2: Enable Developer Mode

Third-party inference lives behind **Developer Mode**.

- **macOS** — menu bar: **Help → Troubleshooting → Enable Developer Mode**.
- **Windows** — application menu (☰): **Help → Troubleshooting → Enable Developer Mode**.

The app may relaunch (normal). A **Developer** menu then appears. If you already use Claude Desktop, just enable it from the menu and move on.

### Step 3: Configure third-party inference

1. **Developer → Configure third-party inference**.
2. Open the **Connection** section.
3. Set:

| Field | Value |
|---|---|
| **Inference provider** | **Gateway** (Anthropic-compatible) |
| **Gateway base URL** | `http://127.0.0.1:17645/anthropic` |
| **Gateway API key** | Any non-empty string (e.g. `rflectr`) |
| **Gateway auth scheme** | `bearer` |

> ⚠️ **Do not append `/v1` to the base URL.** Claude Desktop adds API paths itself (`/v1/models`, `/v1/messages`). A `.../anthropic/v1` URL breaks discovery and inference.

4. Leave **model discovery** enabled.
5. Hit **Test connection** and **Test model discovery** if present.
6. Click **Apply locally** — the app saves config and relaunches.

Config lands here:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude-3p/configLibrary/` |
| Windows | `%LOCALAPPDATA%\Claude-3p\configLibrary\` |

`Claude-3p` is Anthropic's on-disk layout for third-party inference; ignore it day to day.

### Step 4: Use Claude Desktop

1. Make sure `rflectr server` is still running.
2. Open the **Cowork** or **Code** tab (Chat won't be there).
3. Open the model picker — you should see your gateway models.
4. Pick a model and start a session.

If discovery worked in Step 3, you're done — no extra launch step.

---

## Gateway values cheat sheet

| Setting | Local rflectr server |
|---|---|
| Provider | Gateway (Anthropic-compatible) |
| Base URL | `http://127.0.0.1:17645/anthropic` |
| API key | Any non-empty value (local mode has no server password) |
| Auth scheme | `bearer` |
| Discovery (internal) | `GET http://127.0.0.1:17645/anthropic/v1/models` |
| Messages (internal) | `POST http://127.0.0.1:17645/anthropic/v1/messages` |

### Network mode (another device on your LAN)

| Setting | Value |
|---|---|
| Base URL | `http://<server-ip>:17645/anthropic` |
| API key | The **server password** printed when the server started |

---

## Restore Claude Desktop to Anthropic's servers

To stop routing through rflectr and return to normal Claude Desktop (Anthropic sign-in, Chat tab, claude.ai inference):

### Verified revert (macOS, Claude Desktop 1.11847.5)

Three on-disk changes plus a relaunch:

| What | Why |
|---|---|
| Remove `Claude-3p/configLibrary/` | Drops the gateway config that keeps Desktop in 3P mode. |
| Set `"allowDevTools": false` | Hides the **Developer** menu — current builds have *Enable* but no *Disable* toggle. |
| Set `"deploymentMode": "1p"` | Pins first-party mode in the standard `Claude/` data folder. |

**Before you start:** fully quit Claude Desktop (`Cmd+Q` on macOS — not just the window). Back up the folders below if you want an undo path.

**Step 1 — Remove the gateway config**

```bash
# macOS
rm -rf ~/Library/Application\ Support/Claude-3p/configLibrary/
```
```powershell
# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Claude-3p\configLibrary"
```

This deletes the applied third-party inference profile. It does **not** delete Cowork session history under `Claude-3p/` or `~/Claude/`.

**Step 2 — Disable Developer Mode** — edit `developer_settings.json` in the **standard** (1P) data folder:

- macOS: `~/Library/Application Support/Claude/developer_settings.json`
- Windows: `%APPDATA%\Claude\developer_settings.json`

```json
{ "allowDevTools": false }
```

Create the file if it doesn't exist.

**Step 3 — Pin first-party mode** — add to the standard config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "preferences": { },
  "deploymentMode": "1p"
}
```

Merge with existing keys — don't delete your `preferences` block.

**Step 4 — Relaunch**

```bash
open -a Claude
```

Optional one-shot override if Desktop still picks up stale 3P state:

```bash
/Applications/Claude.app/Contents/MacOS/Claude --boot-1p-once
```

Stop the rflectr server (`Ctrl+C`) if you no longer need the gateway.

**How to confirm it worked:** the Chat tab and Anthropic sign-in are back, no **Cowork 3P | Gateway** label appears bottom-left, the **Developer** menu is gone, and logs write to `~/Library/Logs/Claude/main.log` showing `claude.ai account active and logged in`.

### Option A — In-app (if the Developer menu is still available)

Open **Developer → Configure third-party inference**, clear or replace the gateway settings, and apply. You may still need [Step 2](#restore-claude-desktop-to-anthropics-servers) afterward — clearing the gateway doesn't hide the Developer menu.

### Option B — Log out → Anthropic sign-in

In 3P mode, **Log out** (bottom-left) can surface the sign-in screen with an option to use Anthropic directly. It's easy to miss; the verified revert above is more reliable.

### Full reset (deletes local Desktop history)

Only if the above isn't enough:

| Platform | Delete |
|---|---|
| macOS | `~/Library/Application Support/Claude-3p/` and optionally `~/Claude/` |
| Windows | `%LOCALAPPDATA%\Claude-3p\` and optionally `%USERPROFILE%\Claude\` |

> ⚠️ Conversation history in that folder is not recoverable after deletion.

**Managed / enterprise profiles:** if IT pushed a managed profile (Jamf, Intune, Group Policy), local `configLibrary/` edits may be ignored or restored on launch. Talk to IT.

---

## Disable Developer Mode

There is **no "Disable Developer Mode" menu item** in Claude Desktop v1.11847.5. To turn it off after reverting:

1. Fully quit Claude Desktop.
2. Edit `developer_settings.json` in the **standard** `Claude/` folder (paths above).
3. Set `"allowDevTools": false`.
4. Relaunch.

To re-enable later: set `"allowDevTools": true` and relaunch, or use **Help → Troubleshooting → Enable Developer Mode** again.

---

## Troubleshooting

### Gateway config doesn't seem to apply

- Confirm **Connection** uses **Gateway** with a valid base URL and API key.
- Config is read at launch — fully quit and reopen Desktop after **Apply locally**.
- **Help → Troubleshooting → Copy Managed Configuration Report** shows what the app loaded (secrets redacted).
- Logs: macOS `~/Library/Logs/Claude-3p/main.log`, Windows `%LOCALAPPDATA%\Claude-3p\Logs\main.log`.

### Test connection / model discovery fails

| Check | Action |
|---|---|
| Server not running | Start `rflectr server` and keep the terminal open. |
| Wrong base URL | `http://127.0.0.1:17645/anthropic`, no `/v1` suffix. |
| Empty API key | Any non-empty string for local mode. |
| Network mode | Base URL uses the server's LAN IP; API key matches the server password. |
| Firewall | Allow local connections to port `17645`. |

```bash
curl -s http://127.0.0.1:17645/health
curl -s -H "Authorization: Bearer test" http://127.0.0.1:17645/anthropic/v1/models
```

### Model picker shows 0 models or fewer than expected

- **Discovery id masking:** answer **Yes** in the server wizard — Desktop hides models whose gateway ids contain competitor vendor strings.
- **Provider filter:** re-run the wizard and add the providers you need.
- **Favorites-only:** add models with `rflectr models`, or turn favorites-only off.
- **Providers:** `rflectr providers list` — ensure the providers you want are configured.

### Models show in `curl` but not in Desktop

Enable **Mask gateway model ids for discovery**, restart the server, relaunch Desktop.

### `Missing OPENCODE_API_KEY` when starting the server

Run `rflectr claude` once to store your key, or export `OPENCODE_API_KEY` before `rflectr server`.

### `No providers configured`

```bash
rflectr providers add   # or: rflectr providers import
```

### Authentication errors from the gateway (401)

- **Local mode:** any non-empty bearer token works.
- **Network mode:** the gateway API key in Desktop must match the server password exactly.

### Generate a diagnostic report

**Help → Troubleshooting → Generate Diagnostic Report**, then share the saved folder. No conversation content is included.

---

## Official references

| Topic | Link |
|---|---|
| Third-party inference overview | [claude.com/docs/cowork/3p/overview](https://claude.com/docs/cowork/3p/overview) |
| Installation and setup | [claude.com/docs/cowork/3p/installation](https://claude.com/docs/cowork/3p/installation) |
| Configuration reference | [claude.com/docs/cowork/3p/configuration](https://claude.com/docs/cowork/3p/configuration) |
| User identity and local data | [claude.com/docs/cowork/3p/data-storage](https://claude.com/docs/cowork/3p/data-storage) |
| Claude Desktop download | [claude.com/download](https://claude.com/download) |
| rflectr API server | [API Server guide](api-server.md) |

---

## Related guides

- [API Server](api-server.md) · [Providers](providers.md) · [Troubleshooting](../faqs/troubleshooting.md)
