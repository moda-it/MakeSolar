import { DEFAULT_BLOCK_PROFILE } from "./blockProfile";

export interface BlockPlacement {
  x: number; // центр блока, локальні координати даху, м
  z: number;
}

interface PanelPos {
  x: number;
  z: number;
}

interface Candidate {
  x: number;
  z: number;
  side: "left" | "right";
  used: boolean;
}

export interface BlocksForPanelsInput {
  panels: PanelPos[];
  panelWidth: number;
  panelHeight: number;
  blockLength: number;
  endInsetRatio: number; // відступ ліній блоків від кінців панелі, частка довжини
  edgeOverhang: number;  // наскільки крайній блок виступає за край панелі, м
  ribCenters: number[];
  mergeDistance: number; // максимальна відстань між краями, щоб блок став спільним, м
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

function canMerge(
  a: Candidate,
  b: Candidate,
  mergeDistance: number,
  zTolerance: number
): boolean {
  if (a.side === b.side) return false;
  const rightC = a.side === "right" ? a : b;
  const leftC = a.side === "left" ? a : b;
  const dx = leftC.x - rightC.x;
  return dx >= -1e-6 && dx <= mergeDistance && Math.abs(a.z - b.z) < zTolerance;
}

export function computeBlocksForPanels(
  input: BlocksForPanelsInput
): BlockPlacement[] {
  const {
    panels,
    panelWidth,
    panelHeight,
    blockLength,
    endInsetRatio,
    edgeOverhang,
    ribCenters,
    mergeDistance,
  } = input;

  const inward = blockLength / 2 - edgeOverhang;
  const inset = panelHeight * endInsetRatio;
  const zTolerance = DEFAULT_BLOCK_PROFILE.totalWidth;

  const candidates: Candidate[] = [];
  for (const p of panels) {
    const zLines = [p.z - panelHeight / 2 + inset, p.z + panelHeight / 2 - inset];
    for (const z of zLines) {
      candidates.push({ x: p.x - panelWidth / 2, z, side: "left", used: false });
      candidates.push({ x: p.x + panelWidth / 2, z, side: "right", used: false });
    }
  }

  const raw: BlockPlacement[] = [];
  for (const a of candidates) {
    if (a.used) continue;
    a.used = true;

    const partner = candidates.find(
      (b) => !b.used && canMerge(a, b, mergeDistance, zTolerance)
    );

    if (partner) {
      partner.used = true;
      raw.push({ x: (a.x + partner.x) / 2, z: (a.z + partner.z) / 2 });
    } else {
      const x = a.side === "left" ? a.x + inward : a.x - inward;
      raw.push({ x, z: a.z });
    }
  }

  return raw.map((b) => ({ x: snapToValleyCenter(b.x, ribCenters), z: b.z }));
}