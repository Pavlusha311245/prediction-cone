/**
 * CSS injection and theming for the prediction cone menu
 * Injects all necessary styles into the document
 *
 * @module prediction-cone/dom/styles
 */

const STYLE_TAG_ID = "pcm-styles";

/**
 * Default light theme colors
 */
const lightTheme = {
  "--pcm-bg": "rgba(255, 255, 255, 0.97)",
  "--pcm-border": "rgba(228, 228, 231, 1)",
  "--pcm-activeBg": "rgba(237, 233, 254, 0.97)",
  "--pcm-activeBorder": "#7c3aed",
  "--pcm-activeRing": "rgba(124, 58, 237, 0.18)",
  "--pcm-activeGlow": "rgba(124, 58, 237, 0.14)",
  "--pcm-text": "#111118",
  "--pcm-activeText": "#5b21b6",
  "--pcm-shadow": "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
  "--pcm-iconColor": "#374151",
};

/**
 * Default dark theme colors
 */
const darkTheme = {
  "--pcm-bg": "rgba(17, 17, 24, 0.98)",
  "--pcm-border": "rgba(30, 30, 38, 1)",
  "--pcm-activeBg": "rgba(30, 21, 51, 0.98)",
  "--pcm-activeBorder": "#a78bfa",
  "--pcm-activeRing": "rgba(167, 139, 250, 0.22)",
  "--pcm-activeGlow": "rgba(167, 139, 250, 0.18)",
  "--pcm-text": "#f4f4f8",
  "--pcm-activeText": "#a78bfa",
  "--pcm-shadow": "0 2px 12px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)",
  "--pcm-iconColor": "rgba(244, 244, 248, 0.85)",
};

/**
 * Base CSS for the prediction cone menu
 */
const baseCSS = `
  @keyframes pcm-backdrop-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* Overlay */
  .pcm-overlay {
    position: fixed;
    inset: 0;
    display: none;
    z-index: 999999;
    pointer-events: auto;
    touch-action: none;
  }

  .pcm-overlay.pcm-open {
    display: block;
    animation: pcm-backdrop-in 0.1s ease;
  }

  /* Menu container */
  .pcm-menu {
    position: fixed;
    left: 0; top: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  /* ── Item ─────────────────────────────────────────── */
  .pcm-item {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    left: 50%; top: 50%;

    /* entrance state */
    transform: translate(-50%, -50%) scale(0.72);
    opacity: 0;

    background: var(--pcm-bg);
    border: 1px solid var(--pcm-border);
    border-radius: 12px;
    cursor: pointer;
    pointer-events: auto;
    user-select: none;
    -webkit-user-select: none;

    transition:
      transform  0.22s cubic-bezier(0.34, 1.46, 0.64, 1),
      opacity    0.16s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      background 0.15s ease,
      color      0.15s ease;

    box-shadow: var(--pcm-shadow);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    font-size: 13px;
    font-weight: 500;
    color: var(--pcm-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    line-height: 1.3;
    -webkit-font-smoothing: antialiased;
  }

  /* open → items appear */
  .pcm-overlay.pcm-open .pcm-item {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }

  /* staggered entrance delays */
  .pcm-overlay.pcm-open .pcm-item:nth-child(1) { transition-delay: 0ms;  }
  .pcm-overlay.pcm-open .pcm-item:nth-child(2) { transition-delay: 18ms; }
  .pcm-overlay.pcm-open .pcm-item:nth-child(3) { transition-delay: 36ms; }
  .pcm-overlay.pcm-open .pcm-item:nth-child(4) { transition-delay: 54ms; }
  .pcm-overlay.pcm-open .pcm-item:nth-child(5) { transition-delay: 72ms; }
  .pcm-overlay.pcm-open .pcm-item:nth-child(6) { transition-delay: 90ms; }
  .pcm-overlay.pcm-open .pcm-item:nth-child(7) { transition-delay: 108ms; }
  .pcm-overlay.pcm-open .pcm-item:nth-child(8) { transition-delay: 126ms; }

  /* ── Active state ─────────────────────────────────── */
  .pcm-item.pcm-active {
    border-color: var(--pcm-activeBorder);
    box-shadow:
      var(--pcm-shadow),
      0 0 0 3px var(--pcm-activeRing),
      0 0 24px var(--pcm-activeGlow);
    background: var(--pcm-activeBg);
    transform: translate(-50%, -50%) scale(1.13);
    color: var(--pcm-activeText);
    transition-delay: 0ms !important;
  }

  /* ── Disabled ─────────────────────────────────────── */
  .pcm-item.pcm-disabled {
    opacity: 0.38;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* ── Icon ─────────────────────────────────────────── */
  .pcm-item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.45em;
    line-height: 1;
    color: var(--pcm-iconColor);
    transition: color 0.15s ease;
  }

  .pcm-item.pcm-active .pcm-item-icon {
    color: var(--pcm-activeText);
  }

  .pcm-item-icon svg {
    width: 1.35em;
    height: 1.35em;
  }

  /* ── Label ────────────────────────────────────────── */
  .pcm-item-label {
    white-space: nowrap;
    text-align: center;
    padding: 0 6px;
    font-size: 0.73em;
    font-weight: 500;
    letter-spacing: 0.01em;
    opacity: 0.72;
    transition: opacity 0.15s ease;
  }

  .pcm-item.pcm-active .pcm-item-label {
    opacity: 1;
  }

  /* ── Debug canvas ─────────────────────────────────── */
  .pcm-debug-canvas {
    position: fixed;
    top: 0; left: 0;
    pointer-events: none;
    z-index: 999998;
  }
`;

