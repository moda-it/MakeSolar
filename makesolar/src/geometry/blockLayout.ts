import type { LayoutResult } from "./panelLayout";

export interface BlockPlacement {
  x: number; // центр блока, локальні координати даху, м
  z: number;
}

export interface BlockLayoutInput {
  layout: LayoutResult;   // готова сітка панелей
  panelWidth: number;     // розмір панелі вздовж X, м
  panelHeight: number;    // розмір панелі вздовж Z, м
  blockLength: number;    // довжина блока (20/30/40 см), м
  endInsetRatio: number;  // відступ ліній блоків від кінців панелі, частка довжини
  edgeOverhang: number;   // наскільки крайній блок виступає за край панелі, м
  ribCenters: number[];   // координати центрів ребер профілю, м
}

function snapToValleyCenter(x: number, ribCenters: number[]): number {
  if (ribCenters.length < 2) return x;

  let best = x;
  let bestDistance = Infinity;
  for (let i = 0; i < ribCenters.length - 1; i++) {
    const valleyCenter = (ribCenters[i] + ribCenters[i + 1]) / 2;
    const distance = Math.abs(valleyCenter - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = valleyCenter;
    }
  }
  return best;
}

export function blockSpansTwoRibs(
  blockLength: number,
  ribCenters: number[],
  ribTop: number
): boolean {
  if (ribCenters.length < 2) return false;
  const pitch = ribCenters[1] - ribCenters[0];
  return blockLength >= pitch + ribTop;
}

export function computeBlockLayout(input: BlockLayoutInput): BlockPlacement[] {
  const {
    layout,
    panelWidth,
    panelHeight,
    blockLength,
    endInsetRatio,
    edgeOverhang,
    ribCenters,
  } = input;

  if (layout.total === 0) return [];

  const colXs = layout.placements.filter((p) => p.row === 0).map((p) => p.x);
  const rowZs = layout.placements.filter((p) => p.col === 0).map((p) => p.z);

  const inward = blockLength / 2 - edgeOverhang;
  const rawXs: number[] = [];
  rawXs.push(colXs[0] - panelWidth / 2 + inward);
  for (let i = 1; i < colXs.length; i++) {
    rawXs.push((colXs[i - 1] + colXs[i]) / 2);
  }
  rawXs.push(colXs[colXs.length - 1] + panelWidth / 2 - inward);

  const xs = rawXs.map((x) => snapToValleyCenter(x, ribCenters));

  const inset = panelHeight * endInsetRatio;
  const blocks: BlockPlacement[] = [];
  for (const rowZ of rowZs) {
    const zLines = [rowZ - panelHeight / 2 + inset, rowZ + panelHeight / 2 - inset];
    for (const z of zLines) {
      for (const x of xs) {
        blocks.push({ x, z });
      }
    }
  }

  return blocks;
}