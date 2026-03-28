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

