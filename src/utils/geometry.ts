/**
 * Pure geometry utilities for the prediction cone menu
 * All functions are side-effect free and handle edge cases
 *
 * @module prediction-cone/utils/geometry
 */

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function deg2rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function rad2deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Normalize an angle to the range [-π, π]
 * @param angle - Angle in radians
 * @returns Normalized angle in [-π, π]
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized > Math.PI) {
    normalized -= 2 * Math.PI;
  }
  while (normalized < -Math.PI) {
    normalized += 2 * Math.PI;
  }
  return normalized;
}

/**
 * Calculate the shortest signed angular difference between two angles
 * Result is in range [-π, π] where negative means counterclockwise rotation
 *
 * @param angleA - First angle in radians
 * @param angleB - Second angle in radians
 * @returns Signed angular difference (angleA - angleB), normalized to [-π, π]
 */
export function angleDiff(angleA: number, angleB: number): number {
  return normalizeAngle(angleA - angleB);
}

/**
 * Calculate the absolute angular difference between two angles
 * @param angleA - First angle in radians
 * @param angleB - Second angle in radians
 * @returns Absolute angular difference in [0, π]
 */
export function angleAbsDiff(angleA: number, angleB: number): number {
  return Math.abs(normalizeAngle(angleA - angleB));
}

/**
 * Calculate the angle of a vector from origin to point (x, y)
 * Uses atan2 for proper quadrant handling
 *
 * @param x - X component
 * @param y - Y component
 * @returns Angle in radians in range [-π, π]
 * Note: Y-axis points downward (DOM convention), so:
 * - (1, 0) = 0 (right)
 * - (0, 1) = π/2 (down)
 * - (-1, 0) = ±π (left)
 * - (0, -1) = -π/2 (up)
 */
export function vecAngle(x: number, y: number): number {
  return Math.atan2(y, x);
}

/**
 * Calculate the Euclidean distance between two points
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @returns Distance
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Clamp a value to a range [min, max]
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Wrap an angle (in radians) to range [0, 2π)
 * @param angle - Angle in radians
 * @returns Wrapped angle in [0, 2π)
 */
export function wrapAngle(angle: number): number {
  let wrapped = angle;
  while (wrapped < 0) {
    wrapped += 2 * Math.PI;
  }
  while (wrapped >= 2 * Math.PI) {
    wrapped -= 2 * Math.PI;
  }
  return wrapped;
}

/**
 * Position an item on a ring given:
 * - Ring radius
 * - Item index
 * - Total number of items
 * - Start angle (in radians)
 *
 * @param index - Item index (0-based)
 * @param totalItems - Total number of items
 * @param ringRadius - Distance from center to item center
 * @param startAngleRad - Starting angle in radians (e.g., -π/2 for top)
 * @returns Object with x, y (absolute position from center) and angleRad
 */
export interface ItemPosition {
  x: number;
  y: number;
  angleRad: number;
}

export function positionOnRing(
  index: number,
  totalItems: number,
  ringRadius: number,
  startAngleRad: number
): ItemPosition {
  const anglePerItem = (2 * Math.PI) / Math.max(1, totalItems);
  const angleRad = startAngleRad + index * anglePerItem;
  return {
    x: ringRadius * Math.cos(angleRad),
    y: ringRadius * Math.sin(angleRad),
    angleRad,
  };
}

/**
 * Determine which sector (item) a given angle falls into
 * Returns the index of the best-matching item
 *
 * @param pointerAngleRad - Pointer direction angle (in radians)
 * @param itemAngles - Array of item angles (in radians) in order
 * @param coneHalfAngleRad - Half-angle of acceptance cone (in radians)
 * @returns Item index with smallest angular difference, or -1 if none match
 */
