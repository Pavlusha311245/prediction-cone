# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-29

### Added

- **Dropdown menu** (`createDropdownMenu`) — a traditional vertical dropdown with submenu support
- **Safe-triangle navigation** — diagonal pointer movement prediction that keeps submenus open while the cursor moves toward them (Amazon/macOS-style)
- **Debug overlay** for safe-triangle — pass `debug: true` to `DropdownMenuOptions` to render a real-time canvas showing the triangle zone, submenu rect, and apex point
- **Interactive triangle toggle** in the vanilla demo — click "🔺 triangle" chip to enable/disable the debug overlay live
- **MouseTracker** utility — ring-buffer pointer history with velocity computation, exported for custom menu implementations
- **SafeTriangle** utility — exported for building custom menus with triangle-safe hover prediction
- `DropdownMenuInstance` public API: `attach`, `detach`, `openAt`, `close`, `setItems`, `destroy`, `isOpen`, `on`
- Dropdown events: `open`, `close`, `select` (with `parentItem` for submenu selections)
- Dropdown trigger modes: `click`, `contextmenu`
- `submenuDelay` option — configurable grace period (ms) before submenu closes
- Touch detection — safe-triangle is automatically disabled on touch devices for native mobile UX
- Dropdown CSS theming with `pcd-` prefix (light/dark/custom)
- Item features: `separator`, `danger`, `shortcut`, `children` (nested submenus), `disabled`
- HTML/SVG icon sanitization in dropdown rows (same XSS protection as radial menu)
- Unit tests for `MouseTracker` and `SafeTriangle`
- Context7 AI chat widget in the demo page

### Changed

- Updated vanilla demo with a dedicated dropdown demo section
- Expanded type exports: `DropdownMenuInstance`, `DropdownMenuOptions`, `SafeTriangle`, `MouseTracker`, `Point`, `SafeTriangleOptions`, `TriangleVertices`

## [0.1.1] - 2026-03-29

### Fixed

- Fixed npm package deployment (initial publish pipeline)
- Fixed UI jitter when moving the pointer rapidly near cone sector boundaries

## [0.1.0] - 2026-03-28

### Added

- Full prediction cone selection logic with angular matching
- Themeable DOM overlay with light/dark/custom themes
- Touch and mouse support via Pointer Events API
- Configurable deadzone, hysteresis, cone angle, ring radius
- Edge-safe anchor placement to keep menu in viewport
- Responsive sizing via viewport-aware callbacks
- Keyboard support (Escape to close)
- ARIA roles for accessibility (`role="menu"`, `role="menuitem"`)
- Attach/detach triggers: `pointerdown`, `contextmenu`, `longpress`
- Per-target item overrides and context data
- Event system: `open`, `close`, `change`, `select`
- Optional debug canvas visualization (`showViz`)
- HTML/SVG icon sanitizer via HTMLRewriter (XSS protection, zero dependencies)
- ESM + CJS + TypeScript declarations output
- Unit tests for geometry utilities and sanitizer
- Vanilla HTML example
