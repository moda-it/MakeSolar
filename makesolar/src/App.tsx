import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import SolarScene from "./scene/SolarScene";
import NumberField from "./components/NumberField";
import Segmented from "./components/Segmented";
import Icon from "./components/Icon";
import type { RoofParams } from "./types/roof";
import type { LayerMode } from "./types/layers";
import type { Obstacle, ObstacleDragState } from "./types/obstacle";
import {
  type DragState,
  type PanelParams,
  type PlacedPanel,
} from "./types/panel";
import { PANEL_PRESETS } from "./data/panelPresets";
import { computePanelLayout } from "./geometry/panelLayout";
import {
  computeBlocksForPanels,
  blockSpansTwoRibs,
} from "./geometry/blockLayout";
import { BLOCK_LENGTHS } from "./geometry/blockProfile";
import {
  DEFAULT_PROFILE,
  PROFILE_MIN_VALLEY,
  getRibCenters,
  type ProfileParams,
} from "./geometry/roofProfile";
import {
  hitsObstacle,
  isInsideRoof,
  type Margins,
  type PlacementRules,
  type Pos,
} from "./geometry/placement";
import { compassName } from "./geometry/compass";
import { computeSunState, dayOfYear, formatHour } from "./solar/sunPosition";
import { profileTopY } from "./geometry/roofProfile";
import { DEFAULT_BLOCK_PROFILE } from "./geometry/blockProfile";
import { simulateDay, simulateYear, type EnergyInput } from "./solar/energy";
import {
  DEFAULT_PRICES,
  buildEstimate,
  computePayback,
  type Prices,
} from "./economics/estimate";
import {
  PROJECT_VERSION,
  downloadProject,
  loadAutosave,
  readProjectFile,
  saveAutosave,
  type ProjectData,
} from "./project/storage";
import { DayChart, MonthChart, PaybackChart } from "./components/charts";
import { formatNumber } from "./utils/format";
import Report from "./components/Report";
import { clamp } from "./utils/math";

type PanelMode = "auto" | "manual";
type Tab = "roof" | "panels" | "sun" | "obstacles";
type ResultsTab = "energy" | "cost";

// Проєкт, збережений у браузері минулого разу
const SAVED = loadAutosave();
const NARROW_SCREEN = typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
const maxId = (items: { id: number }[], fallback: number) =>
  items.reduce((m, i) => Math.max(m, i.id + 1), fallback);

const MERGE_DISTANCE = 0.06;      // край-до-краю, щоб блок став спільним, м
const SNAP_DISTANCE = 0.08;       // радіус дії магніту, м
const OBSTACLE_CLEARANCE = 0.3;   // зона безпеки навколо перешкоди, м

const toMm = (m: number) => Math.round(m * 1000 * 10) / 10;
const floorMm = (m: number) => Math.floor(m * 1000 + 1e-6);
const ceilMm = (m: number) => Math.ceil(m * 1000 - 1e-6);

function fitObstacle(o: Obstacle, width: number, length: number): Obstacle {
  const maxX = Math.max(0, width / 2 - o.width / 2);
  return {
    ...o,
    x: clamp(o.x, -maxX, maxX),
    z: clamp(o.z, -length + o.depth / 2, -o.depth / 2),
  };
}

