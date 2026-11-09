import { describe, expect, it } from "vitest";
import { computePanelLayout, countAlongAxis } from "../geometry/panelLayout";
import { DEFAULT_PROFILE, getRibCenters } from "../geometry/roofProfile";

describe("countAlongAxis", () => {
  it("враховує проміжки між панелями", () => {
    expect(countAlongAxis(10, 1, 0.1)).toBe(9);
    expect(countAlongAxis(2.1, 1, 0.1)).toBe(2);
  });

  it("повертає 0, якщо панель не вміщається", () => {
    expect(countAlongAxis(0.5, 1, 0.1)).toBe(0);
  });
});

describe("computePanelLayout", () => {
  const input = {
    roofWidth: 10,
    roofLength: 6,
    panelWidth: 1.134,
    panelHeight: 1.762,
    gap: 0.025,
    margins: { side: 0.3, ridge: 0.3, eave: 0.3 },
  };
  const r = computePanelLayout(input);

  it("кількість панелей дорівнює рядки × стовпці", () => {
    expect(r.total).toBe(r.rows * r.cols);
    expect(r.cols).toBe(8);
    expect(r.rows).toBe(3);
  });

  it("усі панелі лежать усередині відступів", () => {
    for (const p of r.placements) {
      expect(p.x - input.panelWidth / 2).toBeGreaterThanOrEqual(-input.roofWidth / 2 + input.margins.side - 1e-9);
      expect(p.x + input.panelWidth / 2).toBeLessThanOrEqual(input.roofWidth / 2 - input.margins.side + 1e-9);
      expect(p.z - input.panelHeight / 2).toBeGreaterThanOrEqual(-input.roofLength + input.margins.ridge - 1e-9);
      expect(p.z + input.panelHeight / 2).toBeLessThanOrEqual(-input.margins.eave + 1e-9);
    }
  });
});

describe("getRibCenters", () => {
  it("фактичний крок хвилі не менший за заданий", () => {
    for (const width of [2, 2.3, 5.7, 10, 13.3]) {
      const c = getRibCenters(width, { ...DEFAULT_PROFILE, pitch: 0.4 });
      expect(c[1] - c[0]).toBeGreaterThanOrEqual(0.4 - 1e-9);
    }
  });
});
