/**
 * Unit tests for SafeTriangle
 *
 * Tests geometry logic (isInSafeZone, computeVertices) and the expiry timer
 * using bun:test.  DOM APIs (canvas, ResizeObserver) are NOT tested here —
 * those require a browser environment and are covered by manual / e2e tests.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { SafeTriangle } from "./safeTriangle";

// ─── Minimal DOMRect stub ─────────────────────────────────────────────────────

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  } as DOMRect;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a SafeTriangle without debug canvas (avoids DOM side-effects in tests). */
function makeST(delay = 0, onExpire?: () => void): SafeTriangle {
  return new SafeTriangle({ delay, debug: false, padding: 0, onExpire });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SafeTriangle — initial state", () => {
  it("is inactive by default", () => {
    const st = makeST();
    expect(st.isActive).toBe(false);
    expect(st.getVertices()).toBeNull();
  });

  it("isInSafeZone returns false when inactive", () => {
    const st = makeST();
    expect(st.isInSafeZone(100, 100)).toBe(false);
  });
});

describe("SafeTriangle — activate / deactivate", () => {
  let st: SafeTriangle;

  beforeEach(() => {
    st = makeST();
  });

  afterEach(() => {
    st.destroy();
  });

  it("becomes active after activate()", () => {
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 200, y: 150 }, rect);
    expect(st.isActive).toBe(true);
  });

  it("exposes vertices after activate()", () => {
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 200, y: 150 }, rect);

    const v = st.getVertices();
    expect(v).not.toBeNull();
    // Apex matches the provided cursor position
    expect(v!.a).toEqual({ x: 200, y: 150 });
    // B and C are on the left edge of the submenu (apex is to the left)
    expect(v!.b.x).toBe(300); // rect.left
    expect(v!.c.x).toBe(300);
    expect(v!.b.y).toBe(100); // rect.top  (padding=0)
    expect(v!.c.y).toBe(300); // rect.bottom
  });

  it("selects right edge when submenu is to the left of apex", () => {
    // Apex is to the RIGHT of the submenu center
    const rect = makeRect(100, 100, 150, 200); // right edge at 250
    st.activate({ x: 350, y: 150 }, rect); // apex.x > rect.left + width/2

    const v = st.getVertices()!;
    expect(v.b.x).toBe(250); // rect.right
    expect(v.c.x).toBe(250);
  });

  it("deactivate() clears state", () => {
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 200, y: 150 }, rect);
    st.deactivate();

    expect(st.isActive).toBe(false);
    expect(st.getVertices()).toBeNull();
    expect(st.isInSafeZone(310, 150)).toBe(false);
  });
});

describe("SafeTriangle — isInSafeZone (submenu panel hit)", () => {
  it("returns true for a point inside the submenu rect", () => {
    const st = makeST();
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 200, y: 150 }, rect);

    // Point clearly inside the submenu panel
    expect(st.isInSafeZone(350, 200)).toBe(true);
    st.destroy();
  });

  it("returns false for a point outside both triangle and panel", () => {
    const st = makeST();
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 200, y: 150 }, rect);

    // Point above everything
    expect(st.isInSafeZone(200, 10)).toBe(false);
    st.destroy();
  });
});

describe("SafeTriangle — isInSafeZone (triangle hit)", () => {
  /**
   * Layout:
   *   apex A = (100, 150)
   *   submenu rect: left=300, top=100, w=150, h=200  →  right=450, bottom=300
   *   With padding=0:  B=(300,100)  C=(300,300)
   *
   * Triangle: A(100,150) → B(300,100) → C(300,300)
   * Center of triangle ≈ (233, 183)
   */
  it("returns true for a point inside the triangle", () => {
    const st = makeST(0);
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);

    // Centroid of the triangle
    const cx = (100 + 300 + 300) / 3;
    const cy = (150 + 100 + 300) / 3;
    expect(st.isInSafeZone(Math.round(cx), Math.round(cy))).toBe(true);
    st.destroy();
  });

  it("returns false for a point above the triangle but before the submenu", () => {
    const st = makeST(0);
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);

    // Well above the triangle (y=-50)
    expect(st.isInSafeZone(200, -50)).toBe(false);
    st.destroy();
  });
});

