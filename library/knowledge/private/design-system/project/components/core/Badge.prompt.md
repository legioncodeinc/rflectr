`Badge` — small status/label chip. Tones carry meaning: `relay` (core/route), `provider` (green, connected), `tool` (violet, agent), `gold` (premium/brand), `local` (the runs-local affordance), and severities. `dot` adds a glowing status dot; `mono` sets the label in the values typeface for ids/ports/counts.

```jsx
<Badge tone="provider" dot>connected</Badge>
<Badge tone="tool" mono>claude-code</Badge>
<Badge tone="local" mono dot>127.0.0.1:17645</Badge>
<Badge tone="warning" dot>missing key</Badge>
<Badge tone="relay" mono>SDK-translated</Badge>
```
