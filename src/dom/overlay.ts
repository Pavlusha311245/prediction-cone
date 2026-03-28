/**
 * DOM overlay creation, rendering, and pointer event handling
 *
 * @module prediction-cone/dom/overlay
 */

import type { PredictionConeMenu } from "../core/menu";
import type { ConeItem, ConeOptions } from "../types";
import { deg2rad, positionOnRing } from "../utils/geometry";
import { createRafThrottle } from "../utils/rafThrottle";
import { sanitizeHtml } from "../utils/sanitize";
import { injectStyles, removeStyles } from "./styles";

/**
 * DOM management for the prediction cone menu
 */
export class DOMOverlay {
  private menu: PredictionConeMenu;
  private options: ConeOptions;
  private container: HTMLElement;

  // DOM elements
  private overlay: HTMLElement | null = null;
  private menuContainer: HTMLElement | null = null;
  private itemElements: Map<string, HTMLElement> = new Map();
  private debugCanvas: HTMLCanvasElement | null = null;

  // Event handling
  private pointerDownHandler = this.onPointerDown.bind(this);
  private pointerMoveHandler = this.onPointerMove.bind(this);
  private pointerUpHandler = this.onPointerUp.bind(this);
  private keyDownHandler = this.onKeyDown.bind(this);

  // rAF throttling for move events
  private throttledUpdate = createRafThrottle(() => this.updateVisualization());

  /**
   * Resolves when all item icons have been sanitized and the overlay is fully rendered.
   * Awaited by open() to ensure icons are ready before the menu is shown.
   */
  public ready: Promise<void> = Promise.resolve();

  constructor(menu: PredictionConeMenu, options: ConeOptions) {
    this.menu = menu;
    this.options = options;
    this.container = options.container || document.body;

    // Inject styles
    injectStyles(options.theme);

    // Create DOM (async: icon strings are sanitized via HTMLRewriter)
    this.ready = this.createDOM();
  }

  /**
   * Create overlay and menu DOM structure
   */
  private async createDOM(): Promise<void> {
    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "pcm-overlay";
    this.overlay.setAttribute("aria-hidden", "true");

    // Create menu container
    this.menuContainer = document.createElement("div");
    this.menuContainer.className = "pcm-menu";
    this.overlay.appendChild(this.menuContainer);

    // Bind pointer events to overlay for capture
    this.overlay.addEventListener("pointerdown", this.pointerDownHandler, true);
    this.overlay.addEventListener("pointermove", this.pointerMoveHandler);
    this.overlay.addEventListener("pointerup", this.pointerUpHandler);
    this.overlay.addEventListener("keydown", this.keyDownHandler);

    // Create debug canvas if needed
    if (this.options.showViz) {
      this.debugCanvas = document.createElement("canvas");
      this.debugCanvas.className = "pcm-debug-canvas";
      this.debugCanvas.style.display = "none";
      document.body.appendChild(this.debugCanvas);
    }

    // Create item elements (icon strings are sanitized async via HTMLRewriter)
    await this.createItemElements();

    // Append to container only after all icons are sanitized
    this.container.appendChild(this.overlay);
  }

