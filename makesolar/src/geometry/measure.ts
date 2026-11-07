import type { Rect } from "./placement";

export type Direction = "left" | "right" | "ridge" | "eave";

export interface Measurement {
  dir: Direction;
  from: { x: number; z: number };
  to: { x: number; z: number };
  distance: number;
  toObject: boolean; // true: до сусіднього об'єкта, false: до краю даху
}

const EPS = 1e-6;

function overlaps(aCenter: number, aSize: number, bCenter: number, bSize: number): boolean {
  return Math.abs(aCenter - bCenter) < (aSize + bSize) / 2 - EPS;
}

export function measureAround(
  target: Rect,
  others: Rect[],
  roofWidth: number,
  roofLength: number
): Measurement[] {
  const left = target.x - target.width / 2;
  const right = target.x + target.width / 2;
  const top = target.z - target.depth / 2;    // бік до коника (менше Z)
  const bottom = target.z + target.depth / 2; // бік до карниза

  let dLeft = left + roofWidth / 2;
  let dRight = roofWidth / 2 - right;
  let dRidge = top + roofLength;
  let dEave = -bottom;
  const hit = { left: false, right: false, ridge: false, eave: false };

  for (const o of others) {
    const oLeft = o.x - o.width / 2;
    const oRight = o.x + o.width / 2;
    const oTop = o.z - o.depth / 2;
    const oBottom = o.z + o.depth / 2;

    if (overlaps(target.z, target.depth, o.z, o.depth)) {
      if (oRight <= left + EPS && left - oRight < dLeft) {
        dLeft = left - oRight;
        hit.left = true;
      }
      if (oLeft >= right - EPS && oLeft - right < dRight) {
        dRight = oLeft - right;
        hit.right = true;
      }
    }
    if (overlaps(target.x, target.width, o.x, o.width)) {
      if (oBottom <= top + EPS && top - oBottom < dRidge) {
        dRidge = top - oBottom;
        hit.ridge = true;
      }
      if (oTop >= bottom - EPS && oTop - bottom < dEave) {
        dEave = oTop - bottom;
        hit.eave = true;
      }
    }
  }

  return [
    { dir: "left", from: { x: left, z: target.z }, to: { x: left - dLeft, z: target.z }, distance: dLeft, toObject: hit.left },
    { dir: "right", from: { x: right, z: target.z }, to: { x: right + dRight, z: target.z }, distance: dRight, toObject: hit.right },
    { dir: "ridge", from: { x: target.x, z: top }, to: { x: target.x, z: top - dRidge }, distance: dRidge, toObject: hit.ridge },
    { dir: "eave", from: { x: target.x, z: bottom }, to: { x: target.x, z: bottom + dEave }, distance: dEave, toObject: hit.eave },
  ];
}