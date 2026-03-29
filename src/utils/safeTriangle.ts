/**
 * SafeTriangle — diagonal cursor movement prediction for nested dropdown menus.
 *
 * Problem it solves
 * ─────────────────
 * In a vertical menu with submenus that open to the right, users naturally move
 * the cursor diagonally from the parent row toward the submenu panel.  During
 * this diagonal movement the cursor can briefly cross other rows, triggering
 * their `pointerenter` events and accidentally closing the open submenu.
 *
 * Solution
 * ────────
 * When a submenu opens we record the cursor position (apex A) and compute a
 * triangle whose other two vertices (B, C) are the top-left and bottom-left
 * corners of the submenu panel:
 *
 *    cursor ──► A
 *                ╲
 *          B ◄────╲──── submenu top-left
 *          │        ╲
 *          │  safe   ╲
 *          │  zone    ╲
 *          C ◄──────── submenu bottom-left
 *
 * While `isInSafeZone(px, py)` returns `true`, row-level `pointerenter` events
 * are suppressed so the submenu stays open.  The zone covers both the triangle
 * and the submenu panel itself.
 *
 * Delay fallback
 * ──────────────
 * When the pointer leaves the parent row heading *away* from the submenu, call
 * `startExpiry()`.  After `delay` ms the zone expires and `onExpire` fires,
 * signalling that the submenu should close.  Any positive `isInSafeZone()` hit
 * cancels the pending expiry automatically.
 *
 * Debug canvas
 * ────────────
 * Pass `debug: true` to render a fullscreen fixed canvas (z-index MAX_INT - 1)
 * that draws the safe triangle, submenu rect, and apex dot in real time.
 * Intended for development only — do NOT ship with `debug: true`.
 *
 * @module prediction-cone/utils/safeTriangle
 */

import { isPointInTriangle } from "./geometry";

// ─── Public types ─────────────────────────────────────────────────────────────

/** A 2-D point in viewport (CSS pixel) coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The three vertices of the safe triangle. */
export interface TriangleVertices {
  /** Apex: last cursor position captured on the parent row */
  readonly a: Point;
  /** Near-edge top corner of the submenu panel */
  readonly b: Point;
  /** Near-edge bottom corner of the submenu panel */
  readonly c: Point;
}

export interface SafeTriangleOptions {
  /**
   * Delay in milliseconds before the safe zone expires after `startExpiry()` is
   * called.  Acts as a grace period for fast mouse movements that briefly exit
   * the triangle.  Set to 0 to disable.
   * Default: 150
   */
  delay?: number;

  /**
   * Extra padding in pixels added to the B and C vertices (top/bottom submenu
   * corners).  Compensates for sub-pixel rounding, 1-px borders, and scroll
   * jitter.  The apex A is never padded.
   * Default: 2
   */
  padding?: number;

  /**
   * Enable the debug canvas overlay.  When `true`, a fullscreen fixed `<canvas>`
   * is injected into `document.body` and updated on every geometry change.
   * DEVELOPMENT ONLY — remove before shipping.
   * Default: false
   */
  debug?: boolean;

  /**
   * Called when the expiry countdown finishes (i.e. the delay passed without
   * the pointer reaching the safe zone).  Typical usage: close the submenu.
   * Not called when `deactivate()` is invoked directly.
   */
  onExpire?: () => void;
}

// ─── SafeTriangle ─────────────────────────────────────────────────────────────

export class SafeTriangle {
  // ── Geometry state ────────────────────────────────────────────
  private vertices: TriangleVertices | null = null;
  private submenuRect: DOMRect | null = null;
  private active = false;

  // ── Configuration ─────────────────────────────────────────────
  private readonly delayMs: number;
  private readonly padding: number;
  private readonly debugEnabled: boolean;
  private readonly onExpireCb: (() => void) | undefined;

  // ── Expiry timer ──────────────────────────────────────────────
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Debug canvas resources ────────────────────────────────────
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** Stored reference so removeEventListener works correctly */
  private readonly boundResizeCanvas: () => void;

