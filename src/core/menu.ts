/**
 * Core prediction cone menu state machine and business logic
 * Handles:
 * - Menu state (open/closed)
 * - Item selection via cone prediction
 * - Hysteresis for stability
 * - Edge-safe anchor placement
 * - Responsive sizing
 *
 * @module prediction-cone/core/menu
 */

import type {
  ConeItem,
  ConeMenuEventPayload,
  ConeMenuState,
  ConeOptions,
  Viewport,
} from "../types";
import { EventEmitter } from "../utils/emitter";
import {
  applyHysteresis,
  calculateSafeAnchor,
  deg2rad,
  isInDeadzone,
  positionOnRing,
  vecAngle,
} from "../utils/geometry";

/**
 * Internal menu state
 */
interface MenuStateInternal {
  open: boolean;
  activeId?: string;
  anchor?: { x: number; y: number };
  pointer?: { x: number; y: number };
  activeIndex?: number; // For hysteresis tracking
}

/**
 * Core menu engine
 */
export class PredictionConeMenu {
  private state: MenuStateInternal = { open: false };
  private emitter = new EventEmitter<{
    open: ConeMenuEventPayload;
    close: ConeMenuEventPayload;
    change: ConeMenuEventPayload;
    select: ConeMenuEventPayload;
  }>();

  // Configuration
  private items: ConeItem[] = [];
  private ringRadius: number | ((vp: Viewport) => number) = 110;
  private itemSize: number | ((vp: Viewport) => number) = 56;
  private deadzonePx: number = 30;
  private coneHalfAngleDeg: number = 22.5;
  private hysteresisDeg: number = 3;
  private startAngleDeg: number = -90; // Top
  private edgePadding: number = 16;
  private preferSafePlacement: boolean = true;

  // Computed values
  private itemAngles: number[] = [];
  private computedRingRadius: number = 110;
  private computedItemSize: number = 56;

  /**
   * Create a new prediction cone menu
   * @param options - Configuration options
   */
  constructor(options: ConeOptions) {
    this.setOptions(options);
  }

  /**
   * Set or update menu options
   */
  setOptions(options: Partial<ConeOptions>): void {
    if (options.items !== undefined) {
      this.items = options.items;
    }
    if (options.ringRadius !== undefined) {
      this.ringRadius = options.ringRadius;
    }
    if (options.itemSize !== undefined) {
      this.itemSize = options.itemSize;
    }
    if (options.deadzone !== undefined) {
      this.deadzonePx = options.deadzone;
    }
    if (options.coneHalfAngleDeg !== undefined) {
      this.coneHalfAngleDeg = options.coneHalfAngleDeg;
    }
    if (options.hysteresisDeg !== undefined) {
      this.hysteresisDeg = options.hysteresisDeg;
    }
    if (options.startAngleDeg !== undefined) {
      this.startAngleDeg = options.startAngleDeg;
    }
    if (options.edgePadding !== undefined) {
      this.edgePadding = options.edgePadding;
    }
    if (options.preferSafePlacement !== undefined) {
      this.preferSafePlacement = options.preferSafePlacement;
    }
  }

  /**
   * Set menu items
   */
  setItems(items: ConeItem[]): void {
    this.items = items;
    // Recompute angles if menu is open
    if (this.state.open) {
      this.computeItemAngles();
    }
  }

  /**
   * Compute responsive sizing based on viewport
   */
  private getViewport(): Viewport {
    const w = Math.max(window.innerWidth, 320);
    const h = Math.max(window.innerHeight, 320);
    const dpr = window.devicePixelRatio ?? 1;
    return { w, h, dpr };
  }

  /**
   * Resolve ring radius (static number or function result)
   */
  private resolveRingRadius(): number {
    const vp = this.getViewport();
    if (typeof this.ringRadius === "function") {
      return Math.max(50, this.ringRadius(vp));
    }
    return Math.max(50, this.ringRadius);
  }

  /**
   * Resolve item size (static number or function result)
   */
  private resolveItemSize(): number {
    const vp = this.getViewport();
    if (typeof this.itemSize === "function") {
      return Math.max(20, this.itemSize(vp));
    }
    return Math.max(20, this.itemSize);
  }

  /**
   * Compute item angles around the ring
   * Called when menu opens or items change
   */
  private computeItemAngles(): void {
    this.itemAngles = [];
    const startRad = deg2rad(this.startAngleDeg);

    for (let i = 0; i < this.items.length; i++) {
      const pos = positionOnRing(i, this.items.length, 1, startRad); // radius=1 for angle only
      this.itemAngles.push(pos.angleRad);
    }
  }

  /**
   * Calculate safe anchor position considering viewport bounds
   */
  private calculateSafeAnchorPosition(
    proposedX: number,
    proposedY: number
  ): {
    x: number;
    y: number;
  } {
    if (!this.preferSafePlacement) {
      return { x: proposedX, y: proposedY };
    }

    const vp = this.getViewport();
    return calculateSafeAnchor(
      proposedX,
      proposedY,
      vp.w,
      vp.h,
      this.computedRingRadius,
      this.computedItemSize,
      this.edgePadding
    );
  }