  /**
   * Create menu item elements
   */
  private async createItemElements(): Promise<void> {
    if (!this.menuContainer) return;

    this.itemElements.clear();
    this.menuContainer.innerHTML = "";

    for (const item of this.options.items || []) {
      const itemEl = document.createElement("div");
      itemEl.className = "pcm-item";
      if (item.disabled) {
        itemEl.classList.add("pcm-disabled");
      }
      itemEl.setAttribute("role", "menuitem");
      itemEl.setAttribute("aria-label", item.label);
      itemEl.setAttribute("data-id", item.id);

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("div");
        iconEl.className = "pcm-item-icon";

        if (typeof item.icon === "string") {
          // String: CSS class or emoji
          if (item.icon.includes("<")) {
            // HTML/SVG icon — sanitize via HTMLRewriter before insertion to prevent XSS
            iconEl.innerHTML = await sanitizeHtml(item.icon);
          } else {
            // Assume emoji or text
            iconEl.textContent = item.icon;
          }
        } else if (item.icon instanceof HTMLElement) {
          iconEl.appendChild(item.icon.cloneNode(true));
        } else if (typeof item.icon === "function") {
          const iconContent = item.icon();
          if (iconContent) {
            iconEl.appendChild(iconContent.cloneNode(true));
          }
        }

        itemEl.appendChild(iconEl);
      }

      // Label
      if (item.label) {
        const labelEl = document.createElement("div");
        labelEl.className = "pcm-item-label";
        labelEl.textContent = item.label;
        itemEl.appendChild(labelEl);
      }

      itemEl.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        // Selection is already handled by pointerup
        this.menu.close({ fromClick: true });
      });

      this.menuContainer.appendChild(itemEl);
      this.itemElements.set(item.id, itemEl);
    }
  }

  /**
   * Update item positions based on current menu state
   */
  private updateItemPositions(): void {
    if (!this.overlay?.classList.contains("pcm-open")) {
      return;
    }

    const state = this.menu.getState();
    if (!state.anchor) return;

    const { ringRadius, itemSize } = this.menu.getComputedSizes();
    const startRad = deg2rad(this.options.startAngleDeg ?? -90);

    for (let i = 0; i < (this.options.items || []).length; i++) {
      const item = this.options.items![i];
      const itemEl = this.itemElements.get(item.id);
      if (!itemEl) continue;

      const pos = positionOnRing(i, (this.options.items || []).length, ringRadius, startRad);

      // Position in viewport coordinates
      const x = state.anchor.x + pos.x;
      const y = state.anchor.y + pos.y;

      itemEl.style.left = `${x}px`;
      itemEl.style.top = `${y}px`;
      itemEl.style.width = "auto";
      itemEl.style.minWidth = `${itemSize}px`;
      itemEl.style.height = `${itemSize}px`;
    }
  }

  /**
   * Update active item styling
   */
  private updateActiveState(): void {
    const state = this.menu.getState();

    for (const [id, itemEl] of this.itemElements) {
      if (id === state.activeId) {
        itemEl.classList.add("pcm-active");
      } else {
        itemEl.classList.remove("pcm-active");
      }
    }
  }

  /**
   * Update visualization (positions, active state, debug canvas)
   */
  private updateVisualization(): void {
    this.updateItemPositions();
    this.updateActiveState();

    if (this.options.showViz && this.debugCanvas) {
      this.drawDebugCanvas();
    }
  }

  /**
   * Draw debug visualization on canvas
   */
  private drawDebugCanvas(): void {
    if (!this.debugCanvas) return;

    const state = this.menu.getState();
    if (!state.open || !state.anchor || !state.pointer) {
      this.debugCanvas.style.display = "none";
      return;
    }

    this.debugCanvas.style.display = "block";
    this.debugCanvas.width = window.innerWidth;
    this.debugCanvas.height = window.innerHeight;

    const ctx = this.debugCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);

    // Draw anchor point
    ctx.fillStyle = "rgba(100, 200, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(state.anchor.x, state.anchor.y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Draw deadzone circle
    const deadzone = this.options.deadzone ?? 30;
    ctx.strokeStyle = "rgba(100, 150, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.anchor.x, state.anchor.y, deadzone, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw pointer position
    ctx.fillStyle = "rgba(255, 100, 100, 0.5)";
    ctx.beginPath();
    ctx.arc(state.pointer.x, state.pointer.y, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Draw pointer direction vector
    ctx.strokeStyle = "rgba(255, 150, 100, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.anchor.x, state.anchor.y);
    ctx.lineTo(state.pointer.x, state.pointer.y);
    ctx.stroke();

    // Draw cone sectors
    const coneRad = (this.options.coneHalfAngleDeg ?? 22.5) * (Math.PI / 180);
    const angles = this.menu.getItemAngles();

    for (const angle of angles) {
      // Draw cone for this item
      ctx.strokeStyle = "rgba(150, 200, 100, 0.3)";
      ctx.lineWidth = 1;

      // Cone boundaries
      const r1 = 150; // radius for visualization
      const x1 = state.anchor.x + r1 * Math.cos(angle - coneRad);
      const y1 = state.anchor.y + r1 * Math.sin(angle - coneRad);
      const x2 = state.anchor.x + r1 * Math.cos(angle + coneRad);
      const y2 = state.anchor.y + r1 * Math.sin(angle + coneRad);

      ctx.beginPath();
      ctx.moveTo(state.anchor.x, state.anchor.y);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(state.anchor.x, state.anchor.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  /**
   * Handle pointerdown event
   */
  private onPointerDown(): void {
    if (!this.menu.isOpen()) {
      return;
    }

    // Prevent scrolling while menu is active
  }

  /**
   * Handle pointermove event (throttled)
   */
  private onPointerMove(e: PointerEvent): void {
    if (!this.menu.isOpen()) {
      return;
    }

    this.menu.updatePointer(e.clientX, e.clientY);
    this.throttledUpdate.call();
  }

  /**
   * Handle pointerup event
   */
  private onPointerUp(): void {
    if (!this.menu.isOpen()) {
      return;
    }

    // Select active item if any
    this.menu.selectActive();

    // Close menu
    this.close();
  }

  /**
   * Handle keyboard events (Escape to close)
   */
  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this.menu.isOpen()) {
      e.preventDefault();
      this.close();
    }
  }

  /**
   * Open the menu (show overlay).
   * Awaits this.ready so icons are guaranteed to be rendered before display.
   */
  async open(): Promise<void> {
    await this.ready;
    if (!this.overlay) return;

    this.overlay.classList.add("pcm-open");
    this.overlay.setAttribute("aria-hidden", "false");

    // Focus overlay for keyboard events
    this.overlay.focus();

    // Initial visualization
    this.updateVisualization();
  }

  /**
   * Close the menu (hide overlay)
   */
  close(): void {
    if (!this.overlay) return;

    this.overlay.classList.remove("pcm-open");
    this.overlay.setAttribute("aria-hidden", "true");

    // Cancel pending updates
    this.throttledUpdate.cancel();

    // Hide debug canvas
    if (this.debugCanvas) {
      this.debugCanvas.style.display = "none";
    }
  }

  /**
   * Update menu items.
   * Re-sanitizes icon strings async and updates this.ready so that
   * any concurrent open() call waits until icons are rendered.
   */
  setItems(items: ConeItem[]): void {
    this.options.items = items;
    this.ready = this.createItemElements().then(() => {
      if (this.menu.isOpen()) this.updateVisualization();
    });
  }

  /**
   * Destroy the overlay and clean up
   */
  destroy(): void {
    this.throttledUpdate.cancel();

    // Remove event listeners
    if (this.overlay) {
      this.overlay.removeEventListener("pointerdown", this.pointerDownHandler, true);
      this.overlay.removeEventListener("pointermove", this.pointerMoveHandler);
      this.overlay.removeEventListener("pointerup", this.pointerUpHandler);
      this.overlay.removeEventListener("keydown", this.keyDownHandler);

      this.overlay.remove();
    }

    // Remove debug canvas
    if (this.debugCanvas) {
      this.debugCanvas.remove();
    }

    // Remove styles
    removeStyles();

    this.overlay = null;
    this.menuContainer = null;
    this.itemElements.clear();
    this.debugCanvas = null;
  }

  /**
   * Get DOM elements (for testing)
   */
  getDOM() {
    return {
      overlay: this.overlay,
      menuContainer: this.menuContainer,
      itemElements: this.itemElements,
      debugCanvas: this.debugCanvas,
    };
  }
}
