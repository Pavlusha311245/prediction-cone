# API Reference

## `createPredictionConeMenu(options)`

Creates a new prediction cone menu instance.

**Parameters:**
- `options: ConeOptions` — Configuration object

**Returns:** `ConeMenuInstance`

```typescript
import { createPredictionConeMenu } from 'prediction-cone';

const menu = createPredictionConeMenu({
  items: [
    { id: 'cut', label: 'Cut', icon: '✂️' },
    { id: 'copy', label: 'Copy', icon: '📋' },
    { id: 'paste', label: 'Paste', icon: '📌' },
  ],
  ringRadius: 110,
  itemSize: 56,
  coneHalfAngleDeg: 22.5,
  deadzone: 30,
  hysteresisDeg: 3,
  startAngleDeg: -90,
  theme: 'light',
});
```

---

## ConeOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `ConeItem[]` | _(required)_ | Menu items to display |
| `ringRadius` | `number \| (viewport) => number` | `110` | Distance from center to item centers (px) |
| `itemSize` | `number \| (viewport) => number` | `56` | Width/height of menu items (px) |
| `deadzone` | `number` | `30` | Radius near center where no selection occurs (px) |
| `coneHalfAngleDeg` | `number` | `22.5` | Half-angle of the selection cone (degrees) |
| `hysteresisDeg` | `number` | `3` | Stability angle to prevent flickering (degrees) |
| `startAngleDeg` | `number` | `-90` | Starting angle for item distribution (degrees, -90 = top) |
| `edgePadding` | `number` | `16` | Minimum padding from viewport edges (px) |
| `preferSafePlacement` | `boolean` | `true` | Shift menu to keep items in viewport |
| `container` | `HTMLElement` | `document.body` | Parent container for menu DOM |
| `theme` | `"light" \| "dark" \| Record<string, string>` | `"light"` | CSS theme |
| `showViz` | `boolean` | `false` | Show debug canvas (development only) |
| `longPressMs` | `number` | `250` | Long-press duration for touch (ms) |

---

## ConeItem

```typescript
interface ConeItem {
  id: string;                                      // Unique identifier
  label: string;                                   // Display label
  disabled?: boolean;                              // Prevent selection
  icon?: string | HTMLElement | (() => HTMLElement); // Icon (emoji, element, or factory)
}
```

---

## ConeMenuInstance

### Methods

```typescript
menu.attach(target: Element | Document, options?: AttachOptions): void
menu.detach(target?: Element | Document): void
menu.openAt(x: number, y: number, context?: any): void
menu.close(): void
menu.setItems(items: ConeItem[]): void
menu.setOptions(options: Partial<ConeOptions>): void
menu.isOpen(): boolean
menu.getState(): Readonly<ConeMenuState>
menu.destroy(): void
```

### Events

```typescript
menu.on('open', (e: ConeMenuEventPayload) => { ... })
menu.on('close', (e: ConeMenuEventPayload) => { ... })
menu.on('change', (e: ConeMenuEventPayload) => { ... }) // Highlighted item changed
menu.on('select', (e: ConeMenuEventPayload) => { ... }) // Item selected on release
```

Each `.on()` call returns an unsubscribe function:

```typescript
const unsub = menu.on('select', handler);
unsub(); // Remove listener
```

---

## ConeMenuEventPayload

```typescript
interface ConeMenuEventPayload {
  item?: ConeItem;                    // Selected/highlighted item
  activeId?: string;                  // Active item ID
  anchor: { x: number; y: number };   // Menu center position
  pointer: { x: number; y: number };  // Current pointer position
  context?: any;                      // Custom context from openAt() or attach()
}
```

---

## AttachOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trigger` | `"pointerdown" \| "contextmenu" \| "longpress"` | `"pointerdown"` | How menu opens |
| `button` | `0 \| 1 \| 2` | `undefined` | Mouse button filter |
| `preventDefault` | `boolean` | `false` | Call `preventDefault()` on trigger event |
| `stopPropagation` | `boolean` | `false` | Call `stopPropagation()` on trigger event |
| `enabled` | `boolean \| () => boolean` | `true` | Guard to enable/disable |
| `items` | `ConeItem[]` | `undefined` | Per-target item override |
| `context` | `any` | `undefined` | Context data for events |
| `longPressMs` | `number` | `250` | Long-press duration (ms) |

---

## Theming

### CSS Variables

```css
:root {
  --pcm-bg: rgba(255, 255, 255, 0.95);
  --pcm-border: rgba(0, 0, 0, 0.1);
  --pcm-activeBorder: rgba(59, 130, 246, 0.8);
  --pcm-activeGlow: rgba(59, 130, 246, 0.2);
  --pcm-text: rgba(0, 0, 0, 0.9);
  --pcm-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  --pcm-iconColor: rgba(0, 0, 0, 0.7);
  --pcm-hoverBg: rgba(59, 130, 246, 0.05);
}
```

### Runtime Theme Switching

```typescript
menu.setOptions({ theme: 'dark' });
```

### Custom Theme

```typescript
const menu = createPredictionConeMenu({
  items: [...],
  theme: {
    '--pcm-bg': '#ff6b35',
    '--pcm-activeBorder': '#004e89',
  },
});
```

---

## Responsive Sizing

```typescript
const menu = createPredictionConeMenu({
  items: [...],
  ringRadius: (viewport) => Math.min(viewport.w, viewport.h) * 0.3,
  itemSize: (viewport) => viewport.dpr > 1 ? 64 : 56,
});
```

The `Viewport` object contains: `{ w: number, h: number, dpr: number }`.

