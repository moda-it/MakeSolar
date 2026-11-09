import type { Vec3 } from "../geometry/roofNormal";
import type { Obstacle } from "../types/obstacle";
import type { PanelParams, PlacedPanel } from "../types/panel";
import { sunAngles, sunDirection } from "./sunPosition";
import { worldToRoofLocal } from "./roofFrame";
import { obstacleToBox, panelSamplePoints, shadedFraction } from "./shading";

const DEG = Math.PI / 180;

export const SOLAR_CONSTANT = 1361; // Вт/м², позаатмосферне випромінювання
export const STC_IRRADIANCE = 1000; // Вт/м², стандартні умови вимірювання потужності панелі
export const GROUND_ALBEDO = 0.2;   // відбивна здатність ґрунту
export const DEFAULT_PR = 0.8;      // коефіцієнт продуктивності: інвертор, кабелі, нагрів, пил

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_NAMES = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];

// Типовий місячний виробіток 1 кВт панелей у Житомирі (південь, нахил 35°), кВт·год.
// Орієнтовні значення порядку PVGIS. Вони враховують хмарність, якої немає
// в моделі ясного неба, і використовуються для калібрування (див. WEATHER_FACTORS).
export const ZHYTOMYR_REFERENCE_KWH_PER_KWP = [32, 50, 90, 122, 140, 140, 145, 135, 100, 70, 34, 24];
const REFERENCE = { latitude: 50.25, tilt: 35, azimuth: 180 };

export interface SkyIrradiance {
  dni: number; // пряме нормальне випромінювання, Вт/м²
  dhi: number; // розсіяне на горизонтальну площину, Вт/м²
  ghi: number; // сумарне на горизонтальну площину, Вт/м²
}

// Оптична маса атмосфери за формулою Кастена–Янга
export function airMass(elevationRad: number): number {
  const zenithDeg = 90 - elevationRad / DEG;
  if (zenithDeg >= 90) return Infinity;
  return 1 / (Math.cos(zenithDeg * DEG) + 0.50572 * Math.pow(96.07995 - zenithDeg, -1.6364));
}

// Модель ясного неба Мейнела: DNI = S·0.7^(AM^0.678), розсіяне ≈ 10% прямого
export function clearSky(elevationRad: number): SkyIrradiance {
  if (elevationRad <= 0) return { dni: 0, dhi: 0, ghi: 0 };
  const am = airMass(elevationRad);
  const dni = SOLAR_CONSTANT * Math.pow(0.7, Math.pow(am, 0.678));
  const dhi = 0.1 * dni;
  const ghi = dni * Math.sin(elevationRad) + dhi;
  return { dni, dhi, ghi };
}

// Опромінення похилої площини (модель ізотропного неба Лю–Джордана), Вт/м².
// cosIncidence: косинус кута між Сонцем і нормаллю панелі; unshaded: освітлена частка.
export function planeIrradiance(
  sky: SkyIrradiance,
  cosIncidence: number,
  tiltDeg: number,
  unshaded = 1
): number {
  const cb = Math.cos(tiltDeg * DEG);
  const beam = sky.dni * Math.max(0, cosIncidence) * unshaded;
  const diffuse = (sky.dhi * (1 + cb)) / 2;
  const ground = (sky.ghi * GROUND_ALBEDO * (1 - cb)) / 2;
  return beam + diffuse + ground;
}

export interface EnergyInput {
  latitude: number;
  tilt: number;
  azimuth: number;
  panel: PanelParams;
  panels: PlacedPanel[];
  panelTopY: number;      // висота верхньої поверхні панелей над дахом, м
  obstacles: Obstacle[];
  obstacleBaseY: number;  // звідки ростуть перешкоди, м
  pr?: number;
}

export interface DaySimulation {
  hours: number[];
  powerKw: number[];        // потужність станції в ясний день, кВт
  energyKwh: number;        // виробіток за ясний день
  energyNoShadeKwh: number; // той самий день без перешкод
  panelLoss: number[];      // частка втрат від тіні для кожної панелі, 0..1
}

function prepare(input: EnergyInput) {
  const boxes = input.obstacles.map((o) => obstacleToBox(o, input.obstacleBaseY));
  const points = input.panels.map((p) =>
    panelSamplePoints(p, input.panel.width, input.panel.height, input.panelTopY)
  );
  return { boxes, points };
}