  /**
   * Open the menu at a specific position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param context - Optional context to pass to event handlers
   */
  openAt(x: number, y: number, context?: any): void {
    if (this.state.open) {
      // Already open, just move anchor
      this.state.anchor = { x, y };
      return;
    }

    // Resolve sizing
    this.computedRingRadius = this.resolveRingRadius();
    this.computedItemSize = this.resolveItemSize();

    // Compute item angles
    this.computeItemAngles();

    // Calculate safe anchor
    const anchor = this.calculateSafeAnchorPosition(x, y);

    // Update state
    this.state.open = true;
    this.state.anchor = anchor;
    this.state.pointer = { x: anchor.x, y: anchor.y }; // Start at anchor
    this.state.activeIndex = undefined;
    this.state.activeId = undefined;

    // Emit open event
    this.emitter.emit("open", {
      anchor: this.state.anchor,
      pointer: this.state.pointer,
      context,
    });
  }

  /**
   * Close the menu
   */
  close(context?: any): void {
    if (!this.state.open) {
      return;
    }

    const payload: ConeMenuEventPayload = {
      anchor: this.state.anchor!,
      pointer: this.state.pointer!,
      activeId: this.state.activeId,
      context,
    };

    this.state.open = false;
    this.state.activeIndex = undefined;
    this.state.activeId = undefined;

    this.emitter.emit("close", payload);
  }

  /**
   * Update pointer position (called on mousemove, touchmove, etc.)
   * Performs cone prediction and hysteresis logic
   */
  updatePointer(x: number, y: number, context?: any): void {
    if (!this.state.open || !this.state.anchor) {
      return;
    }

    this.state.pointer = { x, y };

    // Calculate vector from anchor to pointer
    const dx = x - this.state.anchor.x;
    const dy = y - this.state.anchor.y;

    // Check deadzone
    if (isInDeadzone(x, y, this.state.anchor.x, this.state.anchor.y, this.deadzonePx)) {
      // Inside deadzone: deactivate if active
      if (this.state.activeId !== undefined) {
        this.state.activeId = undefined;
        this.state.activeIndex = undefined;
        this.emitter.emit("change", {
          anchor: this.state.anchor,
          pointer: this.state.pointer,
          context,
        });
      }
      return;
    }

    // Get pointer angle
    const pointerAngleRad = vecAngle(dx, dy);

    // Convert cone and hysteresis to radians
    const coneRad = deg2rad(this.coneHalfAngleDeg);
    const hysteresisRad = deg2rad(this.hysteresisDeg);

    // Find best active item with hysteresis
    const newActiveIndex = applyHysteresis(
      pointerAngleRad,
      this.itemAngles,
      this.state.activeIndex ?? -1,
      coneRad,
      hysteresisRad
    );

    // Check if active item changed
    let activeItemChanged = false;

    if (newActiveIndex !== (this.state.activeIndex ?? -1)) {
      activeItemChanged = true;
      this.state.activeIndex = newActiveIndex;

      if (newActiveIndex >= 0) {
        this.state.activeId = this.items[newActiveIndex]?.id;
      } else {
        this.state.activeId = undefined;
      }
    }

    if (activeItemChanged) {
      this.emitter.emit("change", {
        anchor: this.state.anchor,
        pointer: this.state.pointer,
        item: this.state.activeId ? this.items[newActiveIndex] : undefined,
        activeId: this.state.activeId,
        context,
      });
    }
  }

  /**
   * Select the currently active item
   * Called on pointerup
   */
  selectActive(context?: any): void {
    if (this.state.activeId && this.state.activeIndex !== undefined) {
      const item = this.items[this.state.activeIndex];
      if (item && !item.disabled) {
        this.emitter.emit("select", {
          anchor: this.state.anchor!,
          pointer: this.state.pointer!,
          item,
          activeId: item.id,
          context,
        });
      }
    }
  }

  /**
   * Check if menu is open
   */
  isOpen(): boolean {
    return this.state.open;
  }

  /**
   * Get current state snapshot
   */
  getState(): Readonly<ConeMenuState> {
    return {
      open: this.state.open,
      activeId: this.state.activeId,
      anchor: this.state.anchor,
      pointer: this.state.pointer,
    };
  }

  /**
   * Register event listener
   */
  on(
    eventName: "open" | "close" | "change" | "select",
    handler: (payload: ConeMenuEventPayload) => void
  ): () => void {
    return this.emitter.on(eventName as any, handler);
  }

  /**
   * Get item at index
   */
  getItemAt(index: number): ConeItem | undefined {
    return this.items[index];
  }

  /**
   * Get current item angles (for debug/viz purposes)
   */
  getItemAngles(): readonly number[] {
    return this.itemAngles;
  }

  /**
   * Get computed sizes
   */
  getComputedSizes(): {
    ringRadius: number;
    itemSize: number;
  } {
    return {
      ringRadius: this.computedRingRadius,
      itemSize: this.computedItemSize,
    };
  }

  /**
   * Get item positions on ring
   */
  getItemPositions(): Array<{ x: number; y: number; angleRad: number }> {
    const startRad = deg2rad(this.startAngleDeg);
    return this.items.map((_, i) => positionOnRing(i, this.items.length, 1, startRad));
  }
}
