/**
 * Public types and interfaces for the Prediction Cone Menu library
 *
 * @module prediction-cone/types
 */

/**
 * Viewport descriptor with dimensions and device pixel ratio
 */
export interface Viewport {
  /** Viewport width in CSS pixels */
  w: number;
  /** Viewport height in CSS pixels */
  h: number;
  /** Device pixel ratio (for high-DPI scaling) */
  dpr: number;
}

/**
 * A single menu item in the prediction cone
 */
export interface ConeItem {
  /** Unique identifier for the item */
  id: string;

  /** Display label for the item */
  label: string;

  /** Optional: whether the item is disabled (cannot be selected) */
  disabled?: boolean;

  /** Optional: render as a visual separator (ignores all other fields) */
  separator?: boolean;

  /** Optional: mark item as destructive/danger (renders in red) */
  danger?: boolean;

  /** Optional: keyboard shortcut label to display on the right (e.g. "⌘N") */
  shortcut?: string;

  /**
   * Optional: icon to display. Can be:
   * - A **string** — emoji/text (safe) or an HTML/SVG string (sanitized via allowlist before insertion)
   * - An **HTMLElement** — cloned into the icon slot
   * - A **function** returning an HTMLElement — called once per render
   *
   * HTML/SVG strings are automatically sanitized (script tags, event handlers, and
   * javascript: URLs are stripped). Only use trusted SVG/HTML from your own codebase.
   */
  icon?: string | HTMLElement | (() => HTMLElement);

  /**
   * Optional: nested sub-items displayed as a dropdown panel when this item is active.
   * When set, activating this item opens a submenu instead of selecting it directly.
   * Triangle-based hover prediction keeps the submenu open while the pointer moves
   * diagonally from the parent item toward the submenu panel.
   */
  children?: ConeItem[];
}

/**
 * Core options for creating a prediction cone menu instance
 */
export interface ConeOptions {
  /** Menu items to display */
  items: ConeItem[];

  /** Ring radius (distance from center to item centers)
   * Can be a static number or a function that receives viewport info and returns radius
   * Default: 110px or responsive function
   */
  ringRadius?: number | ((viewport: Viewport) => number);

  /** Item size (width/height in pixels)
   * Can be a static number or a function that receives viewport info and returns size
   * Default: 56px or responsive function
   */
  itemSize?: number | ((viewport: Viewport) => number);

  /** Deadzone radius in pixels (no item selection inside this radius)
   * Default: 30px
   */
  deadzone?: number;

  /** Cone half-angle in degrees (acceptance angle for selection)
   * An item is selected if angle difference is <= coneHalfAngleDeg
   * Default: 22.5 degrees
   */
  coneHalfAngleDeg?: number;

  /** Hysteresis angle in degrees (prevents flickering at cone boundaries)
   * When switching from item A to item B:
   * - Stay on A if new direction is within A's cone + hysteresis
   * - Switch to B only if B is clearly better
   * Default: 3 degrees
   */
  hysteresisDeg?: number;

  /** Starting angle in degrees (-90 = top, 0 = right, 90 = bottom, 180 = left)
   * Items are distributed starting from this angle
   * Default: -90 (first item at top)
   */
  startAngleDeg?: number;

  /** Optional: show debug visualization canvas (pointer vector, cone boundaries)
   * Default: false
   */
  showViz?: boolean;

  /** Long-press duration in milliseconds for touch devices
   * Default: 250ms
   */
  longPressMs?: number;

  /** Padding from viewport edges to ensure menu stays visible
   * Default: 16px
   */
  edgePadding?: number;

  /** Enable safe placement strategy to keep menu items inside viewport
   * Default: true
   */
  preferSafePlacement?: boolean;

  /** Optional: DOM element to mount the overlay into
   * Default: document.body
   */
  container?: HTMLElement;

  /** Optional: theme (light, dark, or custom CSS variables object)
   * Default: "light"
   */
  theme?: "light" | "dark" | Record<string, string>;
}

/**
 * Options for attaching the menu to a trigger element
 */
export interface AttachOptions {
  /** Trigger type
   * - "pointerdown": activate on pointer/mouse/touch down
   * - "contextmenu": activate on right-click context menu
   * - "longpress": activate on long-press (mobile)
   * Default: "pointerdown"
   */
  trigger?: "pointerdown" | "contextmenu" | "longpress";

  /** Mouse button filter (only for pointerdown/contextmenu)
   * 0 = left, 1 = middle, 2 = right
   * Default: undefined (all buttons allowed)
   */
  button?: 0 | 1 | 2;

  /** Whether to call preventDefault() on trigger event
   * Default: false
   */
  preventDefault?: boolean;

  /** Whether to call stopPropagation() on trigger event
   * Default: false
   */
  stopPropagation?: boolean;

  /** Enable/disable guard: can be boolean or function
   * If function returns false, menu won't open
   * Default: true (always enabled)
   */
  enabled?: boolean | (() => boolean);

  /** Optional: menu items override for this specific target
   * If set, these items are used instead of the global items
   */
  items?: ConeItem[];

  /** Optional: context data to pass to events
   * Useful for identifying which target triggered the menu
   */
  context?: any;

  /** Long-press duration in milliseconds for longpress trigger
   * Default: 250ms
   */
  longPressMs?: number;
}

/**
 * Event payload for menu events
 */
export interface ConeMenuEventPayload {
  /** Anchor point (where menu opened) */
  anchor: { x: number; y: number };

