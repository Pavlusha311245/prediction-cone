# Detailed Guide

This guide explains how to use `prediction-cone` for both interaction models:

1. **Prediction cone radial menu** (fast directional selection)
2. **Dropdown with safe triangle / safety triangle navigation** (stable nested submenu UX)

If you only need method signatures, see [API Reference](API.md). If you want a live editor for API examples, open [Interactive API Docs](../examples/vanilla/docs.html).

## Why Two Models

- Use **prediction cone** when speed matters and users can build directional muscle memory.
- Use **safe triangle (safety triangle)** dropdown when users need readable labels and nested navigation.
- Use both in one product: radial for power actions, dropdown for discoverability.

## Installation

```bash
npm install prediction-cone
# or
bun add prediction-cone
```

## Model A: Prediction Cone Menu

```typescript
import { createPredictionConeMenu } from "prediction-cone";

const menu = createPredictionConeMenu({
  items: [
    { id: "copy", label: "Copy", icon: "📋" },
    { id: "paste", label: "Paste", icon: "📌" },
    { id: "delete", label: "Delete", icon: "🗑️", danger: true },
  ],
  ringRadius: 120,
  itemSize: 56,
  coneHalfAngleDeg: 22.5,
  deadzone: 30,
  hysteresisDeg: 3,
  theme: "dark",
});

menu.attach(document, { trigger: "contextmenu" });
```

### Tuning Tips

- `coneHalfAngleDeg`:
  - lower values (`16..20`) = stricter aim, fewer accidental changes
  - higher values (`24..32`) = easier targeting
- `deadzone`:
  - increase for trackpads and shaky pointers
- `hysteresisDeg`:
  - increase if highlight flickers near cone borders
- `ringRadius` + `itemSize`:
  - increase for touch-heavy UI

## Model B: Dropdown + Safe Triangle (Safety Triangle)

```typescript
import { createDropdownMenu } from "prediction-cone";

const dropdown = createDropdownMenu({
  items: [
    {
      id: "file",
      label: "File",
      children: [
        { id: "new", label: "New" },
        { id: "open", label: "Open" },
      ],
    },
    { id: "edit", label: "Edit" },
  ],
  submenuDelay: 150,
  debug: false,
});

dropdown.attach(document.getElementById("menu-btn")!, { trigger: "contextmenu" });
```

### Tuning Tips

- `submenuDelay`:
  - `0` for immediate close behavior
  - `100..180` for smoother diagonal motion
- `debug: true` in development to visualize the triangle zone.
- Prefer clear parent-row spacing for predictable pointer paths.

## Runtime Patterns

### 1) Dynamic item updates

```typescript
menu.setItems([
  { id: "rename", label: "Rename" },
  { id: "duplicate", label: "Duplicate" },
]);
```

### 2) Per-target context

```typescript
menu.attach(document.querySelector(".file-row")!, {
  trigger: "contextmenu",
  context: { type: "file" },
});

menu.on("select", (e) => {
  console.log("context", e.context, "item", e.item?.id);
});
```

### 3) Theming with CSS variables

```css
:root {
  --pcm-bg: #111827;
  --pcm-text: #f9fafb;
  --pcm-activeBorder: #60a5fa;
}
```

### 4) Programmatic open

```typescript
menu.openAt(320, 240, { source: "keyboard" });
```

## SEO Terms and Search Intent

This project intentionally includes these terms for discoverability:

- `prediction cone menu`
- `radial context menu`
- `safe triangle`
- `safety triangle`
- `menu aim`
- `submenu diagonal pointer navigation`

## Choosing the Right Variant

| Scenario | Best Choice | Why |
|---|---|---|
| Expert workflows / power users | Prediction cone | Fast directional selection |
| Deep IA with nested actions | Dropdown + safe triangle | Better readability and submenu stability |
| Hybrid editor apps | Both | Speed + discoverability |

## Live Documentation

- Landing/demo: [examples/vanilla/index.html](../examples/vanilla/index.html)
- Interactive API docs with add/edit examples: [examples/vanilla/docs.html](../examples/vanilla/docs.html)
- Architecture deep dive: [ARCHITECTURE.md](ARCHITECTURE.md)
- Full API signatures: [API.md](API.md)

