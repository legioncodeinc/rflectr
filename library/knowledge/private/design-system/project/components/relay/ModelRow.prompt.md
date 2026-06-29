`ModelRow` — one model in the catalog. The id is mono (a real value you switch to). The format badge is honest: `native` (green), `SDK-translated` (relay), or `unsupported` (dimmed). Star to favorite (up to 20 for mid-session `/model` switching).

```jsx
<ModelRow id="claude-sonnet-4-6" family="Anthropic" format="native"
  context="200k" cost="$3 / $15" backend="zen" favorite onToggleFavorite={...} />
<ModelRow id="llama-3.3-70b" family="Meta" format="translated"
  context="128k" cost="$0.59" backend="groq" />
<ModelRow id="whisper-large-v3" family="OpenAI" format="unsupported" backend="groq" />
```
