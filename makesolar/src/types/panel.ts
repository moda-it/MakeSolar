export interface PanelParams {
  width: number;     // розмір вздовж карниза (вісь X), м
  height: number;    // розмір вздовж схилу (вісь Z), м
  thickness: number; // товщина, м
  power: number;     // номінальна потужність, Вт
}

export const DEFAULT_PANEL: PanelParams = {
  width: 1.1,
  height: 1.7,
  thickness: 0.035,
  power: 400,
};