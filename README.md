# prediction-cone

[![npm version](https://img.shields.io/npm/v/prediction-cone)](https://www.npmjs.com/package/prediction-cone)
[![bundle size](https://img.shields.io/bundlephobia/minzip/prediction-cone)](https://bundlephobia.com/package/prediction-cone)
[![license](https://img.shields.io/npm/l/prediction-cone)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)

A **zero-dependency** TypeScript radial menu that selects items by **pointer direction** within a configurable angular cone.

Press → drag toward an item → release to select. Deadzone and hysteresis ensure stable, flicker-free selection.

## Features

- 🎯 **Prediction Cone** — angular proximity selection, not hover-based
- ⚡ **Zero Dependencies** — only DOM APIs, nothing else
- 📦 **Tree-shakeable** — ESM + CJS + TypeScript declarations
- 📱 **Touch & Mouse** — Pointer Events API for all devices
- 🎨 **Themeable** — CSS custom properties, light/dark/custom
- ♿ **Accessible** — ARIA roles, Escape to close
- 📐 **Deadzone + Hysteresis** — prevents flickering and accidental triggers
- 🔧 **Responsive** — ring radius and item size adapt to viewport

## Install

```bash
npm install prediction-cone
# or
bun add prediction-cone
# or
pnpm add prediction-cone
# or
yarn add prediction-cone
```

## Quick Start

```typescript
import { createPredictionConeMenu } from 'prediction-cone';

const menu = createPredictionConeMenu({
  items: [
    { id: 'home', label: '🏠 Home' },
    { id: 'profile', label: '👤 Profile' },
    { id: 'settings', label: '⚙️ Settings' },
    { id: 'logout', label: '🚪 Logout' },
  ],
});

menu.attach(document, { trigger: 'contextmenu' });

menu.on('select', (e) => {
  console.log('Selected:', e.item?.label);
});
```

## API

```typescript
const menu = createPredictionConeMenu(options);

menu.attach(element, { trigger: 'contextmenu' }); // Attach to DOM element
menu.openAt(x, y);                                 // Open programmatically
menu.close();                                      // Close menu
menu.setItems(newItems);                            // Update items
menu.setOptions({ theme: 'dark' });                 // Update options
menu.on('select', handler);                         // Listen to events
menu.destroy();                                     // Cleanup
```

**Events:** `open` · `close` · `change` · `select`

**Trigger modes:** `pointerdown` · `contextmenu` · `longpress`

→ Full API reference: [docs/API.md](docs/API.md)

## Theming

```css
:root {
  --pcm-bg: #ffffff;
  --pcm-text: #333333;
  --pcm-activeBorder: #0066cc;
  --pcm-border: #cccccc;
  --pcm-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

Or pass a theme at creation:

```typescript
createPredictionConeMenu({ items, theme: 'dark' });
createPredictionConeMenu({ items, theme: { '--pcm-bg': '#1e293b' } });
```

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | ✅ Latest |
| Firefox | ✅ Latest |
| Safari | ✅ 13+ |
| Mobile (iOS / Android) | ✅ Latest |

Requires: Pointer Events API, CSS Custom Properties.

## Documentation

- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Examples](docs/EXAMPLES.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

## Development

```bash
bun install          # Install dependencies
bun run build        # Build ESM + CJS + types
bun run dev          # Watch mode
bun test             # Run tests
bun run lint         # Lint & format
bun run type-check   # TypeScript check
bun run size         # Check bundle size
```

## License

[MIT](LICENSE) © Pavel Zavadski
