/**
 * Lightweight event emitter for internal library use
 * No external dependencies, minimal overhead
 *
 * @module prediction-cone/utils/emitter
 */

/**
 * Simple event listener type
 */
type EventListener<T = any> = (payload: T) => void;

/**
 * Lightweight event emitter class
 * Supports registering listeners and emitting events
 */
export class EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Register a listener for an event
   * @param eventName - Name of the event
   * @param listener - Callback function
   * @returns Unsubscribe function to remove the listener
   */
  on<K extends string & keyof TEvents>(
    eventName: K,
    listener: EventListener<TEvents[K]>
  ): () => void {
    if (!this.listeners.has(eventName as string)) {
      this.listeners.set(eventName as string, new Set());
    }

    const listeners = this.listeners.get(eventName as string)!;
    listeners.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener as EventListener);
      if (listeners.size === 0) {
        this.listeners.delete(eventName as string);
      }
    };
  }

  /**
   * Register a one-time listener (auto-removes after first call)
   * @param eventName - Name of the event
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  once<K extends string & keyof TEvents>(
    eventName: K,
    listener: EventListener<TEvents[K]>
  ): () => void {
    const wrappedListener: EventListener<TEvents[K]> = payload => {
      listener(payload);
      unsubscribe();
    };

    const unsubscribe = this.on(eventName, wrappedListener);
    return unsubscribe;
  }

  /**
   * Emit an event to all registered listeners
   * @param eventName - Name of the event
   * @param payload - Data to pass to listeners
   */
  emit<K extends string & keyof TEvents>(eventName: K, payload: TEvents[K]): void {
    const listeners = this.listeners.get(eventName as string);
    if (!listeners) {
      return;
    }

    // Create a copy of listeners set in case listeners unsubscribe during iteration
    const listenersCopy = Array.from(listeners);
    for (const listener of listenersCopy) {
      listener(payload);
    }
  }

  /**
   * Remove all listeners for an event (or all events if eventName is not specified)
   * @param eventName - Optional: specific event to clear; if omitted, clears all
   */
  off(eventName?: string & keyof TEvents): void {
    if (eventName === undefined) {
      this.listeners.clear();
    } else {
      this.listeners.delete(eventName as string);
    }
  }

  /**
   * Get the number of listeners for an event
   * @param eventName - Name of the event
   * @returns Number of registered listeners
   */
  listenerCount(eventName: string & keyof TEvents): number {
    return this.listeners.get(eventName as string)?.size ?? 0;
  }

  /**
   * Check if there are any listeners for an event
   * @param eventName - Name of the event
   * @returns true if there are listeners
   */
  hasListeners(eventName: string & keyof TEvents): boolean {
    return this.listenerCount(eventName) > 0;
  }
}

/**
 * Create a new event emitter instance
 * @returns EventEmitter instance
 */
export function createEmitter<
  TEvents extends Record<string, any> = Record<string, any>,
>(): EventEmitter<TEvents> {
  return new EventEmitter<TEvents>();
}
