/**
 * Prediction Cone Menu Library
 *
 * A production-ready TypeScript library implementing a prediction cone radial menu.
 * Attaches to any DOM element, selects items by pointer direction within a configurable
 * angular cone, with deadzone and hysteresis for stability.
 *
 * @module prediction-cone
 */

import { PredictionConeMenu } from "./core/menu";
import { DOMOverlay } from "./dom/overlay";
import { TriggerManager } from "./dom/trigger";
import type {
  AttachOptions,
  ConeItem,
  ConeMenuEventPayload,
  ConeMenuInstance,
  ConeMenuState,
  ConeOptions,
} from "./types";

export const version = "0.1.1";

/**
 * Internal facade that implements the public ConeMenuInstance interface
 */
class PredictionConeMenuFacade implements ConeMenuInstance {
  private coreMenu: PredictionConeMenu;
  private domOverlay: DOMOverlay;
  private triggerManager: TriggerManager;

  constructor(options: ConeOptions) {
    this.coreMenu = new PredictionConeMenu(options);
    this.domOverlay = new DOMOverlay(this.coreMenu, options);
    this.triggerManager = new TriggerManager(this.coreMenu, this.domOverlay);

    // Listen to menu events and update DOM
    this.coreMenu.on("open", () => {
      void this.domOverlay.open();
    });

    this.coreMenu.on("close", () => {
      this.domOverlay.close();
    });
  }

  attach(target: Element | Document, attachOptions?: AttachOptions): void {
    this.triggerManager.attach(target, attachOptions);
  }

  detach(target?: Element | Document): void {
    this.triggerManager.detach(target);
  }

  openAt(x: number, y: number, context?: any): void {
    this.coreMenu.openAt(x, y, context);
    void this.domOverlay.open();
  }

  close(): void {
    this.coreMenu.close();
    this.domOverlay.close();
  }

  setItems(items: ConeItem[]): void {
    this.coreMenu.setItems(items);
    this.domOverlay.setItems(items);
  }

  setOptions(options: Partial<ConeOptions>): void {
    this.coreMenu.setOptions(options);
  }

  destroy(): void {
    this.triggerManager.destroy();
    this.domOverlay.destroy();
  }

  isOpen(): boolean {
    return this.coreMenu.isOpen();
  }

  on(
    eventName: "open" | "close" | "change" | "select",
    handler: (payload: ConeMenuEventPayload) => void
  ): () => void {
    return this.coreMenu.on(eventName, handler);
  }

  getState(): Readonly<ConeMenuState> {
    return this.coreMenu.getState();
  }
}

/**
 * Create a new prediction cone menu instance
 * @param options - Menu configuration options
 * @returns ConeMenuInstance with all public methods
 *
 * @example
 * ```typescript
 * const menu = createPredictionConeMenu({
 *   items: [
 *     { id: "copy", label: "Copy", icon: "📋" },
 *     { id: "cut", label: "Cut", icon: "✂️" },
 *     { id: "paste", label: "Paste", icon: "📄" },
 *   ],
 *   ringRadius: 120,
 *   itemSize: 60,
 * });
 *
 * // Attach to a button
 * menu.attach(document.getElementById("menu-btn"));
 *
 * // Listen for selections
 * menu.on("select", (e) => {
 *   console.log("Selected:", e.item?.label);
 * });
 * ```
 */
export function createPredictionConeMenu(options: ConeOptions): ConeMenuInstance {
  // Validate required options
  if (!options.items || options.items.length === 0) {
    throw new Error("ConeOptions must include at least one item");
  }

  return new PredictionConeMenuFacade(options);
}

// Re-export public types
export type {
  AttachOptions,
  ConeItem,
  ConeMenuEventPayload,
  ConeMenuInstance,
  ConeMenuState,
  ConeOptions,
  Viewport,
} from "./types";