// Симуляція одного ясного дня з кроком stepH годин
export function simulateDay(input: EnergyInput, day: number, stepH = 1 / 6): DaySimulation {
  const pr = input.pr ?? DEFAULT_PR;
  const { boxes, points } = prepare(input);
  const pNomKw = input.panel.power / 1000;
  const n = input.panels.length;

  const hours: number[] = [];
  const powerKw: number[] = [];
  const panelReal = new Array(n).fill(0);
  const panelIdeal = new Array(n).fill(0);
  let energy = 0;
  let energyNoShade = 0;

  const steps = Math.round(24 / stepH);
  for (let k = 0; k <= steps; k++) {
    const h = k * stepH;
    const angles = sunAngles(input.latitude, day, h);
    const sky = clearSky(angles.elevation);
    let total = 0;
    let totalIdeal = 0;

    if (sky.ghi > 0 && n > 0) {
      const local: Vec3 = worldToRoofLocal(sunDirection(angles), input.tilt, input.azimuth);
      const ideal = planeIrradiance(sky, local.y, input.tilt);
      for (let i = 0; i < n; i++) {
        // Сонце за площиною даху: прямого світла немає, тінь нічого не змінює
        const real =
          local.y > 0
            ? planeIrradiance(sky, local.y, input.tilt, 1 - shadedFraction(points[i], local, boxes))
            : ideal;
        const pReal = (pNomKw * real * pr) / STC_IRRADIANCE;
        const pIdeal = (pNomKw * ideal * pr) / STC_IRRADIANCE;
        total += pReal;
        totalIdeal += pIdeal;
        panelReal[i] += pReal;
        panelIdeal[i] += pIdeal;
      }
    }

    // кінці доби враховуємо з вагою ½ (метод трапецій)
    const w = k === 0 || k === steps ? 0.5 : 1;
    energy += total * stepH * w;
    energyNoShade += totalIdeal * stepH * w;
    hours.push(h);
    powerKw.push(total);
  }

  return {
    hours,
    powerKw,
    energyKwh: energy,
    energyNoShadeKwh: energyNoShade,
    panelLoss: panelIdeal.map((ideal, i) => (ideal > 0 ? 1 - panelReal[i] / ideal : 0)),
  };
}

// Енергія ясного дня на 1 кВт панелей без тіні, кВт·год (для калібрування)
function clearDayPerKwp(latitude: number, tilt: number, azimuth: number, day: number, pr: number) {
  let e = 0;
  const stepH = 0.25;
  for (let h = 0; h <= 24; h += stepH) {
    const angles = sunAngles(latitude, day, h);
    const sky = clearSky(angles.elevation);
    if (sky.ghi <= 0) continue;
    const local = worldToRoofLocal(sunDirection(angles), tilt, azimuth);
    e += ((planeIrradiance(sky, local.y, tilt) * pr) / STC_IRRADIANCE) * stepH;
  }
  return e;
}

export function monthMidDay(month: number): number {
  return MONTH_START[month] + 15;
}

// Погодні коефіцієнти: у скільки разів реальний місяць менший за «завжди ясно».
// Обчислюються один раз: типовий виробіток Житомира ÷ модель ясного неба для тих самих умов.
export const WEATHER_FACTORS: number[] = ZHYTOMYR_REFERENCE_KWH_PER_KWP.map((target, m) => {
  const clear =
    clearDayPerKwp(REFERENCE.latitude, REFERENCE.tilt, REFERENCE.azimuth, monthMidDay(m), DEFAULT_PR) *
    MONTH_DAYS[m];
  return clear > 0 ? Math.min(1, target / clear) : 0;
});

export interface MonthResult {
  month: number;
  kwh: number;
  kwhNoShade: number;
}

export interface YearSimulation {
  months: MonthResult[];
  annualKwh: number;
  annualNoShadeKwh: number;
  specificYield: number; // кВт·год на 1 кВт встановленої потужності
}

// Річний виробіток: середній день кожного місяця × кількість днів × погодний коефіцієнт
export function simulateYear(input: EnergyInput): YearSimulation {
  const months: MonthResult[] = [];
  for (let m = 0; m < 12; m++) {
    const d = simulateDay(input, monthMidDay(m), 0.25);
    const k = MONTH_DAYS[m] * WEATHER_FACTORS[m];
    months.push({ month: m, kwh: d.energyKwh * k, kwhNoShade: d.energyNoShadeKwh * k });
  }
  const annualKwh = months.reduce((s, m) => s + m.kwh, 0);
  const annualNoShadeKwh = months.reduce((s, m) => s + m.kwhNoShade, 0);
  const kwp = (input.panels.length * input.panel.power) / 1000;
  return { months, annualKwh, annualNoShadeKwh, specificYield: kwp > 0 ? annualKwh / kwp : 0 };
}
