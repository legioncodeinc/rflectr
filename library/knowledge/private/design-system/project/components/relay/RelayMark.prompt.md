`RelayMark` — the rflectr product glyph, rendered inline so it scales and recolors. A hexagon comb-cell holding the routing relay. Use it in headers, the sidebar, loaders, and empty states.

```jsx
<RelayMark size={32} />                  {/* gradient app mark */}
<RelayMark size={18} variant="mono" />   {/* inherits currentColor */}
```

`variant` `gradient | mono`. For favicons/CLI use the static `assets/rflectr-favicon.svg` / `assets/rflectr-mark-mono.svg`.
