import { describe, expect, it } from "vitest";
import {
  dayOfYear,
  daylight,
  declination,
  formatHour,
  sunAngles,
  sunDirection,
} from "../solar/sunPosition";

const DEG = Math.PI / 180;

describe("dayOfYear", () => {
  it("рахує дні від 1 січня", () => {
    expect(dayOfYear("2026-01-01")).toBe(1);
    expect(dayOfYear("2026-06-21")).toBe(172);
    expect(dayOfYear("2026-12-31")).toBe(365);
  });

  it("враховує 29 лютого у високосному році", () => {
    expect(dayOfYear("2024-12-31")).toBe(366);
  });
});

describe("declination", () => {
  it("максимальна в день літнього сонцестояння", () => {
    expect(declination(172) / DEG).toBeCloseTo(23.45, 1);
  });

  it("близька до нуля в день рівнодення", () => {
    expect(Math.abs(declination(81) / DEG)).toBeLessThan(0.5);
  });

  it("мінімальна в день зимового сонцестояння", () => {
    expect(declination(355) / DEG).toBeCloseTo(-23.45, 1);
  });
});

describe("sunAngles", () => {
  it("опівдні на рівнодення висота Сонця дорівнює 90° мінус широта", () => {
    const a = sunAngles(50, 81, 12);
    expect(a.elevation / DEG).toBeCloseTo(40, 0);
  });

  it("опівдні в північній півкулі Сонце на півдні (азимут 180°)", () => {
    expect(sunAngles(50, 172, 12).azimuth / DEG).toBeCloseTo(180, 3);
  });

  it("вранці Сонце на сході, увечері на заході", () => {
    expect(sunAngles(50, 172, 8).azimuth / DEG).toBeLessThan(180);
    expect(sunAngles(50, 172, 16).azimuth / DEG).toBeGreaterThan(180);
  });

  it("опівночі Сонце під горизонтом", () => {
    expect(sunAngles(50, 172, 0).elevation).toBeLessThan(0);
  });
});

describe("sunDirection", () => {
  it("повертає одиничний вектор", () => {
    const d = sunDirection(sunAngles(50, 172, 10));
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 10);
  });

  it("південь у сцені відповідає +Z", () => {
    const d = sunDirection({ elevation: 0, azimuth: Math.PI });
    expect(d.z).toBeCloseTo(1, 10);
    expect(d.x).toBeCloseTo(0, 10);
  });
});

describe("daylight", () => {
  it("на екваторі день триває 12 годин", () => {
    const d = daylight(0, 172);
    expect(d.sunrise).toBeCloseTo(6, 5);
    expect(d.sunset).toBeCloseTo(18, 5);
  });

  it("влітку в Житомирі день довший, ніж узимку", () => {
    const summer = daylight(50.25, 172);
    const winter = daylight(50.25, 355);
    expect(summer.sunset! - summer.sunrise!).toBeGreaterThan(16);
    expect(winter.sunset! - winter.sunrise!).toBeLessThan(8.5);
  });

  it("за полярним колом бувають полярний день і полярна ніч", () => {
    expect(daylight(70, 172).polar).toBe("day");
    expect(daylight(70, 355).polar).toBe("night");
  });
});

describe("formatHour", () => {
  it("форматує години як ГГ:ХХ", () => {
    expect(formatHour(12.5)).toBe("12:30");
    expect(formatHour(6.25)).toBe("06:15");
    expect(formatHour(7.9999)).toBe("08:00");
  });
});
