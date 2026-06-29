`Card` — the base surface. A 1px border on a surface fill, 12px radius, no drop shadow (border defines a card). `glow` ("relay" / "gold" / "provider") is the one expressive light — reserve it for a single focused element. `accent` paints a left edge marking the card's role.

```jsx
<Card>Default — border, no shadow.</Card>
<Card accent="provider">A connected provider tile.</Card>
<Card glow="relay" accent="relay">The active route.</Card>
```