/**
 * Merge theme variables (custom overrides default)
 */
function mergeTheme(base: Record<string, string>, custom?: Record<string, string>) {
  return custom ? { ...base, ...custom } : base;
}

/**
 * Convert CSS variable object to CSS text
 */
function cssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

/**
 * Generate complete CSS string with theme variables
 */
function generateCSS(themeVars: Record<string, string>): string {
  const cssVars = cssVarsToString(themeVars);

  return `
:root {
${cssVars}
}

${baseCSS}
`.trim();
}

/**
 * Inject styles into the document
 * Idempotent: safe to call multiple times
 *
 * @param theme - Theme: "light", "dark", or custom CSS variables object
 */
export function injectStyles(theme: "light" | "dark" | Record<string, string> = "light"): void {
  // Check if styles already injected
  if (document.getElementById(STYLE_TAG_ID)) {
    return;
  }

  // Determine theme variables
  let themeVars: Record<string, string>;
  if (theme === "light") {
    themeVars = lightTheme;
  } else if (theme === "dark") {
    themeVars = darkTheme;
  } else {
    themeVars = mergeTheme(lightTheme, theme);
  }

  // Generate CSS
  const css = generateCSS(themeVars);

  // Create and inject style tag
  const styleTag = document.createElement("style");
  styleTag.id = STYLE_TAG_ID;
  styleTag.type = "text/css";
  styleTag.textContent = css;

  document.head.appendChild(styleTag);
}

/**
 * Update theme variables at runtime
 * @param theme - New theme ("light", "dark", or custom variables)
 */
export function updateTheme(theme: "light" | "dark" | Record<string, string> = "light"): void {
  // Get or inject style tag
  const styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;

  if (!styleTag) {
    injectStyles(theme);
    return;
  }

  // Determine theme variables
  let themeVars: Record<string, string>;
  if (theme === "light") {
    themeVars = lightTheme;
  } else if (theme === "dark") {
    themeVars = darkTheme;
  } else {
    themeVars = mergeTheme(lightTheme, theme);
  }

  // Update style tag
  styleTag.textContent = generateCSS(themeVars);
}

/**
 * Remove styles from the document
 * Idempotent: safe to call multiple times
 */
export function removeStyles(): void {
  const styleTag = document.getElementById(STYLE_TAG_ID);
  if (styleTag) {
    styleTag.remove();
  }
}
