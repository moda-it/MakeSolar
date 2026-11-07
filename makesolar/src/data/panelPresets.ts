import type { PanelParams } from "../types/panel";

export interface PanelPreset {
  id: string;
  label: string;
  params: PanelParams;
}

// width: поперек хвилі (коротка сторона), height: уздовж хвилі (довга сторона), м.
export const PANEL_PRESETS: PanelPreset[] = [
  {
    id: "jinko-435",
    label: "Jinko Tiger Neo JKM435N-54HL4R-B, 435 Вт",
    params: { width: 1.134, height: 1.762, thickness: 0.03, power: 435 },
  },
  {
    id: "ja-440",
    label: "JA Solar JAM54D40-440/LB, 440 Вт",
    params: { width: 1.134, height: 1.762, thickness: 0.03, power: 440 },
  },
  {
    id: "longi-x10-490",
    label: "LONGi Hi-MO X10 LR7-54HVH-490M, 490 Вт",
    params: { width: 1.134, height: 1.8, thickness: 0.03, power: 490 },
  },
  {
    id: "jinko-590",
    label: "Jinko Tiger Neo JKM590N-72HL4-BDV, 590 Вт",
    params: { width: 1.134, height: 2.278, thickness: 0.03, power: 590 },
  },
  {
    id: "longi-hi-mo9-640",
    label: "LONGi Hi-MO 9 LR8-66HYD-640M, 640 Вт",
    params: { width: 1.134, height: 2.382, thickness: 0.03, power: 640 },
  },
];