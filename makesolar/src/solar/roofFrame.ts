import type { Vec3 } from "../geometry/roofNormal";
import { azimuthToRotationY } from "../geometry/compass";

const DEG = Math.PI / 180;

// Переводить вектор зі світових координат сцени в локальні координати даху.
// У сцені дах повернуто навколо Y на azimuthToRotationY(azimuth), а потім
// нахилено навколо X на tilt. Тут ці повороти виконуються у зворотному порядку.
// Локальна вісь Y дивиться по нормалі до схилу, Z від коника (−довжина) до карниза (0).
export function worldToRoofLocal(v: Vec3, tiltDeg: number, azimuthDeg: number): Vec3 {
  const a = azimuthToRotationY(azimuthDeg);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const x1 = v.x * ca - v.z * sa;
  const z1 = v.x * sa + v.z * ca;
  const y1 = v.y;

  const t = tiltDeg * DEG;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  return {
    x: x1,
    y: y1 * ct + z1 * st,
    z: -y1 * st + z1 * ct,
  };
}
