# Examples

## Context Menu (Right-Click)

```typescript
import { createPredictionConeMenu } from 'prediction-cone';

const menu = createPredictionConeMenu({
  items: [
    { id: 'cut', label: 'Cut', icon: '✂️' },
    { id: 'copy', label: 'Copy', icon: '📋' },
    { id: 'paste', label: 'Paste', icon: '📌' },
    { id: 'delete', label: 'Delete', icon: '🗑️' },
  ],
});

menu.attach(document, { trigger: 'contextmenu' });

menu.on('select', (e) => {
  console.log('Selected:', e.item?.label);
});
```

## Programmatic Open

```typescript
const menu = createPredictionConeMenu({
  items: [
    { id: 'new', label: '+ New' },
    { id: 'open', label: '📂 Open' },
    { id: 'save', label: '💾 Save' },
  ],
});

document.getElementById('btn')!.addEventListener('click', (e) => {
  menu.openAt(e.clientX, e.clientY);
});

menu.on('select', (e) => {
  console.log(`Action: ${e.item?.id}`);
});
```

## Dark Theme

```typescript
const menu = createPredictionConeMenu({
  items: [...],
  theme: 'dark',
});

// Toggle at runtime
menu.setOptions({ theme: 'light' });
```

## Custom Theme

```typescript
const menu = createPredictionConeMenu({
  items: [...],
  theme: {
    '--pcm-bg': '#1e293b',
    '--pcm-text': '#f1f5f9',
    '--pcm-activeBorder': '#f59e0b',
    '--pcm-activeGlow': 'rgba(245, 158, 11, 0.3)',
  },
});
```

## Long-Press Trigger (Mobile)

```typescript
const menu = createPredictionConeMenu({
  items: [...],
  longPressMs: 300,
});

menu.attach(document.getElementById('canvas')!, {
  trigger: 'longpress',
  longPressMs: 400,
});
```

## Per-Target Items

```typescript
const menu = createPredictionConeMenu({
  items: [{ id: 'default', label: 'Default' }],
});

menu.attach(document.getElementById('editor')!, {
  trigger: 'contextmenu',
  items: [
    { id: 'undo', label: '↩️ Undo' },
    { id: 'redo', label: '↪️ Redo' },
  ],
  context: { target: 'editor' },
});

menu.attach(document.getElementById('sidebar')!, {
  trigger: 'contextmenu',
  items: [
    { id: 'collapse', label: '📁 Collapse' },
    { id: 'expand', label: '📂 Expand' },
  ],
  context: { target: 'sidebar' },
});

menu.on('select', (e) => {
  console.log(`${e.context?.target}: ${e.item?.id}`);
});
```

## Vanilla HTML

See the interactive demo in [`examples/vanilla/index.html`](../examples/vanilla/index.html).

---

## Dropdown Menu (Right-Click)

```typescript
import { createDropdownMenu } from 'prediction-cone';

const dropdown = createDropdownMenu({
  items: [
    { id: 'file', label: 'File', icon: '📁', children: [
      { id: 'new',    label: 'New File',    icon: '📄', shortcut: '⌘N' },
      { id: 'open',   label: 'Open...',     icon: '📂', shortcut: '⌘O' },
      { id: 'save',   label: 'Save',        icon: '💾', shortcut: '⌘S' },
      { id: 'export', label: 'Export As...', icon: '📤' },
    ]},
    { id: 'edit', label: 'Edit', icon: '✏️', children: [
      { id: 'undo', label: 'Undo', icon: '↩️', shortcut: '⌘Z' },
      { id: 'redo', label: 'Redo', icon: '↪️', shortcut: '⇧⌘Z' },
      { id: 'sep1', label: '', separator: true },
      { id: 'cut',  label: 'Cut',  icon: '✂️', shortcut: '⌘X' },
      { id: 'copy', label: 'Copy', icon: '📋', shortcut: '⌘C' },
    ]},
    { id: 'view',   label: 'View',   icon: '👁️' },
    { id: 'sep2', label: '', separator: true },
    { id: 'quit', label: 'Quit', icon: '🚪', danger: true },
  ],
});

dropdown.attach(document.getElementById('editor')!, { trigger: 'contextmenu' });

dropdown.on('select', ({ item, parentItem }) => {
  console.log('Selected:', item?.label, parentItem ? `(from ${parentItem.label})` : '');
});
```

## Dropdown with Triangle Debug Overlay

Enable the safe-triangle visualization to see how diagonal pointer movement is predicted:

```typescript
const dropdown = createDropdownMenu({
  items: [...],
  debug: true, // Renders triangle + submenu rect + apex dot in real time
});
```

The debug overlay shows:
- **Blue triangle** — safe zone between cursor and submenu
- **Green dashed rect** — submenu bounding box
- **Red dot** — apex (last cursor position on parent row)

> ⚠️ Remove `debug: true` before shipping to production.

## Dropdown with Custom Delay

Adjust how long the submenu stays open after the pointer leaves the safe zone:

```typescript
const dropdown = createDropdownMenu({
  items: [...],
  submenuDelay: 300, // 300ms grace period (default: 150ms)
});
```

Set `submenuDelay: 0` to close submenus immediately (no grace period).

## Using SafeTriangle Standalone

Build custom menus with the exported `SafeTriangle` class:

```typescript
import { SafeTriangle } from 'prediction-cone';

const triangle = new SafeTriangle({
  delay: 200,
  padding: 4,
  debug: true,
  onExpire: () => {
    console.log('Pointer did not reach submenu — closing');
    closeMySubmenu();
  },
});

// When submenu opens:
triangle.activate(
  { x: cursorX, y: cursorY },       // Apex
  submenuElement.getBoundingClientRect() // Submenu rect
);

// On pointermove over parent menu:
triangle.updateApex({ x: e.clientX, y: e.clientY });

// On pointerenter of another row:
if (triangle.isInSafeZone(e.clientX, e.clientY)) {
  return; // Suppress — pointer heading to submenu
}

// On pointerleave:
triangle.startExpiry();

// Cleanup:
triangle.destroy();
```

