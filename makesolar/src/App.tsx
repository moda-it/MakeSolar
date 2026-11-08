import { useEffect, useMemo, useRef, useState } from "react";
import SolarScene from "./scene/SolarScene";
import NumberField from "./components/NumberField";
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
import { computeSunState, formatHour } from "./solar/sunPosition";
import { clamp } from "./utils/math";

type PanelMode = "auto" | "manual";

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
  const [roofWidth, setRoofWidth] = useState(10);
  const [roofLength, setRoofLength] = useState(6);
  const [tilt, setTilt] = useState(30);
  const [azimuth, setAzimuth] = useState(180);
  const [layer, setLayer] = useState<LayerMode>("all");
  const [profile, setProfile] = useState<ProfileParams>(DEFAULT_PROFILE);

  const [latitude, setLatitude] = useState(50);
  const [dateIso, setDateIso] = useState("2026-06-21");
  const [solarHour, setSolarHour] = useState(12);

  const [panelParams, setPanelParams] = useState<PanelParams>(PANEL_PRESETS[0].params);
  const [presetId, setPresetId] = useState(PANEL_PRESETS[0].id);
  const [gapCm, setGapCm] = useState(2.5);
  const [sideCm, setSideCm] = useState(30);
  const [ridgeCm, setRidgeCm] = useState(30);
  const [eaveCm, setEaveCm] = useState(30);
  const [blockLength, setBlockLength] = useState<number>(0.3);

  const [mode, setMode] = useState<PanelMode>("auto");
  const [manualPanels, setManualPanels] = useState<PlacedPanel[]>([]);
  const [placing, setPlacing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [selectedObstacleId, setSelectedObstacleId] = useState<number | null>(null);
  const [obstacleDrag, setObstacleDrag] = useState<ObstacleDragState | null>(null);

  const [selectedBlock, setSelectedBlock] = useState<Pos | null>(null);

  const nextId = useRef(1000);
  const nextObstacleId = useRef(1);

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT") return;

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

  return (
    <div className="app">
      <h1>MakeSOLAR</h1>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ minWidth: 290 }}>
          <h3>Дах</h3>
          <NumberField label="Ширина" unit="м" value={roofWidth} min={2} max={20} onChange={(v) => changeRoofSize(v, roofLength)} />
          <NumberField label="Довжина схилу" unit="м" value={roofLength} min={2} max={10} onChange={(v) => changeRoofSize(roofWidth, v)} />
          <NumberField label="Нахил" unit="°" value={tilt} min={0} max={90} step={1} onChange={setTilt} />
          <NumberField label="Орієнтація скату (азимут)" unit="°" value={azimuth} min={0} max={360} step={5} onChange={setAzimuth} />
          <div style={{ marginBottom: 8 }}>
            <button onClick={() => setAzimuth(0)}>Пн</button>{" "}
            <button onClick={() => setAzimuth(90)}>Сх</button>{" "}
            <button onClick={() => setAzimuth(180)}>Пд</button>{" "}
            <button onClick={() => setAzimuth(270)}>Зх</button>
          </div>
          <p style={{ fontSize: 13 }}>
            Скат дивиться на: <b>{compassName(azimuth)}</b> (бік карниза)
          </p>

          <h3>Сонце</h3>
          <NumberField label="Широта" unit="°" value={latitude} min={-85} max={85} step={0.5} onChange={setLatitude} />
          <label style={{ display: "block", marginBottom: 8 }}>
            Дата:{" "}
            <input
              type="date"
              value={dateIso}
              onChange={(e) => {
                if (e.target.value) setDateIso(e.target.value);
              }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            Сонячний час: <b>{formatHour(solarHour)}</b>
            <input
              type="range"
              min={0}
              max={24}
              step={0.05}
              value={solarHour}
              onChange={(e) => setSolarHour(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>
          <p style={{ fontSize: 13 }}>
            Висота Сонця: <b>{sun.elevationDeg.toFixed(1)}°</b>
            <br />
            Азимут: <b>{sun.azimuthDeg.toFixed(1)}°</b> ({compassName(sun.azimuthDeg)})
            <br />
            {dl.sunrise !== null && dl.sunset !== null ? (
              <>
                Схід ≈ {formatHour(dl.sunrise)}, захід ≈ {formatHour(dl.sunset)}
                <br />
                День триває {formatHour(dl.sunset - dl.sunrise)}
              </>
            ) : dl.polar === "night" ? (
              <>Полярна ніч: Сонце не сходить</>
            ) : (
              <>Полярний день: Сонце не заходить</>
            )}
          </p>

          <h3>Відступи панелей від країв</h3>
          <NumberField label="Біля карниза" unit="см" value={eaveCm} min={0} max={200} step={5} onChange={(v) => changeMargin(setEaveCm, v)} />
          <NumberField label="Біля коника" unit="см" value={ridgeCm} min={0} max={200} step={5} onChange={(v) => changeMargin(setRidgeCm, v)} />
          <NumberField label="По боках" unit="см" value={sideCm} min={0} max={200} step={5} onChange={(v) => changeMargin(setSideCm, v)} />

          <h3>Профіль листа</h3>
          <NumberField label="Крок хвилі" unit="мм" value={toMm(profile.pitch)} min={pitchMinMm} max={400} step={1} onChange={(v) => setProfile({ ...profile, pitch: v / 1000 })} />
          <NumberField label="Висота ребра" unit="мм" value={toMm(profile.height)} min={5} max={60} step={1} onChange={(v) => setProfile({ ...profile, height: v / 1000 })} />
          <NumberField label="Ширина верхівки" unit="мм" value={toMm(profile.ribTop)} min={10} max={Math.max(10, ribTopMaxMm)} step={1} onChange={(v) => setProfile({ ...profile, ribTop: v / 1000 })} />
          <NumberField label="Розбіг скосу" unit="мм" value={toMm(profile.ribSlope)} min={5} max={Math.max(5, slopeMaxMm)} step={1} onChange={(v) => setProfile({ ...profile, ribSlope: v / 1000 })} />
          <NumberField label="Товщина листа" unit="мм" value={toMm(profile.thickness)} min={2} max={30} step={1} onChange={(v) => setProfile({ ...profile, thickness: v / 1000 })} />
          <button onClick={() => setProfile(DEFAULT_PROFILE)}>Стандартний профіль</button>

          <h3>Перешкоди</h3>
          <button onClick={addObstacle}>Додати перешкоду</button>
          {selectedObstacle && (
            <div style={{ marginTop: 8 }}>
              <NumberField label="Ширина" unit="м" value={selectedObstacle.width} min={0.1} max={roofWidth} step={0.05} onChange={(v) => updateObstacle(selectedObstacle.id, { width: v })} />
              <NumberField label="Глибина" unit="м" value={selectedObstacle.depth} min={0.1} max={roofLength} step={0.05} onChange={(v) => updateObstacle(selectedObstacle.id, { depth: v })} />
              <NumberField label="Висота" unit="м" value={selectedObstacle.height} min={0.1} max={5} step={0.05} onChange={(v) => updateObstacle(selectedObstacle.id, { height: v })} />
              <button onClick={() => deleteObstacle(selectedObstacle.id)}>
                Видалити перешкоду
              </button>
              <p style={{ fontSize: 13 }}>
                Затисни вибрану перешкоду й тягни мишею. Лінії показують відстані: блакитні до країв даху, жовті до сусідніх об'єктів. Delete видаляє.
              </p>
            </div>
          )}
          <p style={{ fontSize: 13 }}>
            Перешкод: {obstacles.length}. Панелі не ставляться ближче ніж на {Math.round(OBSTACLE_CLEARANCE * 100)} см до перешкоди.
          </p>

          <h3>Тип панелі</h3>
          <select value={presetId} onChange={(e) => selectPreset(e.target.value)}>
            <option value="custom">Власні розміри</option>
            {PANEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 8 }}>
            <NumberField label="Ширина (поперек хвилі)" unit="м" value={panelParams.width} min={0.3} max={3} step={0.01} onChange={(v) => changePanel({ ...panelParams, width: v }, "custom")} />
            <NumberField label="Висота (уздовж хвилі)" unit="м" value={panelParams.height} min={0.3} max={3} step={0.01} onChange={(v) => changePanel({ ...panelParams, height: v }, "custom")} />
            <NumberField label="Потужність" unit="Вт" value={panelParams.power} min={50} max={800} step={5} onChange={(v) => setPanelParams({ ...panelParams, power: v })} />
            <NumberField label="Проміжок між панелями" unit="см" value={gapCm} min={1} max={10} step={0.5} onChange={changeGap} />
          </div>

          <h3>Блок кріплення</h3>
          <select value={blockLength} onChange={(e) => setBlockLength(Number(e.target.value))}>
            {BLOCK_LENGTHS.map((l) => (
              <option key={l} value={l}>
                {Math.round(l * 100)} см
              </option>
            ))}
          </select>
          <p style={{ fontSize: 13 }}>
            Щоб виміряти блок, увімкни шар «Дах + блочки» і клікни на нього.
          </p>

          <h3>Панелі на даху</h3>
          <button onClick={fillAuto}>Максимум панелей</button>{" "}
          <button onClick={clearPanels}>Очистити</button>
          <div style={{ marginTop: 8 }}>
            <button onClick={placing ? () => setPlacing(false) : startPlacing}>
              {placing ? "Завершити додавання" : "Додати панель"}
            </button>{" "}
            <button onClick={undoLast} disabled={mode !== "manual" || manualPanels.length === 0}>
              Скасувати останню
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={deleteSelected} disabled={selected === null}>
              Видалити вибрану
            </button>
          </div>
          {placing && (
            <p style={{ fontSize: 13 }}>
              Клік по даху ставить панель (зелена можна, червона ні). Esc виходить.
            </p>
          )}
          {selected !== null && !placing && (
            <p style={{ fontSize: 13 }}>
              Панель вибрано: затисни її й тягни, щоб перемістити. Delete видаляє, Esc знімає вибір.
            </p>
          )}

          <h3>Шари</h3>
          <select value={layer} onChange={(e) => setLayer(e.target.value as LayerMode)}>
            <option value="roof">Дах</option>
            <option value="roofBlocks">Дах + блочки</option>
            <option value="all">Дах + блочки + панелі</option>
          </select>

          <p>
            Режим: {mode === "auto" ? "авто" : "вручну"}
            <br />
            Панелей: {panels.length}, блоків: {blocks.length}
            <br />
            Потужність: {powerKw.toFixed(1)} кВт
          </p>
          {!blocksOk && (
            <p style={{ color: "crimson" }}>
              Блок закороткий: він не лягає на 2 хвилі профілю
            </p>
          )}
        </div>

        <div style={{ flex: 1, height: 600 }}>
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;