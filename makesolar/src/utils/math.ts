export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
