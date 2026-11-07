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

export interface PlacedPanel {
  id: number; // унікальний номер панелі
  x: number;  // центр, локальні координати даху, м
  z: number;
}

export interface DragState {
  id: number;
  grab: { x: number; z: number };  // де курсор схопив панель
  start: { x: number; z: number }; // де панель стояла до перетягування
}