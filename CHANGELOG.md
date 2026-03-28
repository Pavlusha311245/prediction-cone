# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
