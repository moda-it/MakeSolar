export interface Point2D {
  x: number;
  y: number;
}

export interface ProfileParams {
  pitch: number;     // крок хвилі, м
  height: number;    // висота ребра, м
  ribTop: number;    // ширина плоскої верхівки ребра, м
  ribSlope: number;  // горизонтальний розбіг похилого боку, м
  thickness: number; // товщина листа (умовна, для візуалізації), м
}

export const DEFAULT_PROFILE: ProfileParams = {
  pitch: 0.2,
  height: 0.04,
  ribTop: 0.04,
  ribSlope: 0.03,
  thickness: 0.01,
};

export function buildProfileOutline(
  totalWidth: number,
  profile: ProfileParams
): Point2D[] {
  const waves = Math.max(1, Math.round(totalWidth / profile.pitch));
  const pitch = totalWidth / waves;
  const valley = pitch - profile.ribTop - 2 * profile.ribSlope;

  const top: Point2D[] = [{ x: 0, y: 0 }];
  for (let i = 0; i < waves; i++) {
    const x0 = i * pitch;
    top.push(
      { x: x0 + valley, y: 0 },
      { x: x0 + valley + profile.ribSlope, y: profile.height },
      { x: x0 + valley + profile.ribSlope + profile.ribTop, y: profile.height },
      { x: x0 + pitch, y: 0 }
    );
  }

  const bottom = top
    .map((p) => ({ x: p.x, y: p.y - profile.thickness }))
    .reverse();

  return [...top, ...bottom];
}