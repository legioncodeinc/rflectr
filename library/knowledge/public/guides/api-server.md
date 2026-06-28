# API Server

> Category: Guide | Version: 1.0 | Date: June 2026 | Status: Active

`rflectr server` runs a local gateway that bridges your model backends (OpenCode Zen, Go, registry providers, or Vertex AI) to any client that speaks the Anthropic or OpenAI API. Both formats are served on one port.

---

## Start the server

```bash
rflectr server            # registry / Zen / Go providers
rflectr server --vertex   # Claude on Google Vertex AI via gcloud ADC
```

The server runs an interactive wizard (password setup, which providers to expose, optional favorites-only catalog, discovery-id masking) and then listens. Default port: **17645**.

```text
Rflectr server running
  Anthropic:  http://127.0.0.1:17645/anthropic
  OpenAI:     http://127.0.0.1:17645/openai/v1
  Network (en0):
    Anthropic:  http://192.168.68.70:17645/anthropic
    OpenAI:     http://192.168.68.70:17645/openai/v1
  API key:    saved, rotate with `rflectr server --setup`
  Catalog:    favorite models only
```

---

## Reading the model catalog

On startup the server prints every exposed model with **two identifiers**:

```text
  Google Gemini
    gemini-3.5-flash
      anthropic: anthropic-google__gemini-3.5-flash
      openai:    gemini-3.5-flash

  OpenCode Go
    Kimi K2.7 Code
      anthropic: anthropic-go__kimi-k2.7-code
      openai:    kimi-k2.7-code
```

| Identifier | Use it when your client expects… |
|---|---|
| `anthropic:` | Anthropic-format requests (Anthropic SDK, Claude Code, Claude Desktop). |
| `openai:` | OpenAI-format requests (OpenAI SDK, OpenAI-compatible extensions). |

---

## Endpoints

| Method + path | Purpose |
|---|---|
| `GET /health` | Liveness check. |
| `GET /anthropic/v1/models` · `GET /openai/v1/models` | List exposed models. |
| `POST /anthropic/v1/messages` | Anthropic Messages relay. |
| `POST /openai/v1/chat/completions` | OpenAI Chat Completions relay. |

Base URLs for clients:

- **Anthropic:** `http://127.0.0.1:17645/anthropic`
- **OpenAI:** `http://127.0.0.1:17645/openai/v1`

> ⚠️ **Do not append `/v1` to the Anthropic base URL** — the Anthropic SDK adds API paths itself.

---

## Connecting a client

Most OpenAI-compatible tools just need a base URL and (optionally) the server password as the API key. Example — **[THE AI Counsel](https://github.com/legioncodeinc/the-ai-counsel)**:

1. Open **Settings → LLM API Keys → Custom OpenAI-Compatible Endpoint**.
2. **Display Name:** anything descriptive (e.g. `Rflectr Server`).
3. **Base URL:**
   - Same machine: `http://127.0.0.1:17645/openai/v1`
   - Another device on your LAN: `http://<server-ip>:17645/openai/v1` (use an IP printed at startup).
4. **API Key:** the server password if one is set, otherwise leave empty.
5. Click **Connect** to fetch the gateway's models.

---

## Vertex AI mode

`rflectr server --vertex` exposes Claude on Google Vertex AI using your local `gcloud` Application Default Credentials — no OpenCode key needed.

| Env var | Purpose |
|---|---|
| `ANTHROPIC_VERTEX_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT` | Your GCP project. |
| `GOOGLE_CLOUD_LOCATION` or `CLOUD_ML_REGION` | Region (default `global`). |

Optional model catalog override: `~/.rflectr/vertex-models.json` (see `assets/vertex-models.example.json`).

---

## Auth

- **Local mode:** any non-empty bearer token / `x-api-key` works.
- **Network mode:** the wizard sets a **server password** — it's the only gate once the port is reachable beyond localhost, so treat it as a secret.

---

## Related guides

- [Claude Desktop setup](claude-desktop.md) (uses this gateway) · [Providers](providers.md) · [Troubleshooting](../faqs/troubleshooting.md)
