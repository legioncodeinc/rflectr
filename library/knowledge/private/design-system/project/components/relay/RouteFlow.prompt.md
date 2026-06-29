`RouteFlow` — the jeweled relay, visualized. A tool on the left, a model on the right, and rflectr routing between them, with a restrained flowing-request animation (respects reduced-motion). The signature "what's connected and what it runs on" object.

```jsx
<RouteFlow
  tool={{ name: "Claude Code", monogram: "cc" }}
  model={{ id: "kimi-k2", monogram: "ki" }}
  backend="groq"
  status="ok"
  latency="412ms"
/>
```

`status` `ok | retry | error`. Set `animated={false}` for a still version (exports, print).
