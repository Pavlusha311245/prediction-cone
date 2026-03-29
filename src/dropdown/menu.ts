/**
 * Dropdown menu with safe-triangle submenu navigation.
 *
 * Items with `children` automatically show a nested submenu panel on hover.
 * A SafeTriangle zone extends from the last cursor position on the parent row
 * to the near edge of the submenu, preventing the submenu from closing while
 * the pointer moves diagonally toward it.
 *
 * Architecture
 * ────────────
 * ┌─ DropdownMenu ──────────────────────────────────────────────────────┐
 * │  owns: SafeTriangle, MouseTracker                                   │
 * │                                                                     │
 * │  ┌─ SafeTriangle ─────────────────────────────────────┐            │
 * │  │  activate(apex, rect)  →  computes A/B/C vertices  │            │
 * │  │  isInSafeZone(x,y)    →  triangle ∪ panel hit-test │            │
 * │  │  startExpiry()        →  delay fallback timer       │            │
 * │  │  cancelExpiry()       →  cancel timer               │            │
 * │  │  [debug canvas]        →  renders live on update    │            │
 * │  └────────────────────────────────────────────────────┘            │
 * │                                                                     │
 * │  ┌─ MouseTracker ─────────────────────────────────────┐            │
 * │  │  ring-buffer history + velocity + pointerType       │            │
 * │  └────────────────────────────────────────────────────┘            │
 * │                                                                     │
 * │  Single pointermove on menuEl (apex tracking)                       │
 * │  Per-row pointerenter / pointerleave (safe-zone gate)               │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Touch devices
 * ─────────────
 * The safe triangle is skipped when `lastPointerType === "touch"`.
 * Touch menus close/switch immediately, matching native mobile UX.
 *
 * @module prediction-cone/dropdown/menu
 */

import type {
  ConeItem,
  DropdownAttachOptions,
  DropdownMenuEventPayload,
  DropdownMenuInstance,
  DropdownMenuOptions,
} from "../types";
import { EventEmitter } from "../utils/emitter";
import { MouseTracker } from "../utils/mouseTracker";
import { SafeTriangle } from "../utils/safeTriangle";
import { sanitizeHtml } from "../utils/sanitize";
import { injectDropdownStyles, removeDropdownStyles } from "./styles";

// ─── DropdownMenu ─────────────────────────────────────────────────────────────

export class DropdownMenu implements DropdownMenuInstance {
  // ── Config ────────────────────────────────────────────────────
  private items: ConeItem[];
  private readonly container: HTMLElement;

  // ── Events ────────────────────────────────────────────────────
  private emitter = new EventEmitter<{
    open: DropdownMenuEventPayload;
    close: DropdownMenuEventPayload;
    select: DropdownMenuEventPayload;
  }>();

  // ── DOM ───────────────────────────────────────────────────────
  private menuEl: HTMLElement | null = null;
  private submenuEl: HTMLElement | null = null;

  // ── Open / active state ───────────────────────────────────────
  private open = false;
  private submenuParentId: string | null = null;

  // ── Safe-triangle & mouse tracking ───────────────────────────
  private readonly safeTriangle: SafeTriangle;
  private readonly mouseTracker: MouseTracker;

  /**
   * Most recent PointerEvent.pointerType seen ("mouse" | "touch" | "pen").
   * When "touch", safe-triangle logic is disabled for natural mobile UX.
   */
  private lastPointerType = "mouse";

  /**
   * Whether the pointer is currently inside the open submenu panel.
   * Checked in the expiry callback to avoid closing an actively-used submenu.
   */
  private isPointerOverSubmenu = false;

  // ── Single pointermove handler on parent menu ─────────────────
  private menuMoveHandler: ((e: Event) => void) | null = null;

  // ── Trigger registry ──────────────────────────────────────────
  private triggers: Map<
    Element | Document,
    { options: DropdownAttachOptions; handler: (e: Event) => void }
  > = new Map();

  // ── Global document listeners ─────────────────────────────────
  private onDocClickBound = this.onDocumentClick.bind(this);
  private onDocKeyBound = this.onDocumentKey.bind(this);

