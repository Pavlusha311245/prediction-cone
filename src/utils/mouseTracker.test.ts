/**
 * Unit tests for MouseTracker
 *
 * Tests ring-buffer logic, history access, and velocity computation.
 * The RAF-throttled DOM listener is not exercised here (browser only).
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { MouseTracker } from "./mouseTracker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Directly push a snapshot via the private flush path (bypasses RAF). */
function pushSnap(
  t: MouseTracker,
  x: number,
  y: number,
  time: number,
  pointerType = "mouse"
): void {
  (t as any).pending = { x, y, time, pointerType };
  (t as any).flush();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MouseTracker — initial state", () => {
  it("has no current snapshot", () => {
    const t = new MouseTracker();
    expect(t.current).toBeNull();
    expect(t.previous).toBeNull();
    expect(t.size).toBe(0);
  });

  it("velocity returns zero when empty", () => {
    const t = new MouseTracker();
    const v = t.velocity;
    expect(v.vx).toBe(0);
    expect(v.vy).toBe(0);
    expect(v.speed).toBe(0);
  });
});

describe("MouseTracker — ring buffer", () => {
  let tracker: MouseTracker;

  beforeEach(() => {
    tracker = new MouseTracker(4);
  });

  afterEach(() => {
    tracker.stop();
  });

  it("stores the most recent snapshot in current", () => {
    pushSnap(tracker, 10, 20, 100);
    expect(tracker.current).toEqual({ x: 10, y: 20, time: 100, pointerType: "mouse" });
  });

  it("exposes previous after two pushes", () => {
    pushSnap(tracker, 10, 20, 100);
    pushSnap(tracker, 30, 40, 200);
    expect(tracker.current).toEqual({ x: 30, y: 40, time: 200, pointerType: "mouse" });
    expect(tracker.previous).toEqual({ x: 10, y: 20, time: 100, pointerType: "mouse" });
  });

  it("at(0) equals current", () => {
    pushSnap(tracker, 5, 5, 50);
    expect(tracker.at(0)).toEqual(tracker.current);
  });

  it("at(offset) wraps correctly when buffer is full", () => {
    for (let i = 1; i <= 5; i++) pushSnap(tracker, i * 10, i * 10, i * 100);
    // Most recent = item 5
    expect(tracker.at(0)?.x).toBe(50);
    // One before  = item 4
    expect(tracker.at(1)?.x).toBe(40);
    // Oldest kept = item 2 (item 1 was overwritten in a size-4 buffer)
    expect(tracker.at(3)?.x).toBe(20);
    // Out of range
    expect(tracker.at(4)).toBeNull();
  });

  it("size increments up to maxHistory then saturates", () => {
    expect(tracker.size).toBe(0);
    pushSnap(tracker, 1, 1, 1);
    expect(tracker.size).toBe(1);
    for (let i = 2; i <= 6; i++) pushSnap(tracker, i, i, i);
    expect(tracker.size).toBe(4);
  });
});

describe("MouseTracker — velocity", () => {
  it("computes velocity from last two samples", () => {
    const t = new MouseTracker();
    pushSnap(t, 0, 0, 0);
    pushSnap(t, 100, 0, 50); // 100px in 50ms → vx = 2 px/ms
    const v = t.velocity;
    expect(v.vx).toBeCloseTo(2, 5);
    expect(v.vy).toBeCloseTo(0, 5);
    expect(v.speed).toBeCloseTo(2, 5);
    t.stop();
  });

  it("returns zero velocity when dt === 0", () => {
    const t = new MouseTracker();
    pushSnap(t, 0, 0, 100);
    pushSnap(t, 50, 50, 100); // same timestamp
    expect(t.velocity.speed).toBe(0);
    t.stop();
  });

  it("returns zero velocity with only one sample", () => {
    const t = new MouseTracker();
    pushSnap(t, 100, 100, 500);
    expect(t.velocity.speed).toBe(0);
    t.stop();
  });
});

describe("MouseTracker — stop() clears state", () => {
  it("clears ring buffer on stop()", () => {
    const t = new MouseTracker(4);
    pushSnap(t, 1, 2, 10);
    pushSnap(t, 3, 4, 20);
    t.stop();
    expect(t.current).toBeNull();
    expect(t.size).toBe(0);
  });
});

describe("MouseTracker — constructor bounds", () => {
  it("enforces minimum history size of 2", () => {
    const t = new MouseTracker(1); // clamped to 2
    pushSnap(t, 1, 1, 10);
    pushSnap(t, 2, 2, 20);
    expect(t.size).toBe(2);
    t.stop();
  });

  it("enforces maximum history size of 64", () => {
    const t = new MouseTracker(999); // clamped to 64
    for (let i = 0; i < 70; i++) pushSnap(t, i, i, i);
    expect(t.size).toBe(64);
    t.stop();
  });
});
