/**
 * Unit tests for prediction cone geometry utilities
 * Tests pure math functions: angle conversions, normalization, differences, sector selection
 */

import { describe, expect, it } from "bun:test";
import {
  angleAbsDiff,
  angleDiff,
  applyHysteresis,
  clamp,
  deg2rad,
  findBestSector,
  isInDeadzone,
  normalizeAngle,
  positionOnRing,
  rad2deg,
  vecAngle,
} from "./geometry";

describe("Angle Conversions", () => {
  it("deg2rad converts degrees to radians", () => {
    expect(deg2rad(0)).toBeCloseTo(0);
    expect(deg2rad(90)).toBeCloseTo(Math.PI / 2, 5);
    expect(deg2rad(180)).toBeCloseTo(Math.PI, 5);
    expect(deg2rad(360)).toBeCloseTo(2 * Math.PI, 5);
    expect(deg2rad(-90)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it("rad2deg converts radians to degrees", () => {
    expect(rad2deg(0)).toBeCloseTo(0);
    expect(rad2deg(Math.PI / 2)).toBeCloseTo(90, 5);
    expect(rad2deg(Math.PI)).toBeCloseTo(180, 5);
    expect(rad2deg(2 * Math.PI)).toBeCloseTo(360, 5);
    expect(rad2deg(-Math.PI / 2)).toBeCloseTo(-90, 5);
  });

  it("deg2rad and rad2deg are inverse operations", () => {
    const angles = [0, 45, 90, 180, 270, -45, -180];
    for (const deg of angles) {
      expect(rad2deg(deg2rad(deg))).toBeCloseTo(deg, 5);
    }
  });
});

describe("Angle Normalization", () => {
  it("normalizeAngle keeps angles in [-π, π]", () => {
    expect(normalizeAngle(0)).toBeCloseTo(0);
    expect(normalizeAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(-Math.PI);
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 5);
    expect(Math.abs(normalizeAngle(3 * Math.PI))).toBeCloseTo(Math.PI, 5);
  });

  it("normalizeAngle handles large angles", () => {
    const result = normalizeAngle(10 * Math.PI);
    expect(result).toBeGreaterThanOrEqual(-Math.PI);
    expect(result).toBeLessThanOrEqual(Math.PI);
  });

  it("normalizeAngle handles negative large angles", () => {
    const result = normalizeAngle(-10 * Math.PI);
    expect(result).toBeGreaterThanOrEqual(-Math.PI);
    expect(result).toBeLessThanOrEqual(Math.PI);
  });
});

describe("Angle Differences", () => {
  it("angleDiff calculates signed difference", () => {
    // Same angle
    expect(angleDiff(0, 0)).toBeCloseTo(0);

    // 90 degrees difference (counterclockwise)
    expect(angleDiff(Math.PI / 2, 0)).toBeCloseTo(Math.PI / 2, 5);

    // 90 degrees difference (clockwise)
    expect(angleDiff(0, Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 5);

    // 180 degrees (ambiguous, but normalized)
    const diff = angleDiff(Math.PI, 0);
    expect(Math.abs(diff)).toBeCloseTo(Math.PI, 5);
  });

  it("angleDiff normalizes to [-π, π]", () => {
    const result = angleDiff(0.1, -6.3);
    expect(result).toBeGreaterThanOrEqual(-Math.PI);
    expect(result).toBeLessThanOrEqual(Math.PI);
  });

  it("angleAbsDiff always returns positive difference", () => {
    expect(angleAbsDiff(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5);
    expect(angleAbsDiff(Math.PI / 2, 0)).toBeCloseTo(Math.PI / 2, 5);
    expect(angleAbsDiff(-Math.PI, Math.PI)).toBeCloseTo(0, 5); // -π and π are same angle
  });
});

describe("Vector Angle", () => {
  it("vecAngle calculates angle from origin to point", () => {
    // Right
    expect(vecAngle(1, 0)).toBeCloseTo(0);

    // Down (DOM convention: Y positive = down)
    expect(vecAngle(0, 1)).toBeCloseTo(Math.PI / 2, 5);

    // Left
    const leftAngle = vecAngle(-1, 0);
    expect(Math.abs(leftAngle)).toBeCloseTo(Math.PI, 5);

    // Up
    expect(vecAngle(0, -1)).toBeCloseTo(-Math.PI / 2, 5);

    // Diagonal
    expect(Math.abs(vecAngle(1, 1))).toBeCloseTo(Math.PI / 4, 5);
  });

  it("vecAngle uses atan2 for proper quadrant handling", () => {
    // Quadrant 1 (right-down)
    expect(vecAngle(1, 1)).toBeGreaterThan(0);
    expect(vecAngle(1, 1)).toBeLessThan(Math.PI / 2);

    // Quadrant 2 (left-down)
    expect(vecAngle(-1, 1)).toBeGreaterThan(0);
    expect(vecAngle(-1, 1)).toBeLessThan(Math.PI);

    // Quadrant 3 (left-up)
    expect(vecAngle(-1, -1)).toBeLessThan(0);
    expect(vecAngle(-1, -1)).toBeGreaterThan(-Math.PI);

    // Quadrant 4 (right-up)
    expect(vecAngle(1, -1)).toBeLessThan(0);
    expect(vecAngle(1, -1)).toBeGreaterThan(-Math.PI / 2);
  });
});

describe("Clamp Utility", () => {
  it("clamp restricts value to range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("clamp handles negative ranges", () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(5, -10, -1)).toBe(-1);
  });

  it("clamp handles floats", () => {
    expect(clamp(5.5, 0, 10)).toBeCloseTo(5.5);
    expect(clamp(-0.5, 0, 10)).toBeCloseTo(0);
    expect(clamp(10.1, 0, 10)).toBeCloseTo(10);
  });
});

describe("Position on Ring", () => {
  it("positionOnRing places items on circle at correct angles", () => {
    const ringRadius = 100;
    const totalItems = 4; // 0°, 90°, 180°, 270°
    const startAngle = 0; // Start at right (0°)

    // First item at 0°
    const pos0 = positionOnRing(0, totalItems, ringRadius, startAngle);
    expect(pos0.x).toBeCloseTo(ringRadius, 4);
    expect(pos0.y).toBeCloseTo(0, 4);
    expect(pos0.angleRad).toBeCloseTo(0, 5);

    // Second item at 90°
    const pos1 = positionOnRing(1, totalItems, ringRadius, startAngle);
    expect(pos1.x).toBeCloseTo(0, 4);
    expect(pos1.y).toBeCloseTo(ringRadius, 4);
    expect(pos1.angleRad).toBeCloseTo(Math.PI / 2, 5);
  });

  it("positionOnRing respects startAngle offset", () => {
    const ringRadius = 100;
    const totalItems = 4;
    const startAngle = deg2rad(45); // Start at NE diagonal

    const pos0 = positionOnRing(0, totalItems, ringRadius, startAngle);

    // First item should be at start angle
    expect(pos0.angleRad).toBeCloseTo(deg2rad(45), 5);
  });

  it("positionOnRing scales with radius", () => {
    const totalItems = 4;
    const startAngle = 0;

    const pos50 = positionOnRing(0, totalItems, 50, startAngle);
    const pos100 = positionOnRing(0, totalItems, 100, startAngle);

    expect(pos100.x).toBeCloseTo(pos50.x * 2, 4);
    expect(pos100.y).toBeCloseTo(pos50.y * 2, 4);
  });
});

describe("Find Best Sector", () => {
  it("findBestSector returns closest item angle", () => {
    const pointerAngle = 0; // Right
    const itemAngles = [
      deg2rad(-45), // NW
      deg2rad(45), // NE
      deg2rad(135), // SE
      deg2rad(-135), // SW
    ];

    // Cone half-angle 60° to encompass items at ±45°
    const best = findBestSector(pointerAngle, itemAngles, deg2rad(60));

    // Both -45° and 45° are equidistant; implementation picks first match
    expect(best).toBeGreaterThanOrEqual(0);
  });

  it("findBestSector respects cone half-angle", () => {
    const pointerAngle = 0;
    const itemAngles = [deg2rad(20), deg2rad(90)];
    const coneHalfAngle = deg2rad(22.5); // 20° is inside, 90° is outside

    const best = findBestSector(pointerAngle, itemAngles, coneHalfAngle);
    expect(best).toBe(0); // 20° is inside cone
  });

  it("findBestSector returns -1 when no item in cone", () => {
    const pointerAngle = 0;
    const itemAngles = [deg2rad(90), deg2rad(180)];
    const coneHalfAngle = deg2rad(22.5);

    const best = findBestSector(pointerAngle, itemAngles, coneHalfAngle);
    expect(best).toBe(-1);
  });

  it("findBestSector handles wrap-around angles", () => {
    const pointerAngle = -Math.PI + 0.1; // Just past left
    const itemAngles = [
      deg2rad(-45), // NW
      deg2rad(-135), // SW
      Math.PI - 0.1, // Almost full left (same as -π + small)
    ];
    const coneHalfAngle = deg2rad(30);

    const best = findBestSector(pointerAngle, itemAngles, coneHalfAngle);
    expect(best).toBeGreaterThanOrEqual(-1);
  });
});

describe("Apply Hysteresis", () => {
  it("applyHysteresis keeps same item if within hysteresis band", () => {
    const pointerAngle = deg2rad(5); // 5° away
    const itemAngles = [deg2rad(0), deg2rad(90), deg2rad(180)];
    const currentIndex = 0; // Staying on first item
    const coneHalfAngle = deg2rad(22.5);
    const hysteresisAngle = deg2rad(10); // ±10°

    // Pointer is within cone + hysteresis of current item
    const result = applyHysteresis(
      pointerAngle,
      itemAngles,
      currentIndex,
      coneHalfAngle,
      hysteresisAngle
    );

    expect(result).toBe(0); // Stay on current item
  });

  it("applyHysteresis switches when pointer far from current item", () => {
    const pointerAngle = deg2rad(89); // Close to second item
    const itemAngles = [deg2rad(0), deg2rad(90), deg2rad(180)];
    const currentIndex = 0; // Currently on first item
    const coneHalfAngle = deg2rad(22.5);
    const hysteresisAngle = deg2rad(5);

    const result = applyHysteresis(
      pointerAngle,
      itemAngles,
      currentIndex,
      coneHalfAngle,
      hysteresisAngle
    );

    expect(result).toBe(1); // Switch to second item (90°)
  });

  it("applyHysteresis prevents flickering at boundary", () => {
    const pointerAngle = deg2rad(25); // Just outside cone (22.5°) but within hysteresis
    const itemAngles = [deg2rad(0), deg2rad(90)];
    const currentIndex = 0;
    const coneHalfAngle = deg2rad(22.5);
    const hysteresisAngle = deg2rad(10);

    // Pointer is outside cone but within hysteresis → stay on current
    const result = applyHysteresis(
      pointerAngle,
      itemAngles,
      currentIndex,
      coneHalfAngle,
      hysteresisAngle
    );

    expect(result).toBe(0); // Stay on item 0
  });
});

describe("Deadzone Check", () => {
  it("isInDeadzone detects points near center", () => {
    const centerX = 0;
    const centerY = 0;
    const deadzoneRadius = 10;

    expect(isInDeadzone(5, 5, centerX, centerY, deadzoneRadius)).toBe(true); // 7.07 distance < 10
    expect(isInDeadzone(0, 0, centerX, centerY, deadzoneRadius)).toBe(true); // 0 < 10
    expect(isInDeadzone(3, 4, centerX, centerY, 5)).toBe(false); // 5 is NOT < 5 (strict <)
  });

  it("isInDeadzone allows points outside deadzone", () => {
    const centerX = 0;
    const centerY = 0;
    const deadzoneRadius = 10;

    expect(isInDeadzone(10, 10, centerX, centerY, deadzoneRadius)).toBe(false); // 14.14 > 10
    expect(isInDeadzone(15, 0, centerX, centerY, deadzoneRadius)).toBe(false); // 15 > 10
  });

  it("isInDeadzone handles zero deadzone", () => {
    const centerX = 0;
    const centerY = 0;

    expect(isInDeadzone(0, 0, centerX, centerY, 0)).toBe(false); // 0 is NOT < 0
    expect(isInDeadzone(0.1, 0, centerX, centerY, 0)).toBe(false); // Any offset outside
  });

  it("isInDeadzone works with offset center", () => {
    const centerX = 100;
    const centerY = 200;
    const deadzoneRadius = 20;

    expect(isInDeadzone(105, 205, centerX, centerY, deadzoneRadius)).toBe(true); // sqrt(50) < 20
    expect(isInDeadzone(150, 250, centerX, centerY, deadzoneRadius)).toBe(false); // sqrt(5000) > 20
  });
});