function App() {
  const [roofWidth, setRoofWidth] = useState(SAVED?.roof.width ?? 10);
  const [roofLength, setRoofLength] = useState(SAVED?.roof.length ?? 6);
  const [tilt, setTilt] = useState(SAVED?.roof.tilt ?? 30);
  const [azimuth, setAzimuth] = useState(SAVED?.roof.azimuth ?? 180);
  const [layer, setLayer] = useState<LayerMode>("all");
  const [tab, setTab] = useState<Tab>("roof");
  const [profile, setProfile] = useState<ProfileParams>(SAVED?.profile ?? DEFAULT_PROFILE);

  const [latitude, setLatitude] = useState(SAVED?.sun.latitude ?? 50.25);
  const [dateIso, setDateIso] = useState(SAVED?.sun.date ?? "2026-06-21");
  const [solarHour, setSolarHour] = useState(SAVED?.sun.hour ?? 12);

  const [panelParams, setPanelParams] = useState<PanelParams>(SAVED?.panel.params ?? PANEL_PRESETS[0].params);
  const [presetId, setPresetId] = useState(SAVED?.panel.presetId ?? PANEL_PRESETS[0].id);
  const [gapCm, setGapCm] = useState(SAVED?.panel.gapCm ?? 2.5);
  const [sideCm, setSideCm] = useState(SAVED?.margins.sideCm ?? 30);
  const [ridgeCm, setRidgeCm] = useState(SAVED?.margins.ridgeCm ?? 30);
  const [eaveCm, setEaveCm] = useState(SAVED?.margins.eaveCm ?? 30);
  const [blockLength, setBlockLength] = useState<number>(SAVED?.blockLength ?? 0.3);

  const [mode, setMode] = useState<PanelMode>(SAVED?.mode ?? "auto");
  const [manualPanels, setManualPanels] = useState<PlacedPanel[]>(SAVED?.manualPanels ?? []);
  const [placing, setPlacing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const [obstacles, setObstacles] = useState<Obstacle[]>(SAVED?.obstacles ?? []);
  const [selectedObstacleId, setSelectedObstacleId] = useState<number | null>(null);
  const [obstacleDrag, setObstacleDrag] = useState<ObstacleDragState | null>(null);

  const [selectedBlock, setSelectedBlock] = useState<Pos | null>(null);

  const [prices, setPrices] = useState<Prices>(SAVED?.prices ?? DEFAULT_PRICES);
  // На вузькому екрані панелі стартують згорнутими, щоб було видно сцену
  const [resultsOpen, setResultsOpen] = useState(!NARROW_SCREEN);
  const [sidebarOpen, setSidebarOpen] = useState(!NARROW_SCREEN);
  const [chromeHidden, setChromeHidden] = useState(false); // усі меню сховано
  const [resultsTab, setResultsTab] = useState<ResultsTab>("energy");
  const [showShade, setShowShade] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [printJob, setPrintJob] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const nextId = useRef(maxId(SAVED?.manualPanels ?? [], 1000));
  const nextObstacleId = useRef(maxId(SAVED?.obstacles ?? [], 1));

  const panelGap = gapCm / 100;
  const roof: RoofParams = { width: roofWidth, length: roofLength, tilt, azimuth };

  const sun = useMemo(
    () => computeSunState(latitude, dateIso, solarHour),
    [latitude, dateIso, solarHour]
  );
  const dl = sun.daylight;

  const margins = useMemo<Margins>(
    () => ({ side: sideCm / 100, ridge: ridgeCm / 100, eave: eaveCm / 100 }),
    [sideCm, ridgeCm, eaveCm]
  );

  const rules = useMemo<PlacementRules>(
    () => ({
      roofWidth,
      roofLength,
      panelWidth: panelParams.width,
      panelHeight: panelParams.height,
      gap: panelGap,
      margins,
      snapDistance: SNAP_DISTANCE,
      obstacles,
      obstacleClearance: OBSTACLE_CLEARANCE,
    }),
    [roofWidth, roofLength, panelParams.width, panelParams.height, panelGap, margins, obstacles]
  );

  const autoPanels = useMemo<PlacedPanel[]>(() => {
    const result = computePanelLayout({
      roofWidth: rules.roofWidth,
      roofLength: rules.roofLength,
      panelWidth: rules.panelWidth,
      panelHeight: rules.panelHeight,
      gap: rules.gap,
      margins: rules.margins,
    });
    return result.placements
      .filter((p) => !hitsObstacle(p, rules))
      .map((p, i) => ({ id: i, x: p.x, z: p.z }));
  }, [rules]);

  const panels = mode === "auto" ? autoPanels : manualPanels;
  const selected = panels.some((p) => p.id === selectedId) ? selectedId : null;
  const selectedObstacle =
    obstacles.find((o) => o.id === selectedObstacleId) ?? null;

  const panelsForBlocks = useMemo(
    () => (drag ? panels.filter((p) => p.id !== drag.id) : panels),
    [panels, drag]
  );

  const ribCenters = useMemo(
    () => getRibCenters(roofWidth, profile),
    [roofWidth, profile]
  );

  const blocks = useMemo(
    () =>
      computeBlocksForPanels({
        panels: panelsForBlocks,
        panelWidth: panelParams.width,
        panelHeight: panelParams.height,
        blockLength,
        endInsetRatio: 0.25,
        edgeOverhang: 0.03,
        ribCenters,
        mergeDistance: MERGE_DISTANCE,
      }),
    [panelsForBlocks, panelParams.width, panelParams.height, blockLength, ribCenters]
  );

  const blocksOk = blockSpansTwoRibs(blockLength, ribCenters, profile.ribTop);

  const powerKw = (panels.length * panelParams.power) / 1000;

  const pitchMinMm = Math.max(80, ceilMm(profile.ribTop + 2 * profile.ribSlope + PROFILE_MIN_VALLEY));
  const ribTopMaxMm = floorMm(profile.pitch - 2 * profile.ribSlope - PROFILE_MIN_VALLEY);
  const slopeMaxMm = floorMm((profile.pitch - profile.ribTop - PROFILE_MIN_VALLEY) / 2);

  // ───────── Енергія, кошторис, окупність ─────────
  const obstacleBaseY = profileTopY(profile);
  const panelTopY = obstacleBaseY + DEFAULT_BLOCK_PROFILE.height + panelParams.thickness;

  const energyInput = useMemo<EnergyInput>(
    () => ({ latitude, tilt, azimuth, panel: panelParams, panels, panelTopY, obstacles, obstacleBaseY }),
    [latitude, tilt, azimuth, panelParams, panels, panelTopY, obstacles, obstacleBaseY]
  );
  const day = dayOfYear(dateIso);
  const daySim = useMemo(() => simulateDay(energyInput, day), [energyInput, day]);
  const year = useMemo(() => simulateYear(energyInput), [energyInput]);
  const shadeLoss = year.annualNoShadeKwh > 0 ? 1 - year.annualKwh / year.annualNoShadeKwh : 0;

  const panelShade = useMemo(() => {
    if (!showShade) return undefined;
    return new Map(panels.map((p, i) => [p.id, daySim.panelLoss[i] ?? 0]));
  }, [showShade, panels, daySim]);

  const presetLabel =
    PANEL_PRESETS.find((p) => p.id === presetId)?.label ??
    `${Math.round(panelParams.width * 1000)}×${Math.round(panelParams.height * 1000)} мм, ${panelParams.power} Вт`;

  const estimate = useMemo(
    () => buildEstimate({ panelLabel: presetLabel, panelCount: panels.length, blockCount: blocks.length, prices }),
    [presetLabel, panels.length, blocks.length, prices]
  );
  const payback = useMemo(
    () => computePayback(estimate.total, year.annualKwh, prices.tariff),
    [estimate.total, year.annualKwh, prices.tariff]
  );

  // ───────── Збереження проєкту ─────────
  const project = useMemo<ProjectData>(
    () => ({
      version: PROJECT_VERSION,
      roof: { width: roofWidth, length: roofLength, tilt, azimuth },
      profile,
      sun: { latitude, date: dateIso, hour: solarHour },
      panel: { presetId, params: panelParams, gapCm },
      margins: { sideCm, ridgeCm, eaveCm },
      blockLength,
      mode,
      manualPanels,
      obstacles,
      prices,
    }),
    [roofWidth, roofLength, tilt, azimuth, profile, latitude, dateIso, solarHour, presetId, panelParams,
      gapCm, sideCm, ridgeCm, eaveCm, blockLength, mode, manualPanels, obstacles, prices]
  );

  useEffect(() => {
    const t = setTimeout(() => saveAutosave(project), 500);
    return () => clearTimeout(t);
  }, [project]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (printJob === 0) return;
    // друкуємо після того, як знімок сцени потрапив у звіт
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [printJob]);

  function applyProject(p: ProjectData) {
    setRoofWidth(p.roof.width);
    setRoofLength(p.roof.length);
    setTilt(p.roof.tilt);
    setAzimuth(p.roof.azimuth);
    setProfile(p.profile);
    setLatitude(p.sun.latitude);
    setDateIso(p.sun.date);
    setSolarHour(p.sun.hour);
    setPresetId(p.panel.presetId);
    setPanelParams(p.panel.params);
    setGapCm(p.panel.gapCm);
    setSideCm(p.margins.sideCm);
    setRidgeCm(p.margins.ridgeCm);
    setEaveCm(p.margins.eaveCm);
    setBlockLength(p.blockLength);
    setMode(p.mode);
    setManualPanels(p.manualPanels);
    setObstacles(p.obstacles);
    setPrices(p.prices);
    nextId.current = maxId(p.manualPanels, 1000);
    nextObstacleId.current = maxId(p.obstacles, 1);
    setPlacing(false);
    setDrag(null);
    setObstacleDrag(null);
    setSelectedId(null);
    setSelectedObstacleId(null);
    setSelectedBlock(null);
  }

  async function openProjectFile(file: File | undefined) {
    if (!file) return;
    const p = await readProjectFile(file);
    if (p) {
      applyProject(p);
      setNotice(`Проєкт «${file.name}» відкрито`);
    } else {
      setNotice("Цей файл не схожий на проєкт MakeSolar");
    }
  }

  function printReport() {
    const canvas = document.querySelector<HTMLCanvasElement>(".stage canvas");
    try {
      setSnapshot(canvas ? canvas.toDataURL("image/png") : null);
    } catch {
      setSnapshot(null);
    }
    setPrintJob((n) => n + 1);
  }

  const updatePrice = (key: keyof Prices) => (v: number) => setPrices((p) => ({ ...p, [key]: v }));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") {
        setPlacing(false);
        setSelectedId(null);
        setSelectedObstacleId(null);
        setSelectedBlock(null);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selected !== null) {
          setManualPanels((prev) => prev.filter((p) => p.id !== selected));
          setSelectedId(null);
        } else if (selectedObstacleId !== null) {
          applyObstacles(obstacles.filter((o) => o.id !== selectedObstacleId));
          setSelectedObstacleId(null);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, selectedObstacleId, obstacles, rules]);

  function resetPanels() {
    setMode("auto");
    setManualPanels([]);
    setPlacing(false);
    setSelectedId(null);
    setDrag(null);
  }

  function changePanel(next: PanelParams, preset: string) {
    setPanelParams(next);
    setPresetId(preset);
    resetPanels();
  }

  function selectPreset(id: string) {
    if (id === "custom") {
      setPresetId("custom");
      return;
    }
    const preset = PANEL_PRESETS.find((p) => p.id === id);
    if (preset) changePanel(preset.params, preset.id);
  }

  function changeGap(value: number) {
    setGapCm(value);
    resetPanels();
  }

  function changeMargin(setter: (v: number) => void, value: number) {
    setter(value);
    resetPanels();
  }

  function changeRoofSize(width: number, length: number) {
    setRoofWidth(width);
    setRoofLength(length);
    const fitted = obstacles.map((o) => fitObstacle(o, width, length));
    setObstacles(fitted);
    const newRules: PlacementRules = {
      ...rules,
      roofWidth: width,
      roofLength: length,
      obstacles: fitted,
    };
    setManualPanels((prev) =>
      prev.filter((p) => isInsideRoof(p, newRules) && !hitsObstacle(p, newRules))
    );
  }

  function applyObstacles(next: Obstacle[]) {
    setObstacles(next);
    const nextRules: PlacementRules = { ...rules, obstacles: next };
    setManualPanels((prev) => prev.filter((p) => !hitsObstacle(p, nextRules)));
  }

  function addObstacle() {
    const id = nextObstacleId.current++;
    const created = fitObstacle(
      { id, x: 0, z: -roofLength / 2, width: 0.5, depth: 0.5, height: 1 },
      roofWidth,
      roofLength
    );
    applyObstacles([...obstacles, created]);
    setTab("obstacles");
    setSelectedObstacleId(id);
    setSelectedId(null);
    setSelectedBlock(null);
    setPlacing(false);
  }

  function updateObstacle(id: number, patch: Partial<Obstacle>) {
    applyObstacles(
      obstacles.map((o) =>
        o.id === id ? fitObstacle({ ...o, ...patch }, roofWidth, roofLength) : o
      )
    );
  }

  function deleteObstacle(id: number) {
    applyObstacles(obstacles.filter((o) => o.id !== id));
    setSelectedObstacleId(null);
  }

  function selectObstacle(id: number) {
    setTab("obstacles");
    setSelectedObstacleId(id);
    setSelectedId(null);
    setSelectedBlock(null);
  }

  function startObstacleDrag(id: number, grab: { x: number; y: number; z: number }) {
    setObstacleDrag({ id, grab });
  }

  function dropObstacle(pos: Pos) {
    if (!obstacleDrag) return;
    updateObstacle(obstacleDrag.id, { x: pos.x, z: pos.z });
    setObstacleDrag(null);
  }

  function cancelObstacleDrag() {
    setObstacleDrag(null);
  }

  function selectBlock(b: Pos) {
    setSelectedBlock(b);
    setSelectedId(null);
    setSelectedObstacleId(null);
  }

  function deselectAll() {
    setSelectedId(null);
    setSelectedObstacleId(null);
    setSelectedBlock(null);
  }

  function fillAuto() {
    setMode("auto");
    setPlacing(false);
    setSelectedId(null);
  }

  function clearPanels() {
    setManualPanels([]);
    setMode("manual");
    setSelectedId(null);
  }

  function startPlacing() {
    if (mode === "auto") setManualPanels(autoPanels);
    setMode("manual");
    setLayer("all");
    deselectAll();
    setPlacing(true);
  }

  function placePanel(pos: Pos) {
    const id = nextId.current++;
    setManualPanels((prev) => [...prev, { id, x: pos.x, z: pos.z }]);
  }

  function undoLast() {
    setManualPanels((prev) => prev.slice(0, -1));
  }

  function selectPanel(id: number) {
    if (mode === "auto") {
      setManualPanels(autoPanels);
      setMode("manual");
    }
    setSelectedId(id);
    setSelectedObstacleId(null);
    setSelectedBlock(null);
  }

  function deleteSelected() {
    if (selected === null) return;
    setManualPanels((prev) => prev.filter((p) => p.id !== selected));
    setSelectedId(null);
  }

  function startDrag(id: number, grab: Pos) {
    const p = panels.find((q) => q.id === id);
    if (!p) return;
    setDrag({ id, grab, start: { x: p.x, z: p.z } });
  }

  function dropDrag(pos: Pos) {
    if (!drag) return;
    const id = drag.id;
    setManualPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x: pos.x, z: pos.z } : p))
    );
    setDrag(null);
  }

  function cancelDrag() {
    setDrag(null);
  }

  const hint = placing
    ? "Клік по даху ставить панель: зелена означає можна, червона ні. Esc завершує."
    : selected !== null
      ? "Затисни панель і тягни, щоб перемістити. Delete видаляє, Esc знімає вибір."
      : selectedObstacle
        ? "Тягни перешкоду мишею. Блакитні лінії показують відстань до країв, жовті до сусідів."
        : selectedBlock
          ? "Блок виміряно. Esc знімає вибір."
          : null;

  const sunriseAt = dl.sunrise !== null ? (dl.sunrise / 24) * 100 : dl.polar === "day" ? 0 : 50;
  const sunsetAt = dl.sunset !== null ? (dl.sunset / 24) * 100 : dl.polar === "day" ? 100 : 50;

  return (
    <div
      className="app"
      data-results={resultsOpen ? "open" : "closed"}
      data-sidebar={sidebarOpen ? "open" : "closed"}
      data-chrome={chromeHidden ? "hidden" : "shown"}
    >
      <div className="stage">
        <SolarScene
          roof={roof}
          profile={profile}
          sun={sun}
          panel={panelParams}
          panels={panels}
          blocks={blocks}
          blockLength={blockLength}
          layer={layer}
          placing={placing}
          rules={rules}
          onPlace={placePanel}
          selectedId={selected}
          onSelect={selectPanel}
          onDeselect={deselectAll}
          drag={drag}
          onDragStart={startDrag}
          onDrop={dropDrag}
          onCancelDrag={cancelDrag}
          obstacles={obstacles}
          selectedObstacleId={selectedObstacleId}
          onSelectObstacle={selectObstacle}
          obstacleDrag={obstacleDrag}
          onObstacleDragStart={startObstacleDrag}
          onObstacleDrop={dropObstacle}
          onObstacleCancelDrag={cancelObstacleDrag}
          selectedBlock={selectedBlock}
          onSelectBlock={selectBlock}
          panelShade={panelShade}
        />
      </div>

      <aside className="sidebar glass" data-open={sidebarOpen || undefined} inert={chromeHidden} aria-label="Параметри">
        <header className="sidebar-head">
          <div className="brand-row">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              Make<b>Solar</b>
            </div>
            <div className="file-actions">
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => downloadProject(project)} title="Зберегти проєкт у файл" aria-label="Зберегти проєкт у файл">
                <Icon name="download" />
              </button>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => fileInput.current?.click()} title="Відкрити проєкт з файлу" aria-label="Відкрити проєкт з файлу">
                <Icon name="upload" />
              </button>
              <button type="button" className="btn btn-icon btn-ghost" onClick={printReport} title="Звіт PDF: друк або «Зберегти як PDF»" aria-label="Звіт PDF">
                <Icon name="print" />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  void openProjectFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => setChromeHidden(true)}
                title="Сховати всі меню"
                aria-label="Сховати всі меню"
              >
                <Icon name="hide" />
              </button>
              <button
                type="button"
                className="btn btn-icon btn-ghost panel-toggle"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((o) => !o)}
                title={sidebarOpen ? "Згорнути параметри" : "Показати параметри"}
                aria-label={sidebarOpen ? "Згорнути параметри" : "Показати параметри"}
              >
                <Icon name="chevron" />
              </button>
            </div>
          </div>
          {sidebarOpen && (
            <Segmented
              label="Розділ"
              value={tab}
              onChange={setTab}
              options={[
                { value: "roof", label: "Дах" },
                { value: "panels", label: "Панелі" },
                { value: "sun", label: "Сонце" },
                { value: "obstacles", label: "Перешкоди" },
              ]}
            />
          )}
        </header>

        {sidebarOpen && (
        <div className="sidebar-body">
          {tab === "roof" && (
            <>
              <section className="group">
                <h2 className="group-title">Розміри</h2>
                <NumberField label="Ширина" unit="м" value={roofWidth} min={2} max={20} onChange={(v) => changeRoofSize(v, roofLength)} />
                <NumberField label="Довжина схилу" unit="м" value={roofLength} min={2} max={10} onChange={(v) => changeRoofSize(roofWidth, v)} />
                <NumberField label="Нахил" unit="°" value={tilt} min={0} max={90} step={1} onChange={setTilt} />
              </section>

              <section className="group">
                <h2 className="group-title">Орієнтація</h2>
                <NumberField label="Азимут скату" unit="°" value={azimuth} min={0} max={360} step={5} onChange={setAzimuth} />
                <Segmented
                  label="Сторона світу"
                  value={[0, 90, 180, 270].includes(azimuth) ? azimuth : null}
                  onChange={setAzimuth}
                  options={[
                    { value: 0, label: "Пн", title: "Північ, 0°" },
                    { value: 90, label: "Сх", title: "Схід, 90°" },
                    { value: 180, label: "Пд", title: "Південь, 180°" },
                    { value: 270, label: "Зх", title: "Захід, 270°" },
                  ]}
                />
                <p className="note">
                  Карниз дивиться на <b>{compassName(azimuth)}</b>
                </p>
              </section>

              <details className="group disclosure">
                <summary className="group-title">Профіль листа</summary>
                <NumberField label="Крок хвилі" unit="мм" value={toMm(profile.pitch)} min={pitchMinMm} max={400} step={1} onChange={(v) => setProfile({ ...profile, pitch: v / 1000 })} />
                <NumberField label="Висота ребра" unit="мм" value={toMm(profile.height)} min={5} max={60} step={1} onChange={(v) => setProfile({ ...profile, height: v / 1000 })} />
                <NumberField label="Ширина верхівки" unit="мм" value={toMm(profile.ribTop)} min={10} max={Math.max(10, ribTopMaxMm)} step={1} onChange={(v) => setProfile({ ...profile, ribTop: v / 1000 })} />
                <NumberField label="Розбіг скосу" unit="мм" value={toMm(profile.ribSlope)} min={5} max={Math.max(5, slopeMaxMm)} step={1} onChange={(v) => setProfile({ ...profile, ribSlope: v / 1000 })} />
                <NumberField label="Товщина листа" unit="мм" value={toMm(profile.thickness)} min={2} max={30} step={1} onChange={(v) => setProfile({ ...profile, thickness: v / 1000 })} />
                <button type="button" className="btn btn-ghost btn-block" onClick={() => setProfile(DEFAULT_PROFILE)}>
                  Повернути стандартний профіль
                </button>
              </details>
            </>
          )}

          {tab === "panels" && (
            <>
              <section className="group">
                <h2 className="group-title">Модель</h2>
                <select className="select" value={presetId} onChange={(e) => selectPreset(e.target.value)} aria-label="Модель панелі">
                  <option value="custom">Власні розміри</option>
                  {PANEL_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <NumberField label="Ширина, поперек хвилі" unit="м" value={panelParams.width} min={0.3} max={3} step={0.01} onChange={(v) => changePanel({ ...panelParams, width: v }, "custom")} />
                <NumberField label="Висота, уздовж хвилі" unit="м" value={panelParams.height} min={0.3} max={3} step={0.01} onChange={(v) => changePanel({ ...panelParams, height: v }, "custom")} />
                <NumberField label="Потужність" unit="Вт" value={panelParams.power} min={50} max={800} step={5} onChange={(v) => setPanelParams({ ...panelParams, power: v })} />
                <NumberField label="Проміжок між панелями" unit="см" value={gapCm} min={1} max={10} step={0.5} onChange={changeGap} />
              </section>

              <section className="group">
                <h2 className="group-title">Відступи від країв</h2>
                <NumberField label="Біля карниза" unit="см" value={eaveCm} min={0} max={200} step={5} onChange={(v) => changeMargin(setEaveCm, v)} />
                <NumberField label="Біля коника" unit="см" value={ridgeCm} min={0} max={200} step={5} onChange={(v) => changeMargin(setRidgeCm, v)} />
                <NumberField label="По боках" unit="см" value={sideCm} min={0} max={200} step={5} onChange={(v) => changeMargin(setSideCm, v)} />
              </section>

              <section className="group">
                <h2 className="group-title">Блок кріплення</h2>
                <Segmented
                  label="Довжина блока"
                  value={blockLength}
                  onChange={setBlockLength}
                  options={BLOCK_LENGTHS.map((l) => ({ value: l, label: `${Math.round(l * 100)} см` }))}
                />
                {!blocksOk && (
                  <p className="note note-warn">
                    <Icon name="warn" size={14} /> Блок закороткий: він не лягає на 2 хвилі профілю
                  </p>
                )}
                <p className="note">Щоб виміряти блок, увімкни шар «Блоки» і клікни на нього.</p>
              </section>
            </>
          )}

          {tab === "sun" && (
            <>
              <section className="group">
                <h2 className="group-title">Місце і дата</h2>
                <NumberField label="Широта" unit="°" value={latitude} min={-85} max={85} step={0.5} onChange={setLatitude} />
                <label className="field">
                  <span className="field-label">Дата</span>
                  <span className="field-control">
                    <input
                      className="field-input field-input-date"
                      type="date"
                      value={dateIso}
                      onChange={(e) => {
                        if (e.target.value) setDateIso(e.target.value);
                      }}
                    />
                  </span>
                </label>
              </section>

              <section className="group">
                <div className="group-row">
                  <h2 className="group-title">Сонячний час</h2>
                  <span className="time-readout">{formatHour(solarHour)}</span>
                </div>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={24}
                  step={0.05}
                  value={solarHour}
                  aria-label="Сонячний час"
                  onChange={(e) => setSolarHour(Number(e.target.value))}
                  style={
                    {
                      "--day-from": `${sunriseAt}%`,
                      "--day-to": `${sunsetAt}%`,
                    } as CSSProperties
                  }
                />
                <div className="range-scale" aria-hidden="true">
                  <span>0:00</span>
                  <span>12:00</span>
                  <span>24:00</span>
                </div>
              </section>

              <section className="group">
                <dl className="facts">
                  <div>
                    <dt>Висота</dt>
                    <dd>{sun.elevationDeg.toFixed(1)}°</dd>
                  </div>
                  <div>
                    <dt>Азимут</dt>
                    <dd>
                      {sun.azimuthDeg.toFixed(1)}° <small>{compassName(sun.azimuthDeg)}</small>
                    </dd>
                  </div>
                  {dl.sunrise !== null && dl.sunset !== null ? (
                    <>
                      <div>
                        <dt>Схід</dt>
                        <dd>{formatHour(dl.sunrise)}</dd>
                      </div>
                      <div>
                        <dt>Захід</dt>
                        <dd>{formatHour(dl.sunset)}</dd>
                      </div>
                      <div className="facts-wide">
                        <dt>Тривалість дня</dt>
                        <dd>{formatHour(dl.sunset - dl.sunrise)}</dd>
                      </div>
                    </>
                  ) : (
                    <div className="facts-wide">
                      <dt>{dl.polar === "night" ? "Полярна ніч" : "Полярний день"}</dt>
                      <dd>{dl.polar === "night" ? "Сонце не сходить" : "Сонце не заходить"}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </>
          )}

          {tab === "obstacles" && (
            <>
              <section className="group">
                <button type="button" className="btn btn-primary btn-block" onClick={addObstacle}>
                  <Icon name="plus" /> Додати перешкоду
                </button>
                <p className="note">
                  {obstacles.length === 0
                    ? "Перешкод поки немає. Додай димар, вентвихід чи мансардне вікно."
                    : `Перешкод на даху: ${obstacles.length}.`}{" "}
                  Панелі не ставляться ближче ніж на {Math.round(OBSTACLE_CLEARANCE * 100)} см до них.
                </p>
              </section>

              {obstacles.length > 0 && (
                <section className="group">
                  <h2 className="group-title">Список</h2>
                  <ul className="list">
                    {obstacles.map((o, i) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          className="list-item"
                          aria-current={o.id === selectedObstacleId || undefined}
                          onClick={() => selectObstacle(o.id)}
                        >
                          <Icon name="box" />
                          <span>Перешкода {i + 1}</span>
                          <small>
                            {o.width}×{o.depth}×{o.height} м
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedObstacle && (
                <section className="group" key={selectedObstacle.id}>
                  <h2 className="group-title">Вибрана перешкода</h2>
                  <NumberField label="Ширина" unit="м" value={selectedObstacle.width} min={0.1} max={roofWidth} step={0.05} onChange={(v) => updateObstacle(selectedObstacle.id, { width: v })} />
                  <NumberField label="Глибина" unit="м" value={selectedObstacle.depth} min={0.1} max={roofLength} step={0.05} onChange={(v) => updateObstacle(selectedObstacle.id, { depth: v })} />
                  <NumberField label="Висота" unit="м" value={selectedObstacle.height} min={0.1} max={5} step={0.05} onChange={(v) => updateObstacle(selectedObstacle.id, { height: v })} />
                  <button type="button" className="btn btn-danger btn-block" onClick={() => deleteObstacle(selectedObstacle.id)}>
                    <Icon name="trash" /> Видалити перешкоду
                  </button>
                </section>
              )}
            </>
          )}
        </div>
        )}
      </aside>

      <aside className="results glass" data-open={resultsOpen || undefined} inert={chromeHidden} aria-label="Результати">
        <header className="results-head">
          <div className="stats-power">
            <span className="stats-value">{powerKw.toFixed(1)}</span>
            <span className="stats-unit">кВт</span>
            <button
              type="button"
              className="btn btn-icon btn-ghost results-toggle panel-toggle"
              aria-expanded={resultsOpen}
              aria-label={resultsOpen ? "Згорнути результати" : "Показати результати"}
              title={resultsOpen ? "Згорнути результати" : "Показати результати"}
              onClick={() => setResultsOpen((o) => !o)}
            >
              <Icon name="chevron" />
            </button>
          </div>
          <dl className="stats-meta">
            <div>
              <dt>Панелей</dt>
              <dd>{panels.length}</dd>
            </div>
            <div>
              <dt>За рік</dt>
              <dd>{formatNumber(year.annualKwh)} кВт·год</dd>
            </div>
            <div>
              <dt>Окупність</dt>
              <dd>{payback.paybackYears !== null ? `${formatNumber(payback.paybackYears, 1)} р.` : "—"}</dd>
            </div>
          </dl>
          {!blocksOk && (
            <p className="stats-warn">
              <Icon name="warn" size={14} /> Блок закороткий
            </p>
          )}
          {resultsOpen && (
            <Segmented
              label="Результати"
              value={resultsTab}
              onChange={setResultsTab}
              options={[
                { value: "energy", label: "Енергія" },
                { value: "cost", label: "Кошторис" },
              ]}
            />
          )}
        </header>

        {resultsOpen && (
          <div className="sidebar-body">
            {resultsTab === "energy" && (
              <>
                <section className="group">
                  <dl className="facts">
                    <div>
                      <dt>Виробіток за рік</dt>
                      <dd>{formatNumber(year.annualKwh)} <small>кВт·год</small></dd>
                    </div>
                    <div>
                      <dt>На 1 кВт панелей</dt>
                      <dd>{formatNumber(year.specificYield)} <small>кВт·год</small></dd>
                    </div>
                    <div>
                      <dt>Ясний день {dateIso.slice(8, 10)}.{dateIso.slice(5, 7)}</dt>
                      <dd>{formatNumber(daySim.energyKwh, 1)} <small>кВт·год</small></dd>
                    </div>
                    <div>
                      <dt>Втрати від тіні</dt>
                      <dd>{formatNumber(shadeLoss * 100, 1)}<small>%</small></dd>
                    </div>
                  </dl>
                </section>

                <section className="group">
                  <h2 className="group-title">Потужність у ясний день, кВт</h2>
                  <DayChart hours={daySim.hours} powerKw={daySim.powerKw} currentHour={solarHour} />
                  <label className="switch">
                    <input type="checkbox" checked={showShade} onChange={(e) => setShowShade(e.target.checked)} />
                    <span>Підсвітити панелі, які затінюються цього дня</span>
                  </label>
                  {showShade && (
                    <div className="shade-legend" aria-hidden="true">
                      <span>без тіні</span>
                      <i />
                      <span>30% і більше</span>
                    </div>
                  )}
                </section>

                <section className="group">
                  <h2 className="group-title">Виробіток по місяцях, кВт·год</h2>
                  <MonthChart values={year.months.map((m) => m.kwh)} />
                </section>
              </>
            )}

            {resultsTab === "cost" && (
              <>
                <section className="group">
                  <table className="bom">
                    <tbody>
                      {estimate.lines.map((l) => (
                        <tr key={l.name}>
                          <th>
                            {l.name}
                            <small>
                              {formatNumber(l.qty, l.unit === "кВт" ? 2 : 0)} {l.unit} × {formatNumber(l.price)} грн
                            </small>
                          </th>
                          <td>{formatNumber(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Разом, грн</th>
                        <td>{formatNumber(estimate.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </section>

                <section className="group">
                  <div className="group-row">
                    <h2 className="group-title">Окупність</h2>
                    <span className="time-readout">
                      {payback.paybackYears !== null ? `${formatNumber(payback.paybackYears, 1)} р.` : "понад 25 р."}
                    </span>
                  </div>
                  <PaybackChart points={payback.points} cost={estimate.total} paybackYears={payback.paybackYears} />
                  <p className="note">
                    Економія за 25 років: <b>{formatNumber(payback.lifetimeSavings)} грн</b>
                  </p>
                </section>

                <section className="group">
                  <h2 className="group-title">Ціни</h2>
                  <NumberField label="Панель" unit="грн" value={prices.panel} min={0} max={100000} step={50} onChange={updatePrice("panel")} />
                  <NumberField label="Блок кріплення" unit="грн" value={prices.block} min={0} max={10000} step={5} onChange={updatePrice("block")} />
                  <NumberField label="Тариф за кВт·год" unit="грн" value={prices.tariff} min={0} max={50} step={0.01} onChange={updatePrice("tariff")} />
                  <button type="button" className="btn btn-ghost btn-block" onClick={() => setPrices(DEFAULT_PRICES)}>
                    Скинути ціни
                  </button>
                </section>
              </>
            )}
          </div>
        )}
      </aside>

      <Report
        snapshot={snapshot}
        createdAt={new Date().toLocaleDateString("uk-UA")}
        rows={[
          ["Дах", `${roofWidth} × ${roofLength} м, нахил ${tilt}°, азимут ${azimuth}° (${compassName(azimuth)})`],
          ["Місце", `широта ${latitude}°`],
          ["Панель", presetLabel],
          ["Розміщення", `${panels.length} шт (${mode === "auto" ? "автоматично" : "вручну"}), проміжок ${gapCm} см`],
          ["Відступи", `карниз ${eaveCm} см, коник ${ridgeCm} см, боки ${sideCm} см`],
          ["Кріплення", `${blocks.length} блоків по ${Math.round(blockLength * 100)} см`],
          ["Перешкоди", obstacles.length ? obstacles.map((o) => `${o.width}×${o.depth}×${o.height} м`).join("; ") : "немає"],
        ]}
        kwp={powerKw}
        panelCount={panels.length}
        year={year}
        estimate={estimate}
        payback={payback}
        prices={prices}
      />

      <div className="dock">
        {(notice ?? hint) && (
          <p className="hint glass" key={notice ?? hint ?? ""} role="status">
            {notice ?? hint}
          </p>
        )}
        <div className="toolbar glass" role="toolbar" aria-label="Дії з панелями">
          {chromeHidden && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setChromeHidden(false)}
                title="Показати меню"
                aria-label="Показати меню"
              >
                <Icon name="menu" /> <span className="btn-text">Меню</span>
              </button>
              <span className="toolbar-sep" aria-hidden="true" />
            </>
          )}
          <Segmented
            label="Шари"
            value={layer}
            onChange={setLayer}
            options={[
              { value: "roof", label: "Дах", title: "Тільки дах" },
              { value: "roofBlocks", label: "Блоки", title: "Дах і блоки кріплення" },
              { value: "all", label: "Усе", title: "Дах, блоки й панелі" },
            ]}
          />
          <span className="toolbar-sep" aria-hidden="true" />
          <button type="button" className="btn" onClick={fillAuto} title="Заповнити дах максимальною кількістю панелей">
            <Icon name="grid" /> <span className="btn-text">Максимум</span>
          </button>
          <button
            type="button"
            className={placing ? "btn btn-primary" : "btn"}
            aria-pressed={placing}
            onClick={placing ? () => setPlacing(false) : startPlacing}
          >
            <Icon name={placing ? "check" : "plus"} />{" "}
            <span className="btn-text">{placing ? "Готово" : "Додати"}</span>
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={undoLast}
            disabled={mode !== "manual" || manualPanels.length === 0}
            title="Скасувати останню панель"
            aria-label="Скасувати останню панель"
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={deleteSelected}
            disabled={selected === null}
            title="Видалити вибрану панель (Delete)"
            aria-label="Видалити вибрану панель"
          >
            <Icon name="trash" />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={clearPanels}
            disabled={panels.length === 0}
            title="Прибрати всі панелі"
            aria-label="Прибрати всі панелі"
          >
            <Icon name="clear" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
