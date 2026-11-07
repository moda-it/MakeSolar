import { clamp } from "../utils/math";
import type { Pos, Rect } from "./placement";

export interface ObstacleRules {
  roofWidth: number;
  roofLength: number;
  snapDistance: number;
}

interface Size {
  width: number;
  depth: number;
}

function bounds(size: Size, r: ObstacleRules) {
  return {
    minX: -r.roofWidth / 2 + size.width / 2,
    maxX: r.roofWidth / 2 - size.width / 2,
    minZ: -r.roofLength + size.depth / 2,
    maxZ: -size.depth / 2,
  };
}

function snapAxis(value: number, min: number, max: number, threshold: number): number {
  if (Math.abs(value - min) < threshold) return min;
  if (Math.abs(value - max) < threshold) return max;
  return value;
}

export function snapObstacle(cursor: Pos, size: Size, r: ObstacleRules): Pos {
  const { minX, maxX, minZ, maxZ } = bounds(size, r);
  return {
    x: clamp(snapAxis(cursor.x, minX, maxX, r.snapDistance), minX, maxX),
    z: clamp(snapAxis(cursor.z, minZ, maxZ, r.snapDistance), minZ, maxZ),
  };
}

export function isValidObstaclePos(pos: Pos, size: Size, others: Rect[]): boolean {
  const eps = 1e-6;
  for (const o of others) {
    const overlapX = Math.abs(pos.x - o.x) < (size.width + o.width) / 2 - eps;
    const overlapZ = Math.abs(pos.z - o.z) < (size.depth + o.depth) / 2 - eps;
    if (overlapX && overlapZ) return false;
  }
  return true;
}