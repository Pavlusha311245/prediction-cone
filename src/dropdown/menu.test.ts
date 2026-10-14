import { describe, expect, it, mock } from "bun:test";
import { DropdownMenu } from "./menu";

const rect = {
  left: 220,
  top: 100,
  right: 320,
  bottom: 200,
  width: 100,
  height: 100,
} as DOMRect;

function makeMenu(pointerInsideMenu: boolean) {
  const menu = Object.create(DropdownMenu.prototype) as any;
  const deactivate = mock(() => {});
  const removeSubmenu = mock(() => {});
  const close = mock(() => {});

  Object.assign(menu, {
    isPointerOverSubmenu: false,
    mouseTracker: { current: { x: 200, y: 150 } },
    submenuEl: { getBoundingClientRect: () => rect, remove: removeSubmenu },
    menuEl: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        right: pointerInsideMenu ? 500 : 100,
        bottom: 500,
      }),
      querySelectorAll: () => [],
    },
    safeTriangle: { deactivate },
    close,
  });

  return { menu, close, deactivate, removeSubmenu };
}

describe("DropdownMenu expiry", () => {
  it("closes the menu when the pointer stops outside both panels", () => {
    const { menu, close, deactivate, removeSubmenu } = makeMenu(false);

    menu.onSafeZoneExpiry();

    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(removeSubmenu).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("keeps the main menu open when the pointer returns to it", () => {
    const { menu, close, deactivate, removeSubmenu } = makeMenu(true);

    menu.onSafeZoneExpiry();

    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(removeSubmenu).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });
});

describe("DropdownMenu pointer direction", () => {
  it("allows the pointer to travel from a submenu back toward the main menu", () => {
    const menu = Object.create(DropdownMenu.prototype) as any;
    Object.assign(menu, {
      menuEl: { getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 300 }) },
      mouseTracker: { current: { x: 260, y: 150 } },
    });

    expect(menu.isMovingTowardMenu(220, 150)).toBe(true);
    expect(menu.isMovingTowardMenu(300, 150)).toBe(false);
  });
});
