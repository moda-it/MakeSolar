// Кошторис і окупність станції. Стартові ціни орієнтовні ринкові.

export interface Prices {
  panel: number;  // грн за одну панель
  block: number;  // грн за один блок кріплення
  tariff: number; // вартість електроенергії, грн/кВт·год
}

export const DEFAULT_PRICES: Prices = {
  panel: 3200,
  block: 300,
  tariff: 4.32,
};

export const LIFETIME_YEARS = 25;

export interface BomLine {
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

export interface EstimateInput {
  panelLabel: string;
  panelCount: number;
  blockCount: number;
  prices: Prices;
}

export interface Estimate {
  lines: BomLine[];
  total: number;
}

export function buildEstimate({ panelLabel, panelCount, blockCount, prices }: EstimateInput): Estimate {
  const lines: BomLine[] = [
    { name: `Панель ${panelLabel}`, qty: panelCount, unit: "шт", price: prices.panel, total: 0 },
    { name: "Блок кріплення", qty: blockCount, unit: "шт", price: prices.block, total: 0 },
  ].map((l) => ({ ...l, total: Math.round(l.qty * l.price) }));

  return {
    lines: lines.filter((l) => l.qty > 0),
    total: lines.reduce((s, l) => s + l.total, 0),
  };
}

export interface PaybackPoint {
  year: number;
  cumulative: number; // накопичена економія на кінець року, грн
}

export interface Payback {
  points: PaybackPoint[];
  paybackYears: number | null; // null, якщо не окупається за строк служби
  lifetimeSavings: number;
}

// Окупність: щороку станція заощаджує річний виробіток × тариф
export function computePayback(
  cost: number,
  annualKwh: number,
  tariff: number,
  years = LIFETIME_YEARS
): Payback {
  const yearSaving = annualKwh * tariff;
  const points: PaybackPoint[] = [];
  for (let y = 0; y <= years; y++) points.push({ year: y, cumulative: yearSaving * y });

  const paybackYears = cost > 0 && yearSaving > 0 && cost <= yearSaving * years ? cost / yearSaving : null;
  return { points, paybackYears, lifetimeSavings: yearSaving * years };
}
