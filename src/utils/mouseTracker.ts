/**
 * MouseTracker — global pointer position ring-buffer with velocity estimation.
 *
 * A single document-level `pointermove` listener (RAF-throttled) feeds a fixed-size
 * ring buffer of recent snapshots.  Consumers query current position / velocity on
 * demand rather than registering their own event listeners.
 *
 * Design goals:
 *  - Zero allocations on the hot path (ring-buffer reuses slots)
 *  - Primary-pointer-only (ignores multi-touch secondary contacts)
 *  - RAF throttle prevents > 1 push per animation frame (~60 Hz max)
 *  - Safe to call start() / stop() multiple times
 *
 * @module prediction-cone/utils/mouseTracker
 */

// ─── Public types ─────────────────────────────────────────────────────────────

/** A single captured pointer position. */
export interface PointerSnapshot {
  /** Viewport X coordinate in CSS pixels */
  readonly x: number;
  /** Viewport Y coordinate in CSS pixels */
  readonly y: number;
  /**
   * Capture timestamp from `PointerEvent.timeStamp` (milliseconds, monotonic).
   * Prefer this over `Date.now()` for accurate velocity math.
   */
  readonly time: number;
  /**
   * `PointerEvent.pointerType` value – "mouse" | "touch" | "pen".
   * Use to skip safe-triangle logic on touch devices.
   */
  readonly pointerType: string;
}

/** Instantaneous velocity derived from the two most recent snapshots. */
export interface PointerVelocity {
  /** Horizontal velocity in px/ms (positive → moving right) */
  readonly vx: number;
  /** Vertical velocity in px/ms (positive → moving down) */
  readonly vy: number;
  /** Speed magnitude in px/ms */
  readonly speed: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_HISTORY = 8;
const MAX_HISTORY = 64;

// ─── MouseTracker ─────────────────────────────────────────────────────────────

/**
 * Lightweight ring-buffer pointer tracker.
 *
 * ```typescript
 * const tracker = new MouseTracker();
 * tracker.start();
 *
 * // Query at any time:
 * const { x, y } = tracker.current ?? { x: 0, y: 0 };
 * const { speed } = tracker.velocity; // px/ms
 *
 * // On cleanup:
 * tracker.stop();
 * ```
 */
export class MouseTracker {
  /** Ring buffer of snapshots */
  private readonly buf: Array<PointerSnapshot | null>;
  /** Maximum buffer size */
  private readonly maxLen: number;
  /** Next write index */
  private head = 0;
  /** How many valid entries are in the buffer */
  private count = 0;

  private rafId: number | null = null;
  /** Most recent unprocessed event (discarded if a newer one arrives before rAF) */
  private pending: PointerSnapshot | null = null;

  private readonly handleMove: (e: PointerEvent) => void;

  /**
   * @param historySize  Number of snapshots to retain (default 8, max 64).
   *                     A value of at least 2 is required for velocity computation.
   */
  constructor(historySize = DEFAULT_HISTORY) {
    this.maxLen = Math.max(2, Math.min(historySize, MAX_HISTORY));
    this.buf = new Array<PointerSnapshot | null>(this.maxLen).fill(null);

    // Capture reference so we can removeEventListener exactly
    this.handleMove = (e: PointerEvent) => {
      // Ignore non-primary contacts (multi-touch extra fingers, pen hover, etc.)
      if (!e.isPrimary) return;

      this.pending = {
        x: e.clientX,
        y: e.clientY,
        time: e.timeStamp,
        pointerType: e.pointerType,
      };

      if (this.rafId === null) {
        this.rafId = requestAnimationFrame(this.flush);
      }
    };
  }

  // ─── RAF flush ──────────────────────────────────────────────────────────────

  /** Arrow fn so `this` is always bound even when passed as a callback. */
  private readonly flush = (): void => {
    this.rafId = null;
    if (this.pending !== null) {
      this.push(this.pending);
      this.pending = null;
    }
  };

  private push(snap: PointerSnapshot): void {
    this.buf[this.head] = snap;
    this.head = (this.head + 1) % this.maxLen;
    if (this.count < this.maxLen) this.count++;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Attach to `document.pointermove`.
   * Safe to call multiple times (idempotent via `{ passive: true }` flag).
   * No-op in non-browser environments (e.g. Bun/Node test runner).
   */
  start(): void {
    if (typeof document === "undefined") return;
    document.addEventListener("pointermove", this.handleMove, { passive: true });
  }

  /**
   * Remove the event listener and clear history.
   * After calling `stop()` you may call `start()` again.
   * No-op in non-browser environments.
   */
  stop(): void {
    if (typeof document !== "undefined") {
      document.removeEventListener("pointermove", this.handleMove);
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.buf.fill(null);
    this.head = 0;
    this.count = 0;
    this.pending = null;
  }

  // ─── Accessors ──────────────────────────────────────────────────────────────

  /**
   * Return a snapshot `offset` positions ago (0 = most recent).
   * Returns `null` if not enough history has been collected.
   */
  at(offset: number): PointerSnapshot | null {
    if (offset < 0 || offset >= this.count) return null;
    // Ring buffer indexing: head-1 = most recent write
    const idx = (((this.head - 1 - offset) % this.maxLen) + this.maxLen) % this.maxLen;
    return this.buf[idx];
  }

  /** Most recent captured snapshot, or `null` if nothing tracked yet. */
  get current(): PointerSnapshot | null {
    return this.at(0);
  }

  /** Second most recent snapshot, or `null`. */
  get previous(): PointerSnapshot | null {
    return this.at(1);
  }

  /**
   * Instantaneous velocity from the two most recent samples.
   * Returns zero velocity when fewer than 2 samples exist or `dt <= 0`.
   */
  get velocity(): PointerVelocity {
    const cur = this.at(0);
    const prev = this.at(1);

    if (!cur || !prev) return { vx: 0, vy: 0, speed: 0 };

    const dt = cur.time - prev.time;
    if (dt <= 0) return { vx: 0, vy: 0, speed: 0 };

    const vx = (cur.x - prev.x) / dt;
    const vy = (cur.y - prev.y) / dt;
    return { vx, vy, speed: Math.sqrt(vx * vx + vy * vy) };
  }

  /** Number of valid entries currently in the ring buffer (0 … historySize). */
  get size(): number {
    return this.count;
  }
}
