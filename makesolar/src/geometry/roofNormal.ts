export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function getRoofNormal(tiltDeg: number): Vec3 {
  const tilt = (tiltDeg * Math.PI) / 180;
  return { x: 0, y: Math.cos(tilt), z: Math.sin(tilt) };
}