  constructor(options: SafeTriangleOptions = {}) {
    this.delayMs = options.delay ?? 150;
    this.padding = options.padding ?? 2;
    this.debugEnabled = options.debug ?? false;
    this.onExpireCb = options.onExpire;
    this.boundResizeCanvas = this.resizeCanvas.bind(this);

    if (this.debugEnabled) this.initCanvas();
  }

  // ─── Core public API ──────────────────────────────────────────────────────

  /**
   * Activate the safe zone.  Computes triangle vertices from `apex` to the
   * near vertical edge of `rect` (left edge when submenu is to the right, right
   * edge when submenu is to the left).
   *
   * @param apex  Last cursor position while over the parent row.
   * @param rect  Current bounding DOMRect of the open submenu panel.
   */
  activate(apex: Point, rect: DOMRect): void {
    this.clearExpiry();
    this.active = true;
    this.submenuRect = rect;
    this.computeVertices(apex, rect);
    if (this.debugEnabled) this.draw();
  }

  /**
   * Update the apex while the pointer is still over the parent row.
   * Call this from a `pointermove` (ideally RAF-throttled) handler.
   * No-op if the safe zone is not active.
   */
  updateApex(apex: Point): void {
    if (!this.active || !this.submenuRect) return;
    this.computeVertices(apex, this.submenuRect);
    if (this.debugEnabled) this.draw();
  }

  /**
   * Refresh the cached submenu rect (call after scroll or resize).
   * Re-derives B and C from the new rect while preserving the current apex A.
   * No-op if the safe zone is not active.
   */
  updateRect(rect: DOMRect): void {
    if (!this.active || !this.vertices) return;
    this.submenuRect = rect;
    this.computeVertices(this.vertices.a, rect);
    if (this.debugEnabled) this.draw();
  }

  /**
   * Test whether viewport point `(px, py)` is inside the safe zone.
   *
   * Safe zone = submenu panel bounding rect ∪ safe triangle.
   *
   * Automatically cancels any pending expiry timer when the point is inside,
   * so calling this from `pointerenter` handlers is sufficient to keep the
   * zone alive as long as the pointer is en route to the submenu.
   *
   * @returns `true` if the pointer should be considered "safe" (submenu stays open).
   */
  isInSafeZone(px: number, py: number): boolean {
    if (!this.active) return false;

    // 1. Direct hit on the submenu panel itself
    if (this.submenuRect) {
      const r = this.submenuRect;
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
        this.clearExpiry();
        return true;
      }
    }

    // 2. Inside the safe triangle
    if (this.vertices) {
      const { a, b, c } = this.vertices;
      if (isPointInTriangle(px, py, a.x, a.y, b.x, b.y, c.x, c.y)) {
        this.clearExpiry();
        return true;
      }
    }

