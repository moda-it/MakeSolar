import { describe, expect, it } from "vitest";
import { PROJECT_VERSION, parseProject, type ProjectData } from "../project/storage";
import { DEFAULT_PROFILE } from "../geometry/roofProfile";
import { DEFAULT_PRICES } from "../economics/estimate";

const valid: ProjectData = {
  version: PROJECT_VERSION,
  roof: { width: 10, length: 6, tilt: 30, azimuth: 180 },
  profile: DEFAULT_PROFILE,
  sun: { latitude: 50.25, date: "2026-06-21", hour: 12 },
  panel: { presetId: "jinko-435", params: { width: 1.134, height: 1.762, thickness: 0.03, power: 435 }, gapCm: 2.5 },
  margins: { sideCm: 30, ridgeCm: 30, eaveCm: 30 },
  blockLength: 0.3,
  mode: "manual",
  manualPanels: [{ id: 1000, x: 0, z: -2 }],
  obstacles: [{ id: 1, x: 1, z: -3, width: 0.5, depth: 0.5, height: 1 }],
  prices: DEFAULT_PRICES,
};

describe("parseProject", () => {
  it("приймає коректний проєкт після JSON-перетворення", () => {
    expect(parseProject(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it("відкидає файл іншої версії", () => {
    expect(parseProject({ ...valid, version: 99 })).toBeNull();
  });

  it("відкидає пошкоджені дані", () => {
    expect(parseProject({ ...valid, roof: { ...valid.roof, width: "10" } })).toBeNull();
    expect(parseProject({ ...valid, sun: { ...valid.sun, date: "21.06.2026" } })).toBeNull();
    expect(parseProject({ ...valid, manualPanels: [{ id: 1, x: 0 }] })).toBeNull();
    expect(parseProject(null)).toBeNull();
    expect(parseProject("text")).toBeNull();
  });

  it("відкидає нульові та від'ємні розміри", () => {
    expect(parseProject({ ...valid, profile: { ...valid.profile, pitch: 0 } })).toBeNull();
    expect(parseProject({ ...valid, roof: { ...valid.roof, width: -5 } })).toBeNull();
  });
});
