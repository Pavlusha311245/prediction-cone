/**
 * CSS injection for the dropdown menu component
 *
 * Uses "pcd-" prefix (prediction-cone-dropdown) to avoid conflicts
 * with the radial menu's "pcm-" styles.
 *
 * @module prediction-cone/dropdown/styles
 */

const STYLE_TAG_ID = "pcd-styles";

const lightTheme = {
  "--pcd-bg": "rgba(255, 255, 255, 0.98)",
  "--pcd-border": "rgba(228, 228, 231, 1)",
  "--pcd-text": "#111118",
  "--pcd-text-muted": "#6b7280",
  "--pcd-hover-bg": "rgba(237, 233, 254, 0.7)",
  "--pcd-hover-text": "#5b21b6",
  "--pcd-active-bg": "rgba(237, 233, 254, 0.9)",
  "--pcd-active-text": "#5b21b6",
  "--pcd-shadow": "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
  "--pcd-icon-color": "#374151",
};

const darkTheme = {
  "--pcd-bg": "rgba(17, 17, 24, 0.98)",
  "--pcd-border": "rgba(30, 30, 38, 1)",
  "--pcd-text": "#f4f4f8",
  "--pcd-text-muted": "#71717a",
  "--pcd-hover-bg": "rgba(30, 21, 51, 0.7)",
  "--pcd-hover-text": "#a78bfa",
  "--pcd-active-bg": "rgba(30, 21, 51, 0.9)",
  "--pcd-active-text": "#a78bfa",
  "--pcd-shadow": "0 4px 20px rgba(0,0,0,0.35), 0 1px 6px rgba(0,0,0,0.25)",
  "--pcd-icon-color": "rgba(244, 244, 248, 0.85)",
};

const baseCSS = `
  /* ── Dropdown Menu ─────────────────────────────────── */
  .pcd-menu {
    position: fixed;
    z-index: 999999;
    min-width: 180px;
    padding: 4px;
    background: var(--pcd-bg);
    border: 1px solid var(--pcd-border);
    border-radius: 10px;
    box-shadow: var(--pcd-shadow);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
    transition: opacity 0.12s ease, transform 0.12s cubic-bezier(0.34, 1.46, 0.64, 1);
    pointer-events: auto;
  }

  .pcd-menu.pcd-visible {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  .pcd-submenu {
    transform-origin: left top;
  }

  /* ── Item row ──────────────────────────────────────── */
  .pcd-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 7px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    font-size: 13px;
    font-weight: 500;
    color: var(--pcd-text);
    white-space: nowrap;
    transition: background 0.1s ease, color 0.1s ease;
    position: relative;
  }

  .pcd-item:hover,
  .pcd-item.pcd-active {
    background: var(--pcd-hover-bg);
    color: var(--pcd-hover-text);
  }

  .pcd-item.pcd-active {
    background: var(--pcd-active-bg);
    color: var(--pcd-active-text);
  }

  .pcd-item.pcd-disabled {
    opacity: 0.38;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* ── Icon ──────────────────────────────────────────── */
  .pcd-item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1em;
    line-height: 1;
    color: var(--pcd-icon-color);
    flex-shrink: 0;
    width: 1.3em;
  }

  .pcd-item:hover .pcd-item-icon,
  .pcd-item.pcd-active .pcd-item-icon {
    color: var(--pcd-hover-text);
  }

  .pcd-item-icon svg {
    width: 1.1em;
    height: 1.1em;
  }

  /* ── Label ─────────────────────────────────────────── */
  .pcd-item-label {
    flex: 1;
  }

  /* ── Submenu arrow indicator ───────────────────────── */
  .pcd-item-arrow {
    width: 0;
    height: 0;
    border-left: 4px solid var(--pcd-text-muted);
    border-top: 3.5px solid transparent;
    border-bottom: 3.5px solid transparent;
    margin-left: auto;
    flex-shrink: 0;
    opacity: 0.6;
    transition: opacity 0.1s ease, border-left-color 0.1s ease;
  }

  .pcd-item:hover .pcd-item-arrow,
  .pcd-item.pcd-active .pcd-item-arrow {
    border-left-color: var(--pcd-hover-text);
    opacity: 0.9;
  }
`;

function mergeTheme(base: Record<string, string>, custom?: Record<string, string>) {
  return custom ? { ...base, ...custom } : base;
}

function cssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
}

function generateCSS(themeVars: Record<string, string>): string {
  return `:root {\n${cssVarsToString(themeVars)}\n}\n\n${baseCSS}`.trim();
}

/**
 * Inject dropdown styles. Idempotent.
 */
export function injectDropdownStyles(
  theme: "light" | "dark" | Record<string, string> = "light"
): void {
  if (document.getElementById(STYLE_TAG_ID)) return;

  let themeVars: Record<string, string>;
  if (theme === "light") themeVars = lightTheme;
  else if (theme === "dark") themeVars = darkTheme;
  else themeVars = mergeTheme(lightTheme, theme);

  const tag = document.createElement("style");
  tag.id = STYLE_TAG_ID;
  tag.type = "text/css";
  tag.textContent = generateCSS(themeVars);
  document.head.appendChild(tag);
}

/**
 * Remove dropdown styles. Idempotent.
 */
export function removeDropdownStyles(): void {
  document.getElementById(STYLE_TAG_ID)?.remove();
}
