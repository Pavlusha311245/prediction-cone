# API Reference

For a narrative walkthrough with variants (prediction cone vs safe triangle/safety triangle dropdown), see [DETAILED_GUIDE.md](DETAILED_GUIDE.md).

For editable examples, open [examples/vanilla/docs.html](../examples/vanilla/docs.html).

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

| Option                | Type                                          | Default         | Description                                               |
|-----------------------|-----------------------------------------------|-----------------|-----------------------------------------------------------|
| `items`               | `ConeItem[]`                                  | _(required)_    | Menu items to display                                     |
| `ringRadius`          | `number \| (viewport) => number`              | `110`           | Distance from center to item centers (px)                 |
| `itemSize`            | `number \| (viewport) => number`              | `56`            | Width/height of menu items (px)                           |
| `deadzone`            | `number`                                      | `30`            | Radius near center where no selection occurs (px)         |
| `coneHalfAngleDeg`    | `number`                                      | `22.5`          | Half-angle of the selection cone (degrees)                |
| `hysteresisDeg`       | `number`                                      | `3`             | Stability angle to prevent flickering (degrees)           |
| `startAngleDeg`       | `number`                                      | `-90`           | Starting angle for item distribution (degrees, -90 = top) |
| `edgePadding`         | `number`                                      | `16`            | Minimum padding from viewport edges (px)                  |
| `preferSafePlacement` | `boolean`                                     | `true`          | Shift menu to keep items in viewport                      |
| `container`           | `HTMLElement`                                 | `document.body` | Parent container for menu DOM                             |
| `theme`               | `"light" \| "dark" \| Record<string, string>` | `"light"`       | CSS theme                                                 |
| `showViz`             | `boolean`                                     | `false`         | Show debug canvas (development only)                      |
| `longPressMs`         | `number`                                      | `250`           | Long-press duration for touch (ms)                        |

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

| Option            | Type                                            | Default         | Description                               |
|-------------------|-------------------------------------------------|-----------------|-------------------------------------------|
| `trigger`         | `"pointerdown" \| "contextmenu" \| "longpress"` | `"pointerdown"` | How menu opens                            |
| `button`          | `0 \| 1 \| 2`                                   | `undefined`     | Mouse button filter                       |
| `preventDefault`  | `boolean`                                       | `false`         | Call `preventDefault()` on trigger event  |
| `stopPropagation` | `boolean`                                       | `false`         | Call `stopPropagation()` on trigger event |
| `enabled`         | `boolean \| () => boolean`                      | `true`          | Guard to enable/disable                   |
| `items`           | `ConeItem[]`                                    | `undefined`     | Per-target item override                  |
| `context`         | `any`                                           | `undefined`     | Context data for events                   |
| `longPressMs`     | `number`                                        | `250`           | Long-press duration (ms)                  |

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

---

## `createDropdownMenu(options)`

Creates a traditional dropdown menu with **triangle-based submenu navigation**.

Items with `children` automatically show a nested submenu panel on hover.
The safe-triangle zone keeps the submenu open while the pointer moves diagonally from the parent row toward it.

**Parameters:**
- `options: DropdownMenuOptions` — Configuration object

**Returns:** `DropdownMenuInstance`

```typescript
import { createDropdownMenu } from 'prediction-cone';

const dropdown = createDropdownMenu({
  items: [
    { id: 'file', label: 'File', icon: '📁', children: [
      { id: 'new',  label: 'New File', icon: '📄', shortcut: '⌘N' },
      { id: 'open', label: 'Open...',  icon: '📂', shortcut: '⌘O' },
      { id: 'save', label: 'Save',     icon: '💾', shortcut: '⌘S' },
    ]},
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'sep1', label: '', separator: true },
    { id: 'quit', label: 'Quit', icon: '🚪', danger: true },
  ],
  theme: 'light',
  debug: false,
  submenuDelay: 150,
});
```

---

## DropdownMenuOptions