  /** Current pointer position */
  pointer: { x: number; y: number };

  /** The item involved (if applicable) */
  item?: ConeItem;

  /** Active item ID (if any) */
  activeId?: string;

  /** Context data from attach options or openAt call */
  context?: any;
}

/**
 * Event handler type for menu events
 */
export type ConeMenuEventHandler = (payload: ConeMenuEventPayload) => void;

/**
 * Internal state snapshot exposed via getState()
 */
export interface ConeMenuState {
  /** Whether the menu is currently open */
  open: boolean;

  /** ID of the currently active item (if any) */
  activeId?: string;

  /** Anchor point where menu was opened */
  anchor?: { x: number; y: number };

  /** Current pointer position (only while open) */
  pointer?: { x: number; y: number };
}

/**
 * Main public API instance for the prediction cone menu
 */
export interface ConeMenuInstance {
  /**
   * Attach the menu to a trigger element
   * @param target - Element or document to attach to
   * @param attachOptions - Trigger and behavior options
   */
  attach(target: Element | Document, attachOptions?: AttachOptions): void;

  /**
   * Detach the menu from a trigger element
   * @param target - Element or document to detach from (detaches all if not specified)
   */
  detach(target?: Element | Document): void;

  /**
   * Open the menu at a specific position
   * @param x - X coordinate (page/viewport coordinates)
   * @param y - Y coordinate (page/viewport coordinates)
   * @param context - Optional context data to pass to events
   */
  openAt(x: number, y: number, context?: any): void;

  /**
   * Close the menu
   */
  close(): void;

  /**
   * Update menu items
   * @param items - New array of menu items
   */
  setItems(items: ConeItem[]): void;

  /**
   * Update menu options (partial)
   * @param options - Partial options to merge with current options
   */
  setOptions(options: Partial<ConeOptions>): void;

  /**
   * Destroy the menu instance and clean up all resources
   */
  destroy(): void;

  /**
   * Check if the menu is currently open
   * @returns true if menu is open, false otherwise
   */
  isOpen(): boolean;

  /**
   * Register an event listener
   * @param eventName - Event name: "open", "close", "change", or "select"
   * @param handler - Event handler function
   * @returns Unsubscribe function to remove the listener
   */
  on(eventName: "open" | "close" | "change" | "select", handler: ConeMenuEventHandler): () => void;

  /**
   * Get current state snapshot (readonly)
   * @returns Current menu state
   */
  getState(): Readonly<ConeMenuState>;
}

/**
 * Factory function to create a new prediction cone menu instance
 * @param options - Configuration options
 * @returns ConeMenuInstance with all public methods
 */
export type CreatePredictionConeMenu = (options: ConeOptions) => ConeMenuInstance;

// ─── Dropdown Menu ───────────────────────────────────────────────────────────

/**
 * Configuration options for the dropdown menu with triangle submenu navigation
 */
export interface DropdownMenuOptions {
  /** Menu items to display. Items with `children` show a nested submenu on hover. */
  items: ConeItem[];

  /** Optional: theme (light, dark, or custom CSS variables object)
   * Default: "light"
   */
  theme?: "light" | "dark" | Record<string, string>;

  /** Optional: DOM element to mount the menu into
   * Default: document.body
   */
  container?: HTMLElement;

  /**
   * Enable safe-triangle debug overlay.  When `true`, a fullscreen fixed
   * `<canvas>` renders the triangle, submenu rect, and apex dot in real time.
   *
   * **DEVELOPMENT ONLY** — do not ship with `debug: true`.
   * Default: false
   */
  debug?: boolean;

  /**
   * Grace period (ms) before the submenu closes when the pointer leaves the
   * parent row without entering the safe zone.  Prevents accidental closure
   * during fast diagonal mouse movements that briefly exit the triangle.
   * Set to `0` to close immediately (no delay).
   * Default: 150
   */
  submenuDelay?: number;
}

/**
 * Trigger options for attaching the dropdown to an element
 */
export interface DropdownAttachOptions {
  /** Trigger type
   * - "click": activate on left click
   * - "contextmenu": activate on right-click
   * Default: "click"
   */
  trigger?: "click" | "contextmenu";

  /** Whether to call preventDefault() on trigger event. Default: true */
  preventDefault?: boolean;

  /** Whether to call stopPropagation() on trigger event. Default: false */
  stopPropagation?: boolean;
}

/**
 * Event payload for dropdown menu events
 */
export interface DropdownMenuEventPayload {
  /** The item involved */
  item?: ConeItem;

  /** The parent item (if this was a submenu selection) */
  parentItem?: ConeItem;
}

/**
 * Public API for the dropdown menu instance
 */
export interface DropdownMenuInstance {
  /** Attach the menu to a trigger element */
  attach(target: Element | Document, options?: DropdownAttachOptions): void;

  /** Detach the menu from a trigger element (or all) */
  detach(target?: Element | Document): void;

  /** Open the menu at specific viewport coordinates */
  openAt(x: number, y: number): void;

  /** Close the menu */
  close(): void;

  /** Update menu items at runtime */
  setItems(items: ConeItem[]): void;

  /** Destroy the instance and clean up all resources */
  destroy(): void;

  /** Check if the menu is currently open */
  isOpen(): boolean;

  /** Register an event listener. Returns an unsubscribe function. */
  on(
    eventName: "open" | "close" | "select",
    handler: (payload: DropdownMenuEventPayload) => void
  ): () => void;
}