    return false;
  }

  /**
   * Start the expiry countdown.  After `delay` ms, `deactivate()` is called
   * internally and then `onExpire` fires.
   *
   * - Calling while a timer is already running: no-op (timer is NOT reset).
   * - Calling when the safe zone is inactive: no-op.
   * - Use `cancelExpiry()` to abort before the timeout fires.
   */
  startExpiry(): void {
    if (this.expiryTimer !== null || !this.active) return;

    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      this.deactivate();
      this.onExpireCb?.();
    }, this.delayMs);
  }

  /**
   * Cancel a running expiry timer without deactivating the safe zone.
   * Useful when the pointer enters the submenu panel directly (bypassing a row).
   */
  cancelExpiry(): void {
    this.clearExpiry();
  }

  /**
   * Immediately deactivate the safe zone.
   * Does NOT call `onExpire`.  Clears all geometry state and redraws debug canvas.
   */
  deactivate(): void {
    this.clearExpiry();
    this.active = false;
    this.vertices = null;
    this.submenuRect = null;
    if (this.debugEnabled) this.clearCanvas();
  }

  /**
   * Destroy the instance.  Removes the debug canvas and all DOM listeners.
   * The instance MUST NOT be used after calling `destroy()`.
   */
  destroy(): void {
    this.deactivate();
    this.destroyCanvas();
  }

  // ─── Readonly accessors ───────────────────────────────────────────────────

  /** `true` when the safe zone is active (has been activated and not yet expired). */
  get isActive(): boolean {
    return this.active;
  }

  /**
   * Current triangle vertices, or `null` when inactive.
   * Exposed for testing and external debug tooling.
   */
  getVertices(): Readonly<TriangleVertices> | null {
    return this.active ? this.vertices : null;
  }

  // ─── Geometry ────────────────────────────────────────────────────────────

  /**
   * Compute (or recompute) B and C from the apex and the submenu rect.
   *
   * The "near edge" is:
   *  - rect.left  when the submenu is to the right of the cursor (common case)
   *  - rect.right when the submenu opened to the left (overflow fallback)
   *
   * `padding` is subtracted from B.y (top) and added to C.y (bottom) to
   * give a small tolerance above and below the submenu edges.
   */
  private computeVertices(apex: Point, rect: DOMRect): void {
    const { padding } = this;
    // Determine which side the submenu faces the cursor from
    const submenuIsRight = apex.x < rect.left + rect.width / 2;
    const nearX = submenuIsRight ? rect.left : rect.right;

    this.vertices = {
      a: apex,
      b: { x: nearX, y: rect.top - padding },
      c: { x: nearX, y: rect.bottom + padding },
    };
  }

  // ─── Timer helpers ───────────────────────────────────────────────────────

  private clearExpiry(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  // ─── Debug canvas ────────────────────────────────────────────────────────

  private initCanvas(): void {
    const canvas = document.createElement("canvas");

    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "2147483646",
    } satisfies Partial<CSSStyleDeclaration>);

    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.pcSafeTriangleDebug = "true";

    document.body.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.resizeCanvas();

    // Observe both documentElement size changes and window resize
    this.resizeObserver = new ResizeObserver(this.boundResizeCanvas);
    this.resizeObserver.observe(document.documentElement);
    window.addEventListener("resize", this.boundResizeCanvas, { passive: true });
  }

  /**
   * Sync canvas pixel dimensions to the viewport.
   *
   * Setting `canvas.width` / `canvas.height` resets the 2D context state
   * (including the transform matrix), so `ctx.scale(dpr, dpr)` is safe to
   * call here without accumulation.
   */
  private resizeCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.scale(dpr, dpr);

    // Redraw after resize so the triangle stays visible
    if (this.active) this.draw();
  }

  private draw(): void {
    if (!this.ctx || !this.canvas || !this.vertices) return;

    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    // Clear in logical (CSS) pixels — canvas is scaled by dpr
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    const { a, b, c } = this.vertices;

    // ── Safe triangle fill ─────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(99,179,237,0.20)";
    ctx.fill();

    // ── Safe triangle stroke ───────────────────────────────────
    ctx.strokeStyle = "rgba(49,130,206,0.70)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();

    // ── Submenu bounding rect (dashed green) ──────────────────
    if (this.submenuRect) {
      const r = this.submenuRect;
      ctx.save();
      ctx.strokeStyle = "rgba(72,187,120,0.85)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(r.left, r.top, r.width, r.height);
      ctx.restore();
    }

    // ── Apex dot ──────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(a.x, a.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(237,100,100,0.90)";
    ctx.fill();

    // ── Vertex labels ─────────────────────────────────────────
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "rgba(49,130,206,0.95)";
    ctx.fillText("A", a.x + 6, a.y - 5);
    ctx.fillText("B", b.x + 4, b.y - 5);
    ctx.fillText("C", c.x + 4, c.y + 12);

    // ── Hint label ────────────────────────────────────────────
    const midX = (a.x + b.x + c.x) / 3;
    const midY = (a.y + b.y + c.y) / 3;
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(49,130,206,0.55)";
    ctx.fillText("safe zone", midX - 22, midY + 4);
  }

  private clearCanvas(): void {
    if (!this.ctx || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  private destroyCanvas(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    // Guard against non-browser environments (e.g. Bun/Node test runner)
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.boundResizeCanvas);
    }
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
}
