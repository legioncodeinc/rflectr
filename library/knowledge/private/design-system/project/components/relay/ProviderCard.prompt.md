`ProviderCard` — a connected backend in the registry (Zen/Go, Groq, OpenAI, Mistral, DeepSeek, Gemini, Ollama, OpenRouter, Vertex…). Shows the monogram, **key status** (keychain / missing / OAuth — the key itself is never shown), and model count. Selected gets the relay glow.

```jsx
<ProviderCard name="OpenAI" monogram="oa" status="connected" models={48} />
<ProviderCard name="Groq" monogram="gq" status="missing" models={12} />
<ProviderCard name="Ollama" monogram="ol" status="local" models={9} note="runs on your machine" />
<ProviderCard name="Gemini" monogram="gm" status="oauth" models={21} selected />
```