export function findBestSector(
  pointerAngleRad: number,
  itemAngles: number[],
  coneHalfAngleRad: number
): number {
  if (itemAngles.length === 0) {
    return -1;
  }

  let bestIndex = -1;
  let bestDiff = coneHalfAngleRad + 1; // Start worse than cone half-angle

  for (let i = 0; i < itemAngles.length; i++) {
    const diff = angleAbsDiff(pointerAngleRad, itemAngles[i]);
    if (diff < bestDiff && diff <= coneHalfAngleRad) {
      bestDiff = diff;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Apply hysteresis to item selection to prevent flickering
 *
 * When staying on the same item, use a wider acceptance angle (cone + hysteresis).
 * When switching to a new item, require tighter matching.
 *
 * @param pointerAngleRad - Pointer direction angle (in radians)
 * @param itemAngles - Array of item angles
 * @param currentActiveIndex - Currently active item index (or -1 if none)
 * @param coneHalfAngleRad - Cone half-angle (in radians)
 * @param hysteresisRad - Hysteresis angle (in radians)
 * @returns New active item index, or -1 if none active (considering hysteresis)
 */
export function applyHysteresis(
  pointerAngleRad: number,
  itemAngles: number[],
  currentActiveIndex: number,
  coneHalfAngleRad: number,
  hysteresisRad: number
): number {
  if (itemAngles.length === 0) {
    return -1;
  }

  // If we have an active item, first check if we should stay on it
  if (currentActiveIndex >= 0 && currentActiveIndex < itemAngles.length) {
    const currentItemAngle = itemAngles[currentActiveIndex];
    const diff = angleAbsDiff(pointerAngleRad, currentItemAngle);

    // Stay on current item if within cone + hysteresis
    if (diff <= coneHalfAngleRad + hysteresisRad) {
      return currentActiveIndex;
    }
  }

  // Otherwise, find best new item (stricter: just cone half-angle)
  return findBestSector(pointerAngleRad, itemAngles, coneHalfAngleRad);
}

/**
 * Calculate safe anchor position to keep menu items inside viewport
 * Strategy: if anchor is too close to edges, shift it inward by edgePadding
 *
 * @param anchorX - Proposed anchor X
 * @param anchorY - Proposed anchor Y
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @param ringRadius - Ring radius of items
 * @param itemSize - Size of items
 * @param edgePadding - Minimum padding from viewport edges
 * @returns Safe anchor position {x, y}
 */
export function calculateSafeAnchor(
  anchorX: number,
  anchorY: number,
  viewportWidth: number,
  viewportHeight: number,
  ringRadius: number,
  itemSize: number,
  edgePadding: number
): { x: number; y: number } {
  // The bounding box of the menu is roughly: anchor ± (ringRadius + itemSize/2)
  const menuRadius = ringRadius + itemSize / 2;

  // Clamp anchor so menu stays inside viewport
  const safeX = clamp(anchorX, menuRadius + edgePadding, viewportWidth - menuRadius - edgePadding);
  const safeY = clamp(anchorY, menuRadius + edgePadding, viewportHeight - menuRadius - edgePadding);

  return { x: safeX, y: safeY };
}

/**
 * Clamp item position to viewport bounds
 * Used when positioning individual menu items
 *
 * @param itemX - Item X position (absolute, from center)
 * @param itemY - Item Y position (absolute, from center)
 * @param anchorX - Menu anchor X
 * @param anchorY - Menu anchor Y
 * @param itemSize - Item width/height
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @param padding - Padding from viewport edges
 * @returns Clamped position {x, y} in viewport coordinates
 */
export function clampItemPosition(
  itemX: number,
  itemY: number,
  anchorX: number,
  anchorY: number,
  itemSize: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number
): { x: number; y: number } {
  const halfSize = itemSize / 2;
  const x = clamp(anchorX + itemX, padding + halfSize, viewportWidth - padding - halfSize);
  const y = clamp(anchorY + itemY, padding + halfSize, viewportHeight - padding - halfSize);
  return { x, y };
}

/**
 * Check if a point (px, py) is inside the triangle defined by vertices (ax, ay), (bx, by), (cx, cy).
 * Uses the sign-of-cross-product (barycentric) method — no divisions, no sqrt.
 *
 * @param px - Test point X
 * @param py - Test point Y
 * @param ax - Triangle vertex A X
 * @param ay - Triangle vertex A Y
 * @param bx - Triangle vertex B X
 * @param by - Triangle vertex B Y
 * @param cx - Triangle vertex C X
 * @param cy - Triangle vertex C Y
 * @returns true if point is inside or on the edge of the triangle
 */
export function isPointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

/**
 * Check if a point is within a distance (deadzone)
 * @param x - Point X
 * @param y - Point Y
 * @param centerX - Center X
 * @param centerY - Center Y
 * @param radius - Deadzone radius
 * @returns true if point is inside deadzone
 */
export function isInDeadzone(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number
): boolean {
  const dx = x - centerX;
  const dy = y - centerY;
  return dx * dx + dy * dy < radius * radius; // Avoid sqrt for performance
}
