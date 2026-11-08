import type { Margins } from "./placement";

export function countAlongAxis(
  available: number,
  size: number,
  gap: number
): number {
  if (size <= 0 || available < size) return 0;
  return Math.floor((available + gap) / (size + gap));
}

function usedSize(count: number, size: number, gap: number): number {
  if (count === 0) return 0;
  return count * size + (count - 1) * gap;
}

export interface LayoutInput {
  roofWidth: number;   // ширина даху вздовж карниза (X), м
  roofLength: number;  // довжина схилу (Z), м
  panelWidth: number;  // розмір панелі вздовж X, м
  panelHeight: number; // розмір панелі вздовж схилу (Z), м
  gap: number;         // проміжок між панелями, м
  margins: Margins;    // мінімальні відступи від країв, м
}

export interface PanelPlacement {
  row: number;
  col: number;
  x: number; // центр панелі, локальні координати даху
  z: number;
}

export interface LayoutResult {
  cols: number;
  rows: number;
  total: number;
  placements: PanelPlacement[];
}

export function computePanelLayout(input: LayoutInput): LayoutResult {
  const { roofWidth, roofLength, panelWidth, panelHeight, gap, margins } = input;

  const cols = countAlongAxis(roofWidth - 2 * margins.side, panelWidth, gap);
  const rows = countAlongAxis(
    roofLength - margins.ridge - margins.eave,
    panelHeight,
    gap
  );

  const usedWidth = usedSize(cols, panelWidth, gap);
  const usedLength = usedSize(rows, panelHeight, gap);

  // Центр вільної зони: по X це середина даху, по Z середина між відступами
  const centerZ = (-roofLength + margins.ridge - margins.eave) / 2;

  const startX = -usedWidth / 2 + panelWidth / 2;
  const startZ = centerZ - usedLength / 2 + panelHeight / 2;

  const placements: PanelPlacement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      placements.push({
        row,
        col,
        x: startX + col * (panelWidth + gap),
        z: startZ + row * (panelHeight + gap),
      });
    }
  }

  return { cols, rows, total: placements.length, placements };
}