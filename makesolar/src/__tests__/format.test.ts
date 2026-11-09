import { describe, expect, it } from "vitest";
import { formatCompact, formatNumber, niceTicks } from "../utils/format";

const plain = (s: string) => s.replace(/\s/g, " ");

describe("formatNumber", () => {
  it("використовує український формат", () => {
    expect(plain(formatNumber(1234.5, 1))).toBe("1 234,5");
    expect(formatNumber(3)).toBe("3");
  });
});

describe("formatCompact", () => {
  it("скорочує великі числа", () => {
    expect(plain(formatCompact(25_000))).toBe("25 тис");
    expect(plain(formatCompact(1_500_000))).toBe("1,5 млн");
    expect(plain(formatCompact(9_500))).toBe("9 500");
  });
});

describe("niceTicks", () => {
  it("будує круглі поділки від нуля до значення не менше максимуму", () => {
    expect(niceTicks(7.3, 3)).toEqual([0, 2.5, 5, 7.5]);
    expect(niceTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
  });

  it("для нуля повертає вісь 0–1", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
