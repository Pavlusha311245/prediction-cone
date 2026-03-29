# Architecture

## Overview

**prediction-cone** uses a layered architecture optimized for a zero-dependency UI widget library. Each layer has clear responsibilities and dependency rules.

## Layers

```
┌─────────────────────────────────────────┐
│           API Layer (index.ts)          │  ← Public factories & re-exports
├─────────────────────────────────────────┤
│       DOM Layer (dom/*.ts)              │  ← Overlay, Trigger, Styles (radial)
├─────────────────────────────────────────┤
│    Dropdown Layer (dropdown/*.ts)       │  ← Menu, Styles (dropdown)
├─────────────────────────────────────────┤
│       Core Layer (core/menu.ts)         │  ← State machine, cone logic
├─────────────────────────────────────────┤
│      Utils Layer (utils/*.ts)           │  ← Geometry, Emitter, SafeTriangle,
│                                         │     MouseTracker, rAF throttle
└─────────────────────────────────────────┘
```

### Utils Layer (`src/utils/`)

Pure, side-effect-free functions and classes:

| Module            | Purpose                                                                                                        |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| `geometry.ts`     | Angle math: `deg2rad`, `angleDiff`, `vecAngle`, cone sector selection, hysteresis, deadzone, point-in-triangle |
| `emitter.ts`      | Lightweight event emitter with typed events                                                                    |
| `rafThrottle.ts`  | `requestAnimationFrame`-based throttle for pointer events                                                      |
| `sanitize.ts`     | HTML/SVG icon sanitizer via HTMLRewriter (XSS protection)                                                      |
| `safeTriangle.ts` | Diagonal cursor prediction zone: triangle geometry + expiry timer + optional debug canvas                      |
| `mouseTracker.ts` | Ring-buffer pointer history with velocity computation and `pointerType` tracking                               |

### Core Layer (`src/core/`)

| Module    | Purpose                                                                                                                                |
|-----------|----------------------------------------------------------------------------------------------------------------------------------------|
| `menu.ts` | State machine (idle → open → closed), anchor/pointer tracking, cone prediction with hysteresis, responsive sizing, edge-safe placement |

### DOM Layer (`src/dom/`)

| Module       | Purpose                                                                                  |
|--------------|------------------------------------------------------------------------------------------|
| `overlay.ts` | Full-screen overlay, item positioning, pointer capture, debug canvas, ARIA roles         |
| `trigger.ts` | Attach/detach to elements, supports `pointerdown` / `contextmenu` / `longpress` triggers |
| `styles.ts`  | CSS injection via `<style>` tag, light/dark/custom theme support (`pcm-` prefix)         |

### Dropdown Layer (`src/dropdown/`)

| Module      | Purpose                                                                                               |
|-------------|-------------------------------------------------------------------------------------------------------|
| `menu.ts`   | Dropdown menu with safe-triangle submenu navigation, row event wiring, submenu lifecycle, positioning |
| `styles.ts` | CSS injection for dropdown component (`pcd-` prefix), light/dark/custom themes                        |

### API Layer (`src/index.ts`)

Facade that composes Core + DOM into the public `ConeMenuInstance` interface and exports `createDropdownMenu` for dropdown menus.

## Dependency Rules

- ✅ API Layer → DOM Layer, Dropdown Layer, Core Layer
- ✅ DOM Layer → Core Layer, Utils Layer
- ✅ Dropdown Layer → Utils Layer (SafeTriangle, MouseTracker, Emitter, Sanitize)
- ✅ Core Layer → Utils Layer
- ❌ Utils Layer must NOT depend on DOM, Core, Dropdown, or API
- ❌ Core Layer must NOT depend on DOM, Dropdown, or API

## Key Principles

1. **Pure math functions** — geometry helpers take inputs, return outputs, no side effects
2. **Explicit state** — all mutable state lives in `PredictionConeMenu` / `DropdownMenu` classes
3. **Config as data** — tuning constants (`coneHalfAngleDeg`, `hysteresisDeg`, `deadzone`, `submenuDelay`) are passed via options
4. **Thin event handlers** — DOM handlers extract coordinates and delegate to core logic
5. **Canvas is optional** — debug visualization is opt-in via `showViz` (radial) / `debug` (dropdown)

## Geometry Model — Prediction Cone (Radial Menu)

The radial menu uses a **prediction cone** to select items:

1. **Pointer Angle** — direction from menu center to current pointer position
2. **Cone Half-Angle** — angular width of acceptance zone (default: 22.5° = 45° total)
3. **Hysteresis** — stability band at cone boundaries to prevent flickering
4. **Deadzone** — circular area near center where no selection occurs

## Geometry Model — Safe Triangle (Dropdown Submenus)

The dropdown menu uses a **safe triangle** to keep submenus open during diagonal pointer movement:

```
cursor ──► A (apex)
            ╲
      B ◄────╲──── submenu top-left
      │        ╲
      │  safe   ╲
      │  zone    ╲
      C ◄──────── submenu bottom-left
```

1. **Apex (A)** — last cursor position on the parent menu row
2. **B, C** — near-edge corners of the submenu panel (with configurable padding)
3. **Hit-test** — `isInSafeZone()` checks triangle ∪ submenu rect
4. **Expiry** — grace period (`submenuDelay`) before closing if pointer exits the safe zone
5. **Touch bypass** — triangle logic is disabled for `pointerType === "touch"` (native mobile UX)
6. **Debug canvas** — optional fixed overlay (`z-index: 2147483646`) that draws the triangle, rect, and apex in real time