describe("SafeTriangle — updateApex()", () => {
  it("updates the apex while keeping B and C on the submenu edge", () => {
    const st = makeST();
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);

    st.updateApex({ x: 120, y: 180 });
    const v = st.getVertices()!;

    expect(v.a).toEqual({ x: 120, y: 180 });
    expect(v.b.x).toBe(300);
    expect(v.c.x).toBe(300);
    st.destroy();
  });

  it("is a no-op when not active", () => {
    const st = makeST();
    // No activate() called — should not throw
    expect(() => st.updateApex({ x: 100, y: 100 })).not.toThrow();
    expect(st.getVertices()).toBeNull();
    st.destroy();
  });
});

describe("SafeTriangle — updateRect()", () => {
  it("updates B and C while preserving apex", () => {
    const st = makeST();
    const rect1 = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect1);

    const rect2 = makeRect(400, 50, 120, 300);
    st.updateRect(rect2);

    const v = st.getVertices()!;
    expect(v.a).toEqual({ x: 100, y: 150 }); // apex preserved
    expect(v.b.x).toBe(400); // new rect.left
    expect(v.b.y).toBe(50);
    expect(v.c.y).toBe(350); // rect2.bottom
    st.destroy();
  });
});

describe("SafeTriangle — padding", () => {
  it("extends B above and C below the submenu rect by padding amount", () => {
    const st = new SafeTriangle({ delay: 0, debug: false, padding: 5 });
    const rect = makeRect(300, 100, 150, 200); // top=100, bottom=300

    st.activate({ x: 100, y: 150 }, rect);
    const v = st.getVertices()!;

    expect(v.b.y).toBe(100 - 5); // rect.top - padding
    expect(v.c.y).toBe(300 + 5); // rect.bottom + padding
    st.destroy();
  });
});

describe("SafeTriangle — expiry timer", () => {
  it("calls onExpire after delay and deactivates", async () => {
    let expired = false;
    const st = new SafeTriangle({
      delay: 20, // short delay for tests
      debug: false,
      padding: 0,
      onExpire: () => {
        expired = true;
      },
    });

    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);
    st.startExpiry();

    // Not yet expired
    expect(expired).toBe(false);
    expect(st.isActive).toBe(true);

    // Wait for expiry
    await new Promise(r => setTimeout(r, 40));

    expect(expired).toBe(true);
    expect(st.isActive).toBe(false);
    st.destroy();
  });

  it("cancelExpiry() prevents onExpire from firing", async () => {
    let expired = false;
    const st = new SafeTriangle({
      delay: 20,
      debug: false,
      padding: 0,
      onExpire: () => {
        expired = true;
      },
    });

    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);
    st.startExpiry();
    st.cancelExpiry();

    await new Promise(r => setTimeout(r, 40));

    expect(expired).toBe(false);
    expect(st.isActive).toBe(true); // zone is still active
    st.destroy();
  });

  it("isInSafeZone() cancels pending expiry on positive hit", async () => {
    let expired = false;
    const st = new SafeTriangle({
      delay: 20,
      debug: false,
      padding: 0,
      onExpire: () => {
        expired = true;
      },
    });

    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);
    st.startExpiry();

    // Hit the submenu rect — should cancel expiry
    const hit = st.isInSafeZone(350, 200);
    expect(hit).toBe(true);

    await new Promise(r => setTimeout(r, 40));

    // Timer was cancelled — onExpire was NOT called
    expect(expired).toBe(false);
    st.destroy();
  });

  it("startExpiry() is idempotent (multiple calls don't restart timer)", async () => {
    const calls: number[] = [];
    const st = new SafeTriangle({
      delay: 20,
      debug: false,
      padding: 0,
      onExpire: () => calls.push(Date.now()),
    });

    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);
    st.startExpiry();
    st.startExpiry(); // second call is no-op
    st.startExpiry(); // third call is no-op

    await new Promise(r => setTimeout(r, 40));

    expect(calls.length).toBe(1);
    st.destroy();
  });
});

describe("SafeTriangle — destroy()", () => {
  it("is idempotent and does not throw", () => {
    const st = makeST();
    expect(() => {
      st.destroy();
      st.destroy();
    }).not.toThrow();
  });

  it("deactivates on destroy", () => {
    const st = makeST();
    const rect = makeRect(300, 100, 150, 200);
    st.activate({ x: 100, y: 150 }, rect);
    st.destroy();
    expect(st.isActive).toBe(false);
  });
});
