import { describe, expect, it } from "vitest";
import {
  obstacleToBox,
  panelSamplePoints,
  rayHitsBox,
  shadedFraction,
} from "../solar/shading";

const box = { minX: -1, maxX: 1, minY: 0, maxY: 2, minZ: -1, maxZ: 1 };
const norm = (x: number, y: number, z: number) => {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
};

describe("rayHitsBox", () => {
  it("промінь у бік коробки влучає", () => {
    expect(rayHitsBox({ x: -5, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, box)).toBe(true);
  });

  it("промінь від коробки не влучає (t < 0)", () => {
    expect(rayHitsBox({ x: -5, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }, box)).toBe(false);
  });

  it("промінь над коробкою проходить повз", () => {
    expect(rayHitsBox({ x: -5, y: 3, z: 0 }, { x: 1, y: 0, z: 0 }, box)).toBe(false);
  });

  it("паралельний промінь поза плитою не влучає", () => {
    expect(rayHitsBox({ x: -5, y: 1, z: 5 }, { x: 1, y: 0, z: 0 }, box)).toBe(false);
  });
});

describe("panelSamplePoints", () => {
  it("дає n×n точок усередині панелі", () => {
    const pts = panelSamplePoints({ id: 1, x: 2, z: -3 }, 1, 2, 0.1, 3);
    expect(pts).toHaveLength(9);
    for (const p of pts) {
      expect(p.x).toBeGreaterThan(1.5);
      expect(p.x).toBeLessThan(2.5);
      expect(p.z).toBeGreaterThan(-4);
      expect(p.z).toBeLessThan(-2);
      expect(p.y).toBe(0.1);
    }
  });
});

describe("shadedFraction", () => {
  const points = panelSamplePoints({ id: 1, x: 0, z: -3 }, 1, 1, 0.1, 3);

  it("без перешкод панель повністю освітлена", () => {
    expect(shadedFraction(points, norm(0.2, 1, 0.1), [])).toBe(0);
  });

  it("Сонце за площиною даху означає повну тінь", () => {
    expect(shadedFraction(points, norm(0, -0.1, 1), [])).toBe(1);
  });

  it("висока перешкода зі сходу затінює панель при низькому ранковому Сонці", () => {
    const chimney = obstacleToBox({ id: 1, x: 1.5, z: -3, width: 0.6, depth: 2, height: 2 }, 0);
    expect(shadedFraction(points, norm(1, 0.3, 0), [chimney])).toBe(1);
  });

  it("та сама перешкода не затінює панель, коли Сонце із заходу", () => {
    const chimney = obstacleToBox({ id: 1, x: 1.5, z: -3, width: 0.6, depth: 2, height: 2 }, 0);
    expect(shadedFraction(points, norm(-1, 0.3, 0), [chimney])).toBe(0);
  });
});
