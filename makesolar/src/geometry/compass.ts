const NAMES = [
  "Північ",
  "Північний схід",
  "Схід",
  "Південний схід",
  "Південь",
  "Південний захід",
  "Захід",
  "Північний захід",
];

export function compassName(azimuthDeg: number): string {
  const a = ((azimuthDeg % 360) + 360) % 360;
  return NAMES[Math.round(a / 45) % 8];
}

// Кут повороту навколо вертикальної осі Y (радіани), щоб скат дивився на азимут
export function azimuthToRotationY(azimuthDeg: number): number {
  return ((180 - azimuthDeg) * Math.PI) / 180;
}