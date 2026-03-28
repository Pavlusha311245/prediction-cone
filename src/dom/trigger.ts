/**
 * Trigger management for attaching/detaching menus to DOM elements
 * Supports pointerdown, contextmenu, and longpress triggers
 *
 * @module prediction-cone/dom/trigger
 */

import type { PredictionConeMenu } from "../core/menu";
import type { AttachOptions } from "../types";
import type { DOMOverlay } from "./overlay";

/**
 * Internal trigger state for a target
 */
interface TriggerState {
  target: Element | Document;
  options: AttachOptions;
  longPressTimer: number | null;
  isLongPressMet: boolean;
}

/**
 * Trigger manager - handles attach/detach and trigger logic
 */
export class TriggerManager {
  private menu: PredictionConeMenu;
  private overlay: DOMOverlay;
  private triggers: Map<Element | Document, TriggerState> = new Map();

  // Event handlers (bound)
  private boundHandlers: Map<
    Element | Document,
    {
      pointerdown: (e: PointerEvent) => void;
      contextmenu: (e: MouseEvent) => void;
      pointermove: (e: PointerEvent) => void;
      pointerup: (e: PointerEvent) => void;
    }
  > = new Map();

  constructor(menu: PredictionConeMenu, overlay: DOMOverlay) {
    this.menu = menu;
    this.overlay = overlay;
  }

  /**
   * Attach menu to a trigger element
   */
  attach(target: Element | Document, attachOptions?: AttachOptions): void {
    // Check if already attached
    if (this.triggers.has(target)) {
      return;
    }

    const options: AttachOptions = {
      trigger: "pointerdown",
      preventDefault: false,
      stopPropagation: false,
      enabled: true,
      ...attachOptions,
    };

    // Create trigger state
    const state: TriggerState = {
      target,
      options,
      longPressTimer: null,
      isLongPressMet: false,
    };

    // Create event handlers
    const handlers = {
      pointerdown: this.makePointerDownHandler(state),
      contextmenu: this.makeContextMenuHandler(state),
      pointermove: this.makePointerMoveHandler(state),
      pointerup: this.makePointerUpHandler(state),
    };

    this.boundHandlers.set(target, handlers);
    this.triggers.set(target, state);

    // Register event listeners based on trigger type
    if (options.trigger === "pointerdown") {
      target.addEventListener("pointerdown", handlers.pointerdown as any);
      target.addEventListener("pointermove", handlers.pointermove as any);
      target.addEventListener("pointerup", handlers.pointerup as any);
    } else if (options.trigger === "contextmenu") {
      target.addEventListener("contextmenu", handlers.contextmenu as any);
    } else if (options.trigger === "longpress") {
      target.addEventListener("pointerdown", handlers.pointerdown as any);
      target.addEventListener("pointermove", handlers.pointermove as any);
      target.addEventListener("pointerup", handlers.pointerup as any);
    }
  }

  /**
   * Detach menu from a trigger element
   */
  detach(target?: Element | Document): void {
    const targets = target ? [target] : Array.from(this.triggers.keys());

    for (const t of targets) {
      const state = this.triggers.get(t);
      if (!state) continue;

      // Clear long-press timer
      if (state.longPressTimer !== null) {
        clearTimeout(state.longPressTimer);
      }

      // Remove event listeners
      const handlers = this.boundHandlers.get(t);
      if (handlers) {
        if (state.options.trigger === "pointerdown") {
          t.removeEventListener("pointerdown", handlers.pointerdown as any);
          t.removeEventListener("pointermove", handlers.pointermove as any);
          t.removeEventListener("pointerup", handlers.pointerup as any);
        } else if (state.options.trigger === "contextmenu") {
          t.removeEventListener("contextmenu", handlers.contextmenu as any);
        } else if (state.options.trigger === "longpress") {
          t.removeEventListener("pointerdown", handlers.pointerdown as any);
          t.removeEventListener("pointermove", handlers.pointermove as any);
          t.removeEventListener("pointerup", handlers.pointerup as any);
        }
      }

      this.triggers.delete(t);
      this.boundHandlers.delete(t);
    }
  }

  /**
   * Check if trigger is enabled
   */
  private isTriggerEnabled(state: TriggerState): boolean {
    if (typeof state.options.enabled === "function") {
      return state.options.enabled();
    }
    return state.options.enabled !== false;
  }

  /**
   * Create pointerdown handler
   */
  private makePointerDownHandler(state: TriggerState) {
    return (e: PointerEvent) => {
      if (!this.isTriggerEnabled(state)) return;

      // Check button filter
      if (state.options.button !== undefined && (e as any).button !== state.options.button) {
        return;
      }

      if (state.options.trigger === "pointerdown") {
        // Open immediately
        this.openMenu(e, state);
      } else if (state.options.trigger === "longpress") {
        // Start long-press timer
        state.isLongPressMet = false;
        state.longPressTimer = window.setTimeout(() => {
          if (state.isLongPressMet) return; // Already triggered
          state.isLongPressMet = true;
          this.openMenu(e, state);
        }, state.options.longPressMs ?? 250);
      }
    };
  }

  /**
   * Create contextmenu handler
   */
  private makeContextMenuHandler(state: TriggerState) {
    return (e: MouseEvent) => {
      if (!this.isTriggerEnabled(state)) return;

      // Prevent default context menu
      e.preventDefault();
      e.stopPropagation();

      this.openMenu(e, state);
    };
  }

  /**
   * Create pointermove handler (for long-press cancellation)
   */
  private makePointerMoveHandler(state: TriggerState) {
    return () => {
      // Cancel long-press if moved too far
      if (state.longPressTimer !== null && state.options.trigger === "longpress") {
        // Check if moved > threshold (e.g., 10px)
        // We'd need to store the initial position for this check
        // For now, cancel on any move during long-press
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
    };
  }

  /**
   * Create pointerup handler (for long-press cancellation)
   */
  private makePointerUpHandler(state: TriggerState) {
    return () => {
      // Cancel long-press timer if still pending
      if (state.longPressTimer !== null && !state.isLongPressMet) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
    };
  }

  /**
   * Open menu at pointer location
   */
  private openMenu(e: PointerEvent | MouseEvent, state: TriggerState): void {
    if (state.options.preventDefault !== false) {
      e.preventDefault();
    }
    if (state.options.stopPropagation !== false) {
      e.stopPropagation();
    }

    // Set items if override provided
    if (state.options.items) {
      this.menu.setItems(state.options.items);
    }

    // Open menu at pointer position
    this.menu.openAt(e.clientX, e.clientY, state.options.context);

    // Show overlay
    this.overlay.open();
  }

  /**
   * Destroy all triggers
   */
  destroy(): void {
    const targets = Array.from(this.triggers.keys());
    for (const target of targets) {
      this.detach(target);
    }
  }

  /**
   * Get attached targets (for testing)
   */
  getAttachedTargets(): (Element | Document)[] {
    return Array.from(this.triggers.keys());
  }
}
