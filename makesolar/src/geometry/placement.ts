import { clamp } from "../utils/math";

export interface Pos {
  x: number;
  z: number;
}

export interface PlacementRules {
  roofWidth: number;
  roofLength: number;
  panelWidth: number;
  panelHeight: number;
  gap: number;
  margin: number;
  snapDistance: number;
}

function getBounds(r: PlacementRules) {
  return {
    minX: -r.roofWidth / 2 + r.margin + r.panelWidth / 2,
    maxX: r.roofWidth / 2 - r.margin - r.panelWidth / 2,
    minZ: -r.roofLength + r.margin + r.panelHeight / 2,
    maxZ: -r.margin - r.panelHeight / 2,
  };
}

function pickSnap(value: number, candidates: number[], threshold: number): number {
  let best = value;
  let bestDistance = threshold;
  for (const c of candidates) {
    const d = Math.abs(value - c);
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  }
  return best;
}

export function snapPosition(cursor: Pos, others: Pos[], r: PlacementRules): Pos {
  const stepX = r.panelWidth + r.gap;
  const stepZ = r.panelHeight + r.gap;
  const { minX, maxX, minZ, maxZ } = getBounds(r);

  const xCandidates: number[] = [minX, maxX];
  const zCandidates: number[] = [minZ, maxZ];

  for (const o of others) {
    const nearInZ = Math.abs(cursor.z - o.z) < stepZ + r.snapDistance;
    const nearInX = Math.abs(cursor.x - o.x) < stepX + r.snapDistance;

    if (nearInZ) xCandidates.push(o.x - stepX, o.x + stepX);
    if (nearInX) zCandidates.push(o.z - stepZ, o.z + stepZ);

    xCandidates.push(o.x);
    zCandidates.push(o.z);
  }

  const x = pickSnap(cursor.x, xCandidates, r.snapDistance);
  const z = pickSnap(cursor.z, zCandidates, r.snapDistance);

  return { x: clamp(x, minX, maxX), z: clamp(z, minZ, maxZ) };
}

export function isValidPlacement(pos: Pos, others: Pos[], r: PlacementRules): boolean {
  const { minX, maxX, minZ, maxZ } = getBounds(r);
  if (minX > maxX || minZ > maxZ) return false;

  const eps = 1e-6;
  for (const o of others) {
    const tooCloseX = Math.abs(pos.x - o.x) < r.panelWidth + r.gap - eps;
    const tooCloseZ = Math.abs(pos.z - o.z) < r.panelHeight + r.gap - eps;
    if (tooCloseX && tooCloseZ) return false;
  }
  return true;
}

export function isInsideRoof(pos: Pos, r: PlacementRules): boolean {
  const { minX, maxX, minZ, maxZ } = getBounds(r);
  const eps = 1e-6;
  return (
    pos.x >= minX - eps &&
    pos.x <= maxX + eps &&
    pos.z >= minZ - eps &&
    pos.z <= maxZ + eps
  );
}