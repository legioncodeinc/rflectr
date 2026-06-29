/* ============================================================
   rflectr — Dashboard sample data
   The GUI face of the local smart-router. window.RF_DATA holds the
   gateway status, the provider registry, the model catalog, the live
   request feed, and the active tool→model routes.
   ============================================================ */
window.RF_DATA = {
  gateway: { status: "running", host: "127.0.0.1", port: 17645, uptime: "4h 12m", version: "0.7.2", subscription: "go" },
  identity: { user: { name: "Mara Okafor", handle: "@mara", initials: "MO" } },

  stats: [
    { label: "requests today", value: "12,847", mono: true },
    { label: "success rate", value: "99.2%", tone: "provider" },
    { label: "active routes", value: "4", mono: true },
    { label: "avg latency", value: "344ms", mono: true },
  ],

  // Active routes: which tool runs on which model right now
  routes: [
    { tool: { name: "Claude Code", monogram: "cc" }, model: { id: "claude-sonnet-4-6", monogram: "cs" }, backend: "zen", status: "ok", latency: "412ms" },
    { tool: { name: "Codex", monogram: "cx" }, model: { id: "gpt-5-codex", monogram: "gp" }, backend: "openai", status: "ok", latency: "1.2s" },
    { tool: { name: "Cursor", monogram: "cu" }, model: { id: "kimi-k2", monogram: "ki" }, backend: "groq", status: "retry", latency: "880ms" },
    { tool: { name: "Gemini CLI", monogram: "gc" }, model: { id: "gemini-2.5-pro", monogram: "gm" }, backend: "vertex", status: "ok", latency: "360ms" },
  ],

  providers: [
    { name: "OpenCode Zen", monogram: "zn", status: "connected", models: 64, color: "var(--relay)" },
    { name: "OpenCode Go", monogram: "go", status: "connected", models: 64, color: "var(--gold)" },
    { name: "OpenAI", monogram: "oa", status: "connected", models: 32, color: "var(--provider)" },
    { name: "Groq", monogram: "gq", status: "connected", models: 18, color: "var(--critical)" },
    { name: "DeepSeek", monogram: "ds", status: "connected", models: 8, color: "var(--relay)" },
    { name: "Mistral", monogram: "mi", status: "connected", models: 14, color: "var(--warning)" },
    { name: "Gemini", monogram: "gm", status: "oauth", models: 21, color: "var(--info)" },
    { name: "Ollama", monogram: "ol", status: "local", models: 11, color: "var(--provider)" },
    { name: "OpenRouter", monogram: "or", status: "connected", models: 188, color: "var(--tool)" },
    { name: "Vertex AI", monogram: "vx", status: "missing", models: 0, color: "var(--text-tertiary)" },
  ],

  models: [
    { id: "claude-sonnet-4-6", family: "Anthropic", format: "native", context: "200k", cost: "$3 / $15", backend: "zen", favorite: true },
    { id: "claude-opus-4-1", family: "Anthropic", format: "native", context: "200k", cost: "$15 / $75", backend: "zen", favorite: false },
    { id: "gpt-5", family: "OpenAI", format: "translated", context: "256k", cost: "$5 / $15", backend: "openai", favorite: true },
    { id: "gpt-5-codex", family: "OpenAI", format: "translated", context: "256k", cost: "$5 / $15", backend: "openai", favorite: false },
    { id: "kimi-k2", family: "Moonshot", format: "translated", context: "128k", cost: "$0.60", backend: "groq", favorite: true },
    { id: "deepseek-v3", family: "DeepSeek", format: "translated", context: "64k", cost: "$0.27", backend: "deepseek", favorite: true },
    { id: "llama-3.3-70b", family: "Meta", format: "translated", context: "128k", cost: "$0.59", backend: "groq", favorite: false },
    { id: "mistral-large-2", family: "Mistral", format: "translated", context: "128k", cost: "$2 / $6", backend: "mistral", favorite: false },
    { id: "gemini-2.5-pro", family: "Google", format: "translated", context: "1M", cost: "$1.25 / $5", backend: "vertex", favorite: false },
    { id: "qwen3-235b", family: "Alibaba", format: "translated", context: "256k", cost: "$0.40", backend: "openrouter", favorite: false },
    { id: "glm-4.6", family: "Zhipu", format: "translated", context: "200k", cost: "$0.60", backend: "openrouter", favorite: false },
    { id: "llama3.2:3b", family: "Meta · local", format: "native", context: "128k", cost: "free", backend: "ollama", favorite: false },
    { id: "whisper-large-v3", family: "OpenAI", format: "unsupported", context: "—", cost: "—", backend: "groq", favorite: false },
    { id: "text-embedding-3", family: "OpenAI", format: "unsupported", context: "—", cost: "—", backend: "openai", favorite: false },
  ],

  activity: [
    { time: "14:02:51", tool: "cc", model: "claude-sonnet-4-6", backend: "zen", tokens: "1,284", latency: "412ms", status: 200 },
    { time: "14:02:38", tool: "cu", model: "kimi-k2", backend: "groq", tokens: "880", latency: "880ms", status: "retry" },
    { time: "14:02:12", tool: "cx", model: "gpt-5-codex", backend: "openai", tokens: "2,210", latency: "1.2s", status: 200 },
    { time: "14:01:50", tool: "gc", model: "gemini-2.5-pro", backend: "vertex", tokens: "540", latency: "360ms", status: 200 },
    { time: "14:01:31", tool: "cc", model: "claude-sonnet-4-6", backend: "zen", tokens: "980", latency: "290ms", status: 200 },
    { time: "14:01:09", tool: "cu", model: "deepseek-v3", backend: "deepseek", tokens: "1,640", latency: "720ms", status: 200 },
    { time: "14:00:44", tool: "cx", model: "gpt-5", backend: "openai", tokens: "410", latency: "—", status: 429 },
    { time: "14:00:21", tool: "cc", model: "claude-opus-4-1", backend: "zen", tokens: "3,100", latency: "2.1s", status: 200 },
  ],

  // 24 buckets of request volume for the overview sparkline
  volume: [4,6,5,9,12,8,14,11,18,22,19,26,24,31,28,22,17,21,25,30,27,33,29,24],
};
