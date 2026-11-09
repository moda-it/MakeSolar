import { describe, expect, it } from "vitest";
import { worldToRoofLocal } from "../solar/roofFrame";
import { getRoofNormal } from "../geometry/roofNormal";

const DEG = Math.PI / 180;

describe("worldToRoofLocal", () => {
  it("нормаль південного даху переходить у локальну вісь Y", () => {
    for (const tilt of [0, 15, 30, 45, 60, 90]) {
      const v = worldToRoofLocal(getRoofNormal(tilt), tilt, 180);
      expect(v.x).toBeCloseTo(0, 10);
      expect(v.y).toBeCloseTo(1, 10);
      expect(v.z).toBeCloseTo(0, 10);
    }
  });

  it("нормаль східного даху (азимут 90°) теж стає віссю Y", () => {
    const t = 35 * DEG;
    const v = worldToRoofLocal({ x: Math.sin(t), y: Math.cos(t), z: 0 }, 35, 90);
    expect(v.y).toBeCloseTo(1, 10);
  });

  it("плаский дах не змінює вертикаль", () => {
    const v = worldToRoofLocal({ x: 0, y: 1, z: 0 }, 0, 123);
    expect(v.y).toBeCloseTo(1, 10);
  });

  it("зберігає довжину вектора", () => {
    const v = worldToRoofLocal({ x: 0.3, y: 0.5, z: -0.81 }, 27, 213);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(Math.hypot(0.3, 0.5, -0.81), 10);
  });
});