| Option         | Type                                          | Default         | Description                                                  |
|----------------|-----------------------------------------------|-----------------|--------------------------------------------------------------|
| `items`        | `ConeItem[]`                                  | _(required)_    | Menu items to display. Items with `children` show a submenu. |
| `theme`        | `"light" \| "dark" \| Record<string, string>` | `"light"`       | CSS theme                                                    |
| `container`    | `HTMLElement`                                 | `document.body` | Parent container for menu DOM                                |
| `debug`        | `boolean`                                     | `false`         | Enable safe-triangle debug canvas overlay (dev only)         |
| `submenuDelay` | `number`                                      | `150`           | Grace period (ms) before submenu closes on pointer exit      |

---

## ConeItem (extended for Dropdown)

```typescript
interface ConeItem {
  id: string;                                        // Unique identifier
  label: string;                                     // Display label
  disabled?: boolean;                                // Prevent selection
  separator?: boolean;                               // Render as visual divider
  danger?: boolean;                                  // Destructive action (red styling)
  shortcut?: string;                                 // Keyboard shortcut label (e.g. "⌘N")
  icon?: string | HTMLElement | (() => HTMLElement);  // Icon (emoji, HTML/SVG, element, factory)
  children?: ConeItem[];                             // Nested submenu items
}
```

---

## DropdownMenuInstance

### Methods

```typescript
dropdown.attach(target: Element | Document, options?: DropdownAttachOptions): void
dropdown.detach(target?: Element | Document): void
dropdown.openAt(x: number, y: number): void
dropdown.close(): void
dropdown.setItems(items: ConeItem[]): void
dropdown.isOpen(): boolean
dropdown.destroy(): void
```

### Events

```typescript
dropdown.on('open',   (e: DropdownMenuEventPayload) => { ... })
dropdown.on('close',  (e: DropdownMenuEventPayload) => { ... })
dropdown.on('select', (e: DropdownMenuEventPayload) => { ... })
```

Each `.on()` call returns an unsubscribe function:

```typescript
const unsub = dropdown.on('select', handler);
unsub(); // Remove listener
```

---

## DropdownMenuEventPayload

```typescript
interface DropdownMenuEventPayload {
  item?: ConeItem;        // The selected item
  parentItem?: ConeItem;  // Parent item (if submenu selection)
}
```

---

## DropdownAttachOptions

| Option            | Type                       | Default   | Description                               |
|-------------------|----------------------------|-----------|-------------------------------------------|
| `trigger`         | `"click" \| "contextmenu"` | `"click"` | How menu opens                            |
| `preventDefault`  | `boolean`                  | `true`    | Call `preventDefault()` on trigger event  |
| `stopPropagation` | `boolean`                  | `false`   | Call `stopPropagation()` on trigger event |

---

## Safe-Triangle Debug Mode

Pass `debug: true` to `DropdownMenuOptions` to visualize the triangle navigation zone in real time:

```typescript
const dropdown = createDropdownMenu({
  items: [...],
  debug: true, // DEV ONLY — shows triangle canvas overlay
});
```

The debug overlay renders:
- **Blue triangle** — the safe zone between cursor and submenu
- **Green dashed rect** — the submenu bounding box
- **Red dot** — the apex (cursor capture point)
- **A, B, C labels** — triangle vertex names

> ⚠️ **Do not ship with `debug: true`** — it is intended for development only.

---

## SafeTriangle (advanced)

The `SafeTriangle` class is exported for building custom menu implementations:

```typescript
import { SafeTriangle } from 'prediction-cone';

const tri = new SafeTriangle({
  delay: 150,     // Expiry grace period (ms)
  padding: 2,     // Extra px around submenu corners
  debug: false,   // Canvas overlay
  onExpire: () => closeSubmenu(),
});

tri.activate(cursorPoint, submenuRect);
tri.isInSafeZone(px, py);  // true if pointer is en route
tri.updateApex(newCursor);  // Update on pointermove
tri.startExpiry();          // Start grace timer
tri.cancelExpiry();         // Cancel timer
tri.deactivate();           // Clear state
tri.destroy();              // Clean up canvas & listeners
```

---

## MouseTracker (advanced)

Ring-buffer pointer history with velocity computation:

```typescript
import { MouseTracker } from 'prediction-cone';

const tracker = new MouseTracker(8); // 8-sample ring buffer
tracker.start();
tracker.push(e.clientX, e.clientY, e.pointerType);
const vel = tracker.velocity(); // { vx, vy, speed }
const snap = tracker.current;   // Latest snapshot
tracker.stop();
```

