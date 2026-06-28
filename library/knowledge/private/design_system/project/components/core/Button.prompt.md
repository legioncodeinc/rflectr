`Button` — the rflectr action button. The relay-gradient primary is the single brand action per region; `provider` (green) and `tool` (violet) mark the two sides of the relay; the rest are secondary/ghost/gold.

```jsx
<Button variant="primary" onClick={addProvider}>Add provider</Button>
<Button variant="provider" iconLeft={checkIcon}>Connected</Button>
<Button variant="tool">Set default tool</Button>
<Button variant="secondary" size="sm">Import from OpenCode</Button>
<Button variant="gold">Upgrade</Button>
```

Variants: `primary` (relay gradient), `provider` (green), `tool` (violet), `secondary`, `ghost`, `gold`, `danger`. Sizes `sm | md | lg`. Supports `iconLeft` / `iconRight`, `disabled`.
