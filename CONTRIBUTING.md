# Contributing

Thank you for considering contributing to **prediction-cone**!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Pavlusha311245/prediction-cone.git
cd prediction-cone

# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Lint
bun run lint
```

## Project Structure

```
src/
├── index.ts           # Public API entry point
├── types.ts           # All public TypeScript interfaces
├── core/
│   └── menu.ts        # Core state machine & cone logic
├── dom/
│   ├── overlay.ts     # DOM rendering & pointer handling
│   ├── trigger.ts     # Attach/detach trigger management
│   └── styles.ts      # CSS injection & theming (pcm- prefix)
├── dropdown/
│   ├── menu.ts        # Dropdown menu with safe-triangle submenu navigation
│   └── styles.ts      # CSS injection & theming (pcd- prefix)
└── utils/
    ├── geometry.ts     # Pure math functions
    ├── geometry.test.ts
    ├── emitter.ts      # Event emitter
    ├── rafThrottle.ts  # rAF-based throttle
    ├── sanitize.ts     # HTML/SVG icon sanitizer (XSS protection)
    ├── sanitize.test.ts
    ├── safeTriangle.ts     # Diagonal cursor prediction (triangle zone)
    ├── safeTriangle.test.ts
    ├── mouseTracker.ts     # Ring-buffer pointer history + velocity
    └── mouseTracker.test.ts
```

## Guidelines

1. **Write tests** for any new utility functions
2. **Run `bun run lint`** before committing
3. **Run `bun run type-check`** to verify types
4. **Keep zero runtime dependencies** — this library has none and should stay that way
5. **Follow the layered architecture** — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests
4. Ensure all checks pass: `bun test && bun run lint && bun run type-check`
5. Submit a pull request with a clear description

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. Run:

```bash
bun run format    # Auto-format
bun run lint      # Lint & auto-fix
```
