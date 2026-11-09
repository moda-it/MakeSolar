export interface PanelParams {
  width: number;     // розмір вздовж карниза (вісь X), м
  height: number;    // розмір вздовж схилу (вісь Z), м
  thickness: number; // товщина, м
  power: number;     // номінальна потужність, Вт
}

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