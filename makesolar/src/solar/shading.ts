import type { Vec3 } from "../utils/math";
import type { Obstacle } from "../types/obstacle";
import type { PlacedPanel } from "../types/panel";

// Перешкода як паралелепіпед у локальних координатах даху
export interface ShadeBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function obstacleToBox(o: Obstacle, baseY: number): ShadeBox {
  return {
    minX: o.x - o.width / 2,
    maxX: o.x + o.width / 2,
    minY: baseY,
    maxY: baseY + o.height,
    minZ: o.z - o.depth / 2,
    maxZ: o.z + o.depth / 2,
  };
}

// Чи перетинає промінь p + t·d (t > 0) паралелепіпед. Метод «плит» (slab test).
export function rayHitsBox(p: Vec3, d: Vec3, b: ShadeBox): boolean {
  let tMin = 1e-6;
  let tMax = Infinity;
  const axes: [number, number, number, number][] = [
    [p.x, d.x, b.minX, b.maxX],
    [p.y, d.y, b.minY, b.maxY],
    [p.z, d.z, b.minZ, b.maxZ],
  ];
  for (const [o, dir, lo, hi] of axes) {
    if (Math.abs(dir) < 1e-12) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let t1 = (lo - o) / dir;
    let t2 = (hi - o) / dir;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// Сітка n×n точок на верхній поверхні панелі (центри комірок)
export function panelSamplePoints(
  panel: PlacedPanel,
  width: number,
  height: number,
  y: number,
  n = 3
): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      points.push({
        x: panel.x - width / 2 + ((i + 0.5) / n) * width,
        y,
        z: panel.z - height / 2 + ((j + 0.5) / n) * height,
      });
    }
  }
  return points;
}

// Частка точок панелі, які перешкоди закривають від Сонця (0 = освітлена, 1 = у тіні).
// sunLocal: одиничний вектор на Сонце в локальних координатах даху.
export function shadedFraction(points: Vec3[], sunLocal: Vec3, boxes: ShadeBox[]): number {
  if (sunLocal.y <= 0) return 1;
  if (boxes.length === 0 || points.length === 0) return 0;
  let shaded = 0;
  for (const p of points) {
    if (boxes.some((b) => rayHitsBox(p, sunLocal, b))) shaded++;
  }
  return shaded / points.length;
}
