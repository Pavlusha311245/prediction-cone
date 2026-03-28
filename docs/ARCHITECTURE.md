# Architecture

## Overview

**prediction-cone** uses a layered architecture optimized for a zero-dependency UI widget library. Each layer has clear responsibilities and dependency rules.

## Layers

```
┌─────────────────────────────────────────┐
│           API Layer (index.ts)          │  ← Public factory & re-exports
├─────────────────────────────────────────┤
│       DOM Layer (dom/*.ts)              │  ← Overlay, Trigger, Styles
├─────────────────────────────────────────┤
│       Core Layer (core/menu.ts)         │  ← State machine, cone logic
├─────────────────────────────────────────┤
│      Utils Layer (utils/*.ts)           │  ← Geometry, Emitter, rAF throttle
└─────────────────────────────────────────┘
```

### Utils Layer (`src/utils/`)

Pure, side-effect-free functions and classes:

| Module | Purpose |
|--------|---------|
| `geometry.ts` | Angle math: `deg2rad`, `angleDiff`, `vecAngle`, cone sector selection, hysteresis, deadzone |
| `emitter.ts` | Lightweight event emitter with typed events |
| `rafThrottle.ts` | `requestAnimationFrame`-based throttle for pointer events |
| `sanitize.ts` | HTML/SVG icon sanitizer via HTMLRewriter (XSS protection) |

### Core Layer (`src/core/`)

| Module | Purpose |
|--------|---------|
| `menu.ts` | State machine (idle → open → closed), anchor/pointer tracking, cone prediction with hysteresis, responsive sizing, edge-safe placement |

### DOM Layer (`src/dom/`)

| Module | Purpose |
|--------|---------|
| `overlay.ts` | Full-screen overlay, item positioning, pointer capture, debug canvas, ARIA roles |
| `trigger.ts` | Attach/detach to elements, supports `pointerdown` / `contextmenu` / `longpress` triggers |
| `styles.ts` | CSS injection via `<style>` tag, light/dark/custom theme support |

### API Layer (`src/index.ts`)

Facade that composes Core + DOM into the public `ConeMenuInstance` interface.

## Dependency Rules

- ✅ API Layer → DOM Layer, Core Layer
- ✅ DOM Layer → Core Layer, Utils Layer
- ✅ Core Layer → Utils Layer
- ❌ Utils Layer must NOT depend on DOM, Core, or API
- ❌ Core Layer must NOT depend on DOM or API

## Key Principles

1. **Pure math functions** — geometry helpers take inputs, return outputs, no side effects
2. **Explicit state** — all mutable state lives in `PredictionConeMenu` class
3. **Config as data** — tuning constants (`coneHalfAngleDeg`, `hysteresisDeg`, `deadzone`) are passed via options
4. **Thin event handlers** — DOM handlers extract coordinates and delegate to core logic
5. **Canvas is optional** — the menu works without debug visualization; canvas is opt-in via `showViz`

## Geometry Model

The menu uses a **prediction cone** to select items:

1. **Pointer Angle** — direction from menu center to current pointer position
2. **Cone Half-Angle** — angular width of acceptance zone (default: 22.5° = 45° total)
3. **Hysteresis** — stability band at cone boundaries to prevent flickering
4. **Deadzone** — circular area near center where no selection occurs

