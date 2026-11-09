import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, buildEstimate, computePayback } from "../economics/estimate";

describe("buildEstimate", () => {
  const e = buildEstimate({ panelLabel: "Тест", panelCount: 10, blockCount: 24, prices: DEFAULT_PRICES });

  it("підсумок дорівнює сумі рядків", () => {
    expect(e.total).toBe(e.lines.reduce((s, l) => s + l.total, 0));
  });

  it("рахує панелі та блоки поштучно", () => {
    expect(e.lines).toHaveLength(2);
    expect(e.lines[0]).toMatchObject({ qty: 10, total: 10 * DEFAULT_PRICES.panel });
    expect(e.lines[1]).toMatchObject({ qty: 24, total: 24 * DEFAULT_PRICES.block });
  });

  it("порожній проєкт коштує нуль", () => {
    const empty = buildEstimate({ panelLabel: "Тест", panelCount: 0, blockCount: 0, prices: DEFAULT_PRICES });
    expect(empty.total).toBe(0);
    expect(empty.lines).toHaveLength(0);
  });
});

describe("computePayback", () => {
  it("окупність = вартість ÷ (виробіток × тариф)", () => {
    expect(computePayback(100_000, 5000, 4).paybackYears).toBeCloseTo(5, 9);
  });

  it("накопичена економія росте рівномірно", () => {
    const p = computePayback(100_000, 5000, 4);
    expect(p.points[3].cumulative).toBe(60_000);
    expect(p.lifetimeSavings).toBe(500_000);
  });

  it("якщо станція не окупається за 25 років, повертає null", () => {
    const p = computePayback(1_000_000, 100, 4);
    expect(p.paybackYears).toBeNull();
    expect(p.points).toHaveLength(26);
  });
});