  constructor(options: DropdownMenuOptions) {
    this.items = options.items;
    this.container = options.container ?? document.body;

    this.mouseTracker = new MouseTracker(8);

    this.safeTriangle = new SafeTriangle({
      delay: options.submenuDelay ?? 150,
      debug: options.debug ?? false,
      padding: 2,
      onExpire: () => this.onSafeZoneExpiry(),
    });

    injectDropdownStyles(options.theme);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  attach(target: Element | Document, options?: DropdownAttachOptions): void {
    if (this.triggers.has(target)) return;

    const opts: DropdownAttachOptions = {
      trigger: "click",
      preventDefault: true,
      stopPropagation: false,
      ...options,
    };

    const handler = (e: Event) => {
      const me = e as MouseEvent;
      if (opts.preventDefault) me.preventDefault();
      if (opts.stopPropagation) me.stopPropagation();

      if (this.open) {
        this.close();
        return;
      }

      this.openAt(me.clientX, me.clientY);
    };

    const eventName = opts.trigger === "contextmenu" ? "contextmenu" : "click";
    target.addEventListener(eventName, handler);
    this.triggers.set(target, { options: opts, handler });
  }

  detach(target?: Element | Document): void {
    const targets = target ? [target] : Array.from(this.triggers.keys());
    for (const t of targets) {
      const entry = this.triggers.get(t);
      if (!entry) continue;
      const eventName = entry.options.trigger === "contextmenu" ? "contextmenu" : "click";
      t.removeEventListener(eventName, entry.handler);
      this.triggers.delete(t);
    }
  }

  openAt(x: number, y: number): void {
    if (this.open) this.close();

    this.open = true;
    this.buildMenu(x, y);

    document.addEventListener("pointerdown", this.onDocClickBound, true);
    document.addEventListener("keydown", this.onDocKeyBound);

    this.emitter.emit("open", {});
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.hideSubmenu();

    // Detach single pointermove on menu panel
    if (this.menuEl && this.menuMoveHandler) {
      this.menuEl.removeEventListener("pointermove", this.menuMoveHandler);
      this.menuMoveHandler = null;
    }

    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }

    document.removeEventListener("pointerdown", this.onDocClickBound, true);
    document.removeEventListener("keydown", this.onDocKeyBound);

    this.mouseTracker.stop();
    this.emitter.emit("close", {});
  }

  setItems(items: ConeItem[]): void {
    this.items = items;
    if (this.open) this.close();
  }

  destroy(): void {
    this.close();
    this.detach();
    this.safeTriangle.destroy();
    removeDropdownStyles();
  }

  isOpen(): boolean {
    return this.open;
  }

  on(
    eventName: "open" | "close" | "select",
    handler: (payload: DropdownMenuEventPayload) => void
  ): () => void {
    return this.emitter.on(eventName, handler);
  }

  // ─── DOM construction ─────────────────────────────────────────────────────

  private buildMenu(x: number, y: number): void {
    const panel = document.createElement("div");
    panel.className = "pcd-menu";
    panel.setAttribute("role", "menu");

    for (const item of this.items) {
      panel.appendChild(this.buildRow(item, null));
    }

    this.container.appendChild(panel);
    this.menuEl = panel;

    this.positionPanel(panel, x, y);
    requestAnimationFrame(() => panel.classList.add("pcd-visible"));

    // ── Single pointermove on the parent panel ─────────────────────────────
    // Updates safe-triangle apex only when the pointer is over the active
    // parent row — avoids per-row pointermove listeners.
    this.menuMoveHandler = (e: Event) => {
      const pe = e as PointerEvent;
      this.lastPointerType = pe.pointerType;
      if (this.lastPointerType === "touch") return;

      const row = (pe.target as HTMLElement).closest<HTMLElement>(".pcd-item");
      if (row?.dataset.id === this.submenuParentId) {
        this.safeTriangle.updateApex({ x: pe.clientX, y: pe.clientY });
      }
    };

    panel.addEventListener("pointermove", this.menuMoveHandler, { passive: true });
  }

