const formatters = new Map<number, Intl.NumberFormat>();

// Число в українському форматі: 1 234,5
export function formatNumber(v: number, digits = 0): string {
  let f = formatters.get(digits);
  if (!f) {
    f = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: digits, minimumFractionDigits: digits });
    formatters.set(digits, f);
  }
  return f.format(v);
}

// Коротка форма для осей: 12 тис, 1,5 млн
export function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${formatNumber(v / 1_000_000, 1)} млн`;
  if (Math.abs(v) >= 10_000) return `${formatNumber(v / 1000, 0)} тис`;
  return formatNumber(v, 0);
}

// «Круглі» поділки осі: крок 1, 2, 2.5 або 5 × 10^n, від нуля до значення ≥ max
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let i = 0; i * step <= max + step * 1e-9; i++) ticks.push(i * step);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks.length * step);
  return ticks;
}
