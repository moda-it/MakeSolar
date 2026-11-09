import type { ProfileParams } from "../geometry/roofProfile";
import type { Prices } from "../economics/estimate";
import type { Obstacle } from "../types/obstacle";
import type { PanelParams, PlacedPanel } from "../types/panel";

export const PROJECT_VERSION = 1;
const AUTOSAVE_KEY = "makesolar.project";

// Усе, що потрібно, щоб відновити проєкт
export interface ProjectData {
  version: number;
  roof: { width: number; length: number; tilt: number; azimuth: number };
  profile: ProfileParams;
  sun: { latitude: number; date: string; hour: number };
  panel: { presetId: string; params: PanelParams; gapCm: number };
  margins: { sideCm: number; ridgeCm: number; eaveCm: number };
  blockLength: number;
  mode: "auto" | "manual";
  manualPanels: PlacedPanel[];
  obstacles: Obstacle[];
  prices: Prices;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function allNums(o: unknown, keys: string[]): boolean {
  return isObj(o) && keys.every((k) => isNum(o[k]));
}

function allPositive(o: unknown, keys: string[]): boolean {
  return isObj(o) && keys.every((k) => isNum(o[k]) && o[k] > 0);
}

// Перевіряє структуру завантаженого JSON. Повертає null, якщо файл не схожий на проєкт.
export function parseProject(raw: unknown): ProjectData | null {
  if (!isObj(raw) || raw.version !== PROJECT_VERSION) return null;
  const p = raw as unknown as ProjectData;
  const ok =
    allNums(p.roof, ["tilt", "azimuth"]) && allPositive(p.roof, ["width", "length"]) &&
    allPositive(p.profile, ["pitch", "height", "ribTop", "ribSlope", "thickness"]) &&
    isObj(p.sun) && isNum(p.sun.latitude) && isNum(p.sun.hour) &&
    typeof p.sun.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.sun.date) &&
    isObj(p.panel) && typeof p.panel.presetId === "string" && isNum(p.panel.gapCm) &&
    allPositive(p.panel.params, ["width", "height", "thickness", "power"]) &&
    allNums(p.margins, ["sideCm", "ridgeCm", "eaveCm"]) &&
    isNum(p.blockLength) && p.blockLength > 0 &&
    (p.mode === "auto" || p.mode === "manual") &&
    Array.isArray(p.manualPanels) && p.manualPanels.every((q) => allNums(q, ["id", "x", "z"])) &&
    Array.isArray(p.obstacles) &&
    p.obstacles.every((o) => allNums(o, ["id", "x", "z"]) && allPositive(o, ["width", "depth", "height"])) &&
    allNums(p.prices, ["panel", "block", "tariff"]);
  if (!ok) return null;
  // лишаємо тільки поточні поля цін (старі файли могли містити більше)
  return { ...p, prices: { panel: p.prices.panel, block: p.prices.block, tariff: p.prices.tariff } };
}

export function loadAutosave(): ProjectData | null {
  try {
    const text = localStorage.getItem(AUTOSAVE_KEY);
    return text ? parseProject(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

export function saveAutosave(data: ProjectData): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch {
    // сховище недоступне (приватний режим тощо): просто не зберігаємо
  }
}

export function downloadProject(data: ProjectData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `makesolar-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProjectFile(file: File): Promise<ProjectData | null> {
  try {
    return parseProject(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}
