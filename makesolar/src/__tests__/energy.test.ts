import { describe, expect, it } from "vitest";
import {
  WEATHER_FACTORS,
  ZHYTOMYR_REFERENCE_KWH_PER_KWP,
  airMass,
  clearSky,
  planeIrradiance,
  simulateDay,
  simulateYear,
  type EnergyInput,
} from "../solar/energy";

const DEG = Math.PI / 180;

const base: EnergyInput = {
  latitude: 50.25,
  tilt: 35,
  azimuth: 180,
  panel: { width: 1, height: 1.7, thickness: 0.03, power: 1000 }, // 1 кВт для зручності
  panels: [{ id: 1, x: 0, z: -3 }],
  panelTopY: 0.13,
  obstacles: [],
  obstacleBaseY: 0.05,
};

describe("модель ясного неба", () => {
  it("оптична маса в зеніті дорівнює 1", () => {
    expect(airMass(90 * DEG)).toBeCloseTo(1, 2);
  });

  it("під горизонтом випромінювання немає", () => {
    expect(clearSky(-5 * DEG)).toEqual({ dni: 0, dhi: 0, ghi: 0 });
  });

  it("у зеніті DNI ≈ 1361·0.7 Вт/м²", () => {
    expect(clearSky(90 * DEG).dni).toBeCloseTo(1361 * 0.7, -1);
  });

  it("чим нижче Сонце, тим слабше пряме світло", () => {
    expect(clearSky(20 * DEG).dni).toBeLessThan(clearSky(60 * DEG).dni);
  });

  it("тінь прибирає лише пряму складову", () => {
    const sky = clearSky(50 * DEG);
    const lit = planeIrradiance(sky, 0.9, 30, 1);
    const shaded = planeIrradiance(sky, 0.9, 30, 0);
    expect(lit - shaded).toBeCloseTo(sky.dni * 0.9, 6);
    expect(shaded).toBeGreaterThan(0);
  });
});

describe("simulateDay", () => {
  it("уночі потужність нульова, опівдні максимальна", () => {
    const d = simulateDay(base, 172);
    const at = (h: number) => d.powerKw[d.hours.findIndex((x) => Math.abs(x - h) < 1e-9)];
    expect(at(0)).toBe(0);
    expect(at(12)).toBeGreaterThan(at(9));
    expect(at(12)).toBeGreaterThan(at(15));
  });

  it("влітку ясний день дає більше, ніж узимку", () => {
    expect(simulateDay(base, 172).energyKwh).toBeGreaterThan(simulateDay(base, 355).energyKwh);
  });

  it("без перешкод втрат від тіні немає", () => {
    const d = simulateDay(base, 172);
    expect(d.energyKwh).toBeCloseTo(d.energyNoShadeKwh, 9);
    expect(d.panelLoss[0]).toBeCloseTo(0, 9);
  });

  it("висока перешкода поруч зменшує виробіток", () => {
    const shaded = simulateDay(
      { ...base, obstacles: [{ id: 1, x: 1.4, z: -3, width: 0.6, depth: 0.6, height: 2 }] },
      172
    );
    expect(shaded.energyKwh).toBeLessThan(shaded.energyNoShadeKwh);
    expect(shaded.panelLoss[0]).toBeGreaterThan(0.02);
  });

  it("енергія пропорційна кількості панелей", () => {
    const one = simulateDay(base, 172).energyKwh;
    const two = simulateDay({ ...base, panels: [...base.panels, { id: 2, x: 2, z: -3 }] }, 172).energyKwh;
    expect(two).toBeCloseTo(2 * one, 9);
  });
});

describe("simulateYear", () => {
  it("погодні коефіцієнти лежать між 0 і 1", () => {
    for (const f of WEATHER_FACTORS) {
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("для еталонного даху дає типовий виробіток Житомира", () => {
    const y = simulateYear(base);
    const reference = ZHYTOMYR_REFERENCE_KWH_PER_KWP.reduce((a, b) => a + b, 0);
    expect(y.specificYield).toBeGreaterThan(reference * 0.97);
    expect(y.specificYield).toBeLessThan(reference * 1.03);
  });

  it("південний дах вигідніший за північний і східний", () => {
    const south = simulateYear(base).annualKwh;
    const east = simulateYear({ ...base, azimuth: 90 }).annualKwh;
    const north = simulateYear({ ...base, azimuth: 0 }).annualKwh;
    expect(south).toBeGreaterThan(east);
    expect(east).toBeGreaterThan(north);
  });

  it("без панелей виробіток нульовий", () => {
    const y = simulateYear({ ...base, panels: [] });
    expect(y.annualKwh).toBe(0);
    expect(y.specificYield).toBe(0);
  });
});
