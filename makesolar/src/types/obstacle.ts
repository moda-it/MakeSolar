export interface Obstacle {
  id: number;
  x: number;      // центр, локальні координати даху, м
  z: number;
  width: number;  // розмір вздовж карниза (X), м
  depth: number;  // розмір вздовж схилу (Z), м
  height: number; // висота над поверхнею даху, м
}

export interface ObstacleDragState {
  id: number;
  grab: { x: number; y: number; z: number }; // де курсор схопив перешкоду
}