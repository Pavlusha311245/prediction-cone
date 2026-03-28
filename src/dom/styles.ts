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
  "--pcm-bg": "rgba(255, 255, 255, 0.95)",
  "--pcm-border": "rgba(0, 0, 0, 0.1)",
  "--pcm-activeBorder": "rgba(59, 130, 246, 0.8)",
  "--pcm-activeGlow": "rgba(59, 130, 246, 0.2)",
  "--pcm-text": "rgba(0, 0, 0, 0.9)",
  "--pcm-shadow": "0 4px 16px rgba(0, 0, 0, 0.1)",
  "--pcm-iconColor": "rgba(0, 0, 0, 0.7)",
  "--pcm-hoverBg": "rgba(59, 130, 246, 0.05)",
};

/**
 * Default dark theme colors
 */
const darkTheme = {
  "--pcm-bg": "rgba(20, 20, 28, 0.98)",
  "--pcm-border": "rgba(255, 255, 255, 0.15)",
  "--pcm-activeBorder": "rgba(125, 211, 252, 0.8)",
  "--pcm-activeGlow": "rgba(125, 211, 252, 0.2)",
  "--pcm-text": "rgba(255, 255, 255, 0.95)",
  "--pcm-shadow": "0 4px 16px rgba(0, 0, 0, 0.3)",
  "--pcm-iconColor": "rgba(255, 255, 255, 0.8)",
  "--pcm-hoverBg": "rgba(125, 211, 252, 0.08)",
};

/**
 * Base CSS for the prediction cone menu
 */
const baseCSS = `
  /* Overlay container */
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
  }

  /* Menu container */
  .pcm-menu {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  /* Individual menu item */
  .pcm-item {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: var(--pcm-bg);
    border: 2px solid var(--pcm-border);
    border-radius: 8px;
    cursor: pointer;
    pointer-events: auto;
    user-select: none;
    -webkit-user-select: none;
    transition: all 0.15s ease-out;
    box-shadow: var(--pcm-shadow);
    font-size: 14px;
    font-weight: 500;
    color: var(--pcm-text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.4;
  }

  .pcm-item:hover {
    background: var(--pcm-hoverBg);
  }

  /* Active/hovered state */
  .pcm-item.pcm-active {
    border-color: var(--pcm-activeBorder);
    box-shadow: var(--pcm-shadow), 0 0 16px var(--pcm-activeGlow);
    background: var(--pcm-bg);
    transform: translate(-50%, -50%) scale(1.08);
  }

  /* Disabled item */
  .pcm-item.pcm-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Icon container inside item */
  .pcm-item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--pcm-iconColor);
  }

  .pcm-item-icon svg {
    width: 60%;
    height: 60%;
  }

  /* Label container */
  .pcm-item-label {
    white-space: nowrap;
    text-align: center;
    padding: 4px 8px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Debug visualization canvas */
  .pcm-debug-canvas {
    position: fixed;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 999998;
  }

  /* Accessibility: hide decorative elements from screen readers */
  .pcm-overlay[aria-hidden="true"] {
    /* Assistive tech won't announce menu when hidden */
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
