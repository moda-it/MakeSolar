import type { Point2D } from "./roofProfile";

export interface BlockProfileParams {
  height: number;          // висота блока, м
  topWidth: number;        // ширина по верху, м
  bodyBaseWidth: number;   // ширина тіла внизу, м
  totalWidth: number;      // повна ширина з полицями, м
  flangeThickness: number; // товщина полиць, м
}

export const DEFAULT_BLOCK_PROFILE: BlockProfileParams = {
  height: 0.05,
  topWidth: 0.03,
  bodyBaseWidth: 0.055,
  totalWidth: 0.104,
  flangeThickness: 0.005,
};

export const BLOCK_LENGTHS = [0.2, 0.3, 0.4] as const;

export function buildBlockOutline(p: BlockProfileParams): Point2D[] {
  const w = p.totalWidth / 2;
  const b = p.bodyBaseWidth / 2;
  const t = p.topWidth / 2;

  return [
    { x: -w, y: 0 },
    { x: w, y: 0 },
    { x: w, y: p.flangeThickness },
    { x: b, y: p.flangeThickness },
    { x: t, y: p.height },
    { x: -t, y: p.height },
    { x: -b, y: p.flangeThickness },
    { x: -w, y: p.flangeThickness },
  ];
}