  private buildRow(item: ConeItem, parentItem: ConeItem | null): HTMLElement {
    // ── Separator ──────────────────────────────────────────────
    if (item.separator) {
      const sep = document.createElement("div");
      sep.className = "pcd-separator";
      sep.setAttribute("role", "separator");
      return sep;
    }

    const row = document.createElement("div");
    row.className = "pcd-item";
    if (item.disabled) row.classList.add("pcd-disabled");
    if (item.danger) row.classList.add("pcd-danger");
    if (item.children?.length) row.classList.add("pcd-has-children");
    row.setAttribute("role", "menuitem");
    row.setAttribute("data-id", item.id);

    // ── Icon ───────────────────────────────────────────────────
    if (item.icon) {
      const iconEl = document.createElement("span");
      iconEl.className = "pcd-item-icon";
      if (typeof item.icon === "string") {
        if (item.icon.includes("<")) {
          sanitizeHtml(item.icon).then(safe => {
            iconEl.innerHTML = safe;
          });
        } else {
          iconEl.textContent = item.icon;
        }
      } else if (item.icon instanceof HTMLElement) {
        iconEl.appendChild(item.icon.cloneNode(true));
      } else if (typeof item.icon === "function") {
        const ic = item.icon();
        if (ic) iconEl.appendChild(ic.cloneNode(true));
      }
      row.appendChild(iconEl);
    }

    // ── Label ──────────────────────────────────────────────────
    const labelEl = document.createElement("span");
    labelEl.className = "pcd-item-label";
    labelEl.textContent = item.label;
    row.appendChild(labelEl);

    // ── Right-side adornment ────────────────────────────────────
    if (item.children?.length) {
      const arrow = document.createElement("span");
      arrow.className = "pcd-item-arrow";
      row.appendChild(arrow);
    } else if (item.shortcut) {
      const sc = document.createElement("span");
      sc.className = "pcd-item-shortcut";
      sc.textContent = item.shortcut;
      row.appendChild(sc);
    }

    // ── Event wiring ───────────────────────────────────────────
    if (item.children?.length) {
      this.wireParentRow(row, item);
    } else {
      this.wireLeafRow(row);
    }

    row.addEventListener("pointerup", e => {
      e.stopPropagation();
      if (item.disabled || item.separator) return;
      if (item.children?.length) return;

      this.emitter.emit("select", { item, parentItem: parentItem ?? undefined });
      this.close();
    });

    return row;
  }

  // ─── Row event wiring ─────────────────────────────────────────────────────

  /**
   * Wire a row that opens a submenu.
   *
   * pointerenter  → open submenu unless safe zone blocks the switch.
   * pointerleave  → start expiry timer if pointer is not heading to submenu.
   *
   * Note: apex updates come from the single menu-level pointermove handler
   * attached in `buildMenu()` — no per-row pointermove listener needed.
   */
  private wireParentRow(row: HTMLElement, item: ConeItem): void {
    row.addEventListener("pointerenter", e => {
      const pe = e as PointerEvent;
      this.lastPointerType = pe.pointerType;

      // Already open for this exact row — nothing to do
      if (this.submenuParentId === item.id) return;

      // Safe-triangle suppression (mouse/pen only):
      // Pointer is heading diagonally toward a different item's submenu.
      if (
        this.lastPointerType !== "touch" &&
        this.safeTriangle.isInSafeZone(pe.clientX, pe.clientY)
      ) {
        return;
      }

      this.showSubmenu(item, row, pe);
    });

    row.addEventListener("pointerleave", e => {
      const pe = e as PointerEvent;
      if (this.lastPointerType === "touch") return;
      // Only react if this row owns the current open submenu
      if (this.submenuParentId !== item.id) return;

      // If the pointer is NOT heading toward the submenu, start expiry countdown.
      // isInSafeZone returning false here means the pointer is moving away.
      if (!this.safeTriangle.isInSafeZone(pe.clientX, pe.clientY)) {
        this.safeTriangle.startExpiry();
      }
    });
  }

  /**
   * Wire a leaf row (no submenu).
   *
   * pointerenter → close the current submenu and clear active state,
   *                unless the safe zone is active (pointer en route to submenu).
   */
  private wireLeafRow(row: HTMLElement): void {
    row.addEventListener("pointerenter", e => {
      const pe = e as PointerEvent;
      this.lastPointerType = pe.pointerType;

      if (
        this.lastPointerType !== "touch" &&
        this.safeTriangle.isInSafeZone(pe.clientX, pe.clientY)
      ) {
        return; // pointer heading to submenu — keep it open
      }

      this.hideSubmenu();
      this.clearActiveRows();
    });
  }

  // ─── Submenu lifecycle ────────────────────────────────────────────────────

  private showSubmenu(item: ConeItem, parentRow: HTMLElement, e: PointerEvent): void {
    this.hideSubmenu();
    if (!item.children?.length) return;

    this.submenuParentId = item.id;
    this.isPointerOverSubmenu = false;
    this.setActiveRow(parentRow);

    // ── Build submenu panel ────────────────────────────────────
    const panel = document.createElement("div");
    panel.className = "pcd-menu pcd-submenu";
    panel.setAttribute("role", "menu");

    for (const child of item.children) {
      panel.appendChild(this.buildRow(child, item));
    }

    this.container.appendChild(panel);
    this.submenuEl = panel;

    // Position and get the final rect (used to build the triangle)
    const submenuRect = this.positionSubmenu(panel, parentRow);

    // Activate SafeTriangle: A = cursor, B/C = near edge of submenu
    this.safeTriangle.activate({ x: e.clientX, y: e.clientY }, submenuRect);

    // Start tracking mouse (for velocity / touch-type detection)
    this.mouseTracker.start();

    // ── Submenu panel pointer events ──────────────────────────

    // Pointer enters submenu panel: cancel expiry, mark as hovered
    panel.addEventListener("pointerenter", ev => {
      this.lastPointerType = (ev as PointerEvent).pointerType;
      this.isPointerOverSubmenu = true;
      this.safeTriangle.cancelExpiry();
    });

    // Pointer leaves submenu panel: re-arm triangle from exit point so the
    // user can move back to the parent menu without triggering row switches.
    panel.addEventListener("pointerleave", ev => {
      this.isPointerOverSubmenu = false;
      const pe = ev as PointerEvent;
      if (this.submenuEl) {
        const freshRect = this.submenuEl.getBoundingClientRect();
        this.safeTriangle.activate({ x: pe.clientX, y: pe.clientY }, freshRect);
      }
    });

    requestAnimationFrame(() => panel.classList.add("pcd-visible"));
  }

  private hideSubmenu(): void {
    if (this.submenuEl) {
      this.submenuEl.remove();
      this.submenuEl = null;
    }
    this.submenuParentId = null;
    this.isPointerOverSubmenu = false;
    this.safeTriangle.deactivate();
    this.mouseTracker.stop();
  }

  // ─── Expiry callback ──────────────────────────────────────────────────────

  /**
   * Called by SafeTriangle when the delay expires and the pointer has not
   * reached the submenu panel.  Closes the submenu if it is not actively hovered.
   */
  private onSafeZoneExpiry(): void {
    if (this.isPointerOverSubmenu) return;
    this.hideSubmenu();
    this.clearActiveRows();
  }

  // ─── Active row helpers ───────────────────────────────────────────────────

  private setActiveRow(row: HTMLElement): void {
    this.clearActiveRows();
    row.classList.add("pcd-active");
  }

  private clearActiveRows(): void {
    if (!this.menuEl) return;
    for (const r of this.menuEl.querySelectorAll<HTMLElement>(".pcd-item.pcd-active")) {
      r.classList.remove("pcd-active");
    }
  }

  // ─── Positioning ──────────────────────────────────────────────────────────

  /**
   * Position the main menu panel near (x, y), clamped to viewport bounds.
   */
  private positionPanel(panel: HTMLElement, x: number, y: number): void {
    panel.style.left = "-9999px";
    panel.style.top = "-9999px";

    const rect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (left + rect.width > vw - 8) left = vw - 8 - rect.width;
    if (left < 8) left = 8;
    if (top + rect.height > vh - 8) top = vh - 8 - rect.height;
    if (top < 8) top = 8;

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  /**
   * Position the submenu panel beside the parent row.
   * Tries right side first; falls back to left on viewport overflow.
   *
   * @returns The final bounding DOMRect (passed to SafeTriangle.activate).
   */
  private positionSubmenu(panel: HTMLElement, parentRow: HTMLElement): DOMRect {
    const rowRect = parentRow.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 4;

    panel.style.visibility = "hidden";
    panel.style.left = "-9999px";
    panel.style.top = "-9999px";

    const panelRect = panel.getBoundingClientRect();

    // Horizontal: prefer right, fall back to left
    let left = rowRect.right + gap;
    if (left + panelRect.width > vw - 8) {
      left = rowRect.left - panelRect.width - gap;
    }

    // Vertical: align to row top, clamp to viewport
    let top = rowRect.top;
    if (top + panelRect.height > vh - 8) top = vh - 8 - panelRect.height;
    if (top < 8) top = 8;

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.visibility = "";

    return panel.getBoundingClientRect();
  }

  // ─── Global event handlers ────────────────────────────────────────────────

  private onDocumentClick(e: Event): void {
    if (!this.open) return;
    const target = e.target as Node;
    if (this.menuEl?.contains(target)) return;
    if (this.submenuEl?.contains(target)) return;

    for (const t of this.triggers.keys()) {
      if (t instanceof Element && t.contains(target)) return;
      if (t === target) return;
    }

    this.close();
  }

  private onDocumentKey(e: Event): void {
    if ((e as KeyboardEvent).key === "Escape") this.close();
  }
}
