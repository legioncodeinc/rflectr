# Providers

> Category: Guide | Version: 1.0 | Date: June 2026 | Status: Active

Every provider rflectr can launch, the base URL each uses, and the gotchas worth knowing before you add one. New to rflectr? Start with [What is rflectr?](../overview/what-is-rflectr.md)

---

## How the registry works

`rflectr` stores your providers and cached model lists in a **native provider registry** at `~/.rflectr/providers.json`. API keys are kept in your **OS keychain**, never in that file. Add a provider with:

```bash
rflectr providers add        # pick a template, paste a key
rflectr providers import     # one-time import from an existing OpenCode setup
rflectr providers list       # see what's configured
```

When you add a provider, rflectr picks the correct endpoint format (`@ai-sdk/openai-compatible` vs a provider-specific SDK) and fetches the available models automatically.

---

## Built-in cloud backends

These are always available with an `OPENCODE_API_KEY` — they don't need to be added to the registry.

| id | Description |
|---|---|
| `zen` | OpenCode Zen — free and paid models. |
| `go` | OpenCode Go — paid models. |

---

## Hosted providers

| Provider | Base URL | Notes |
|---|---|---|
| **Anthropic** | `https://api.anthropic.com` | Official Claude API. Recommended for standard Claude access. |
| **OpenAI** | `https://api.openai.com/v1` | GPT, o-series reasoning models, and Codex. |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai` | Official Gemini API. |
| **Groq** | `https://api.groq.com/openai/v1` | Ultra-fast inference for open-weight models (Llama, Mixtral). |
| **Mistral** | `https://api.mistral.ai/v1` | ⚠️ Free tier has strict rate limits (HTTP 429) — tool-heavy sessions burn quota fast. |
| **Together AI** | `https://api.together.xyz/v1` | Train, fine-tune, and run open-source models. |
| **Cerebras** | `https://api.cerebras.ai/v1` | High-speed inference on wafer-scale chips. |
| **DeepInfra** | `https://api.deepinfra.com/v1/openai` | Serverless inference for open-source models. |
| **DeepSeek** | `https://api.deepseek.com/v1` | DeepSeek coding and chat models. |
| **Zhipu AI (GLM)** | `https://open.bigmodel.cn/api/paas/v4` | The GLM model family. |
| **Alibaba DashScope** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Qwen and other models. |
| **xAI** | `https://api.x.ai/v1` | Grok models. Supports OAuth — see [Codex § OAuth](codex.md#oauth). |
| **Perplexity** | `https://api.perplexity.ai` | Perplexity's online Sonar models. |
| **Cohere** | `https://api.cohere.com/compatibility/v1` | Command models. |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Unified proxy to dozens of models. |

---

## Local models (Ollama & LM Studio)

Connect to a locally running inference engine. When you add one, rflectr prompts for your local URL (e.g. `http://127.0.0.1:11434/v1`). You can leave the API key blank — local engines generally don't require auth.

---

## The Moonshot / Kimi confusion

Moonshot AI split its product into **three separate platforms**. They all use the "Kimi" name but have **different billing, different base URLs, and non-interchangeable API keys**. Using the wrong template for your key gives a `401 Invalid Authentication` / `Incorrect API key` error.

| Platform | For | Base URL | Key from |
|---|---|---|---|
| **Moonshot (Kimi)** | China domestic, pay-as-you-go | `https://api.moonshot.cn/v1` | `platform.moonshot.cn` |
| **Moonshot Global (kimi.ai)** | International, pay-as-you-go | `https://api.moonshot.ai/v1` | `platform.kimi.ai` |
| **Kimi Code** | Monthly coding subscription | `https://api.kimi.com/coding/v1` | `kimi.com/code/console` |

> 💡 The **Global** platform also grants `kimi-k2.7-code` directly through the standard API — no separate coding subscription needed. If your key is from `platform.kimi.ai`, pick **Moonshot Global**.

---

## Advanced / not directly addable

These need credentials beyond a simple API key, so they aren't in the `add` template list:

| Provider | How to use |
|---|---|
| **Amazon Bedrock** | Needs AWS credentials. Configure in OpenCode, then `rflectr providers import`. |
| **Azure OpenAI** | Needs per-model deployment URLs. Configure in OpenCode, then import. |
| **Google Vertex AI** | Handled via `gcloud` Application Default Credentials through `rflectr server --vertex` — no registry key required. See [API Server § Vertex](api-server.md). |

---

## Related guides

- [What is rflectr?](../overview/what-is-rflectr.md) · [Model compatibility](model-compatibility.md) · [Troubleshooting](../faqs/troubleshooting.md)
