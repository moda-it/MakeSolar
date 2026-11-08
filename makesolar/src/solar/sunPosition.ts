import type { Vec3 } from "../geometry/roofNormal";

const DEG = Math.PI / 180;

// Номер дня в році (1..365/366) з рядка "РРРР-ММ-ДД"
export function dayOfYear(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return 1;
  const date = Date.UTC(y, m - 1, d);
  const start = Date.UTC(y, 0, 1);
  return Math.round((date - start) / 86400000) + 1;
}

// Схилення Сонця, радіани (наближення Купера)
export function declination(day: number): number {
  return 23.45 * DEG * Math.sin(((360 / 365) * (284 + day)) * DEG);
}

// Годинний кут, радіани. solarHour: сонячний час, 0..24
export function hourAngle(solarHour: number): number {
  return 15 * (solarHour - 12) * DEG;
}

export interface SunAngles {
  elevation: number; // висота над горизонтом, радіани
  azimuth: number;   // азимут від півночі за годинниковою стрілкою, радіани
}

export function sunAngles(
  latitudeDeg: number,
  day: number,
  solarHour: number
): SunAngles {
  const phi = latitudeDeg * DEG;
  const delta = declination(day);
  const H = hourAngle(solarHour);

  const sinElevation =
    Math.sin(phi) * Math.sin(delta) +
    Math.cos(phi) * Math.cos(delta) * Math.cos(H);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation)));

  const azimuthFromSouth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi)
  );
  const azimuth = (azimuthFromSouth + Math.PI) % (2 * Math.PI);

  return { elevation, azimuth };
}

// Одиничний вектор на Сонце в координатах сцени (північ = -Z, схід = +X)
export function sunDirection(a: SunAngles): Vec3 {
  const c = Math.cos(a.elevation);
  return {
    x: c * Math.sin(a.azimuth),
    y: Math.sin(a.elevation),
    z: -c * Math.cos(a.azimuth),
  };
}

export interface DayLight {
  sunrise: number | null; // сонячна година
  sunset: number | null;
  polar: "none" | "night" | "day";
}

export function daylight(latitudeDeg: number, day: number): DayLight {
  const phi = latitudeDeg * DEG;
  const delta = declination(day);
  const cosH0 = -Math.tan(phi) * Math.tan(delta);

  if (cosH0 >= 1) return { sunrise: null, sunset: null, polar: "night" };
  if (cosH0 <= -1) return { sunrise: null, sunset: null, polar: "day" };

  const hours = Math.acos(cosH0) / DEG / 15;
  return { sunrise: 12 - hours, sunset: 12 + hours, polar: "none" };
}

export interface SunState {
  elevationDeg: number;
  azimuthDeg: number;
  direction: Vec3;
  path: Vec3[];      // шлях Сонця за добу (лише над горизонтом)
  daylight: DayLight;
  dayNumber: number;
}

export function computeSunState(
  latitudeDeg: number,
  dateIso: string,
  solarHour: number
): SunState {
  const dayNumber = dayOfYear(dateIso);
  const angles = sunAngles(latitudeDeg, dayNumber, solarHour);

  const path: Vec3[] = [];
  for (let h = 0; h <= 24; h += 0.25) {
    const a = sunAngles(latitudeDeg, dayNumber, h);
    if (a.elevation > 0) path.push(sunDirection(a));
  }

  return {
    elevationDeg: angles.elevation / DEG,
    azimuthDeg: angles.azimuth / DEG,
    direction: sunDirection(angles),
    path,
    daylight: daylight(latitudeDeg, dayNumber),
    dayNumber,
  };
}

// 12.5 -> "12:30"
export function formatHour(hours: number): string {
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}