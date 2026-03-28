/**
 * RequestAnimationFrame-based throttling utility
 * Ensures callbacks fire at most once per animation frame
 *
 * @module prediction-cone/utils/rafThrottle
 */

/**
 * Wraps a callback function to throttle it using requestAnimationFrame
 * The callback will fire at most once per animation frame (typically 60fps)
 *
 * Useful for high-frequency events (like mousemove, pointermove) where
 * you want to update the UI smoothly without overwhelming the event handler
 *
 * @param callback - Function to throttle
 * @returns An object with:
 *   - call(args): trigger the throttled callback with arguments
 *   - cancel(): cancel pending callback
 *
 * @example
 * const throttled = createRafThrottle((e) => {
 *   console.log("Throttled event:", e);
 * });
 *
 * document.addEventListener("mousemove", (e) => {
 *   throttled.call(e); // Will fire at most once per frame
 * });
 */
export interface RafThrottle<T extends readonly unknown[]> {
  /**
   * Call the throttled function
   * Schedules execution on next animation frame if not already scheduled
   */
  call(...args: T): void;

  /**
   * Cancel any pending execution
   * If the callback is scheduled but hasn't run yet, this cancels it
   */
  cancel(): void;

  /**
   * Flush any pending callback immediately (for testing)
   * If a callback is scheduled, run it now
   */
  flush(): void;
}

/**
 * Create a throttled callback using requestAnimationFrame
 * @param callback - Function to call, receives all args passed to throttle.call()
 * @returns RafThrottle controller
 */
export function createRafThrottle<T extends readonly unknown[] = readonly []>(
  callback: (...args: T) => void
): RafThrottle<T> {
  let rafId: number | null = null;
  let pendingArgs: T | null = null;
  let hasPending = false;

  const flush = () => {
    if (hasPending && pendingArgs) {
      callback(...pendingArgs);
      pendingArgs = null;
      hasPending = false;
    }
    rafId = null;
  };

  return {
    call(...args: T): void {
      pendingArgs = args;
      hasPending = true;

      if (rafId === null) {
        rafId = requestAnimationFrame(flush);
      }
    },

    cancel(): void {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      hasPending = false;
      pendingArgs = null;
    },

    flush(): void {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      flush();
    },
  };
}

/**
 * Simpler wrapper for a zero-argument function
 * Useful for functions like updateUI() that take no parameters
 *
 * @param callback - Function to throttle (no arguments)
 * @returns Object with call() and cancel() methods
 */
export function createSimpleRafThrottle(callback: () => void): RafThrottle<readonly []> {
  return createRafThrottle(callback);
}
