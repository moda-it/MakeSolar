import { useEffect, useMemo, useRef, useState } from "react";
import SolarScene from "./scene/SolarScene";
import NumberField from "./components/NumberField";
import type { RoofParams } from "./types/roof";
import type { LayerMode } from "./types/layers";
import { DEFAULT_PANEL, type PlacedPanel } from "./types/panel";
import { computePanelLayout } from "./geometry/panelLayout";
import {
  computeBlocksForPanels,
  blockSpansTwoRibs,
} from "./geometry/blockLayout";
import { DEFAULT_PROFILE, getRibCenters } from "./geometry/roofProfile";
import {
  isInsideRoof,
  type PlacementRules,
  type Pos,
} from "./geometry/placement";

type PanelMode = "auto" | "manual";

const PANEL_GAP = 0.025;     // проміжок між панелями, м
const EDGE_MARGIN = 0.3;     // відступ від країв даху, м
const BLOCK_LENGTH = 0.3;    // довжина блока, м
const MERGE_DISTANCE = 0.06; // край-до-краю, щоб блок став спільним, м
const SNAP_DISTANCE = 0.08;  // радіус дії магніту, м

function App() {
  const [roofWidth, setRoofWidth] = useState(10);
  const [roofLength, setRoofLength] = useState(6);
  const [tilt, setTilt] = useState(30);
  const [layer, setLayer] = useState<LayerMode>("all");
  const [mode, setMode] = useState<PanelMode>("auto");
  const [manualPanels, setManualPanels] = useState<PlacedPanel[]>([]);
  const [placing, setPlacing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const nextId = useRef(1000);

  const roof: RoofParams = { width: roofWidth, length: roofLength, tilt };

  const autoPanels = useMemo<PlacedPanel[]>(() => {
    const result = computePanelLayout({
      roofWidth,
      roofLength,
      panelWidth: DEFAULT_PANEL.width,
      panelHeight: DEFAULT_PANEL.height,
      gap: PANEL_GAP,
      margin: EDGE_MARGIN,
    });
    return result.placements.map((p, i) => ({ id: i, x: p.x, z: p.z }));
  }, [roofWidth, roofLength]);

  const panels = mode === "auto" ? autoPanels : manualPanels;
  const selected = panels.some((p) => p.id === selectedId) ? selectedId : null;

  const ribCenters = useMemo(
    () => getRibCenters(roofWidth, DEFAULT_PROFILE),
    [roofWidth]
  );

  const blocks = useMemo(
    () =>
      computeBlocksForPanels({
        panels,
        panelWidth: DEFAULT_PANEL.width,
        panelHeight: DEFAULT_PANEL.height,
        blockLength: BLOCK_LENGTH,
        endInsetRatio: 0.25,
        edgeOverhang: 0.03,
        ribCenters,
        mergeDistance: MERGE_DISTANCE,
      }),
    [panels, ribCenters]
  );

  const blocksOk = blockSpansTwoRibs(
    BLOCK_LENGTH,
    ribCenters,
    DEFAULT_PROFILE.ribTop
  );

  const rules: PlacementRules = {
    roofWidth,
    roofLength,
    panelWidth: DEFAULT_PANEL.width,
    panelHeight: DEFAULT_PANEL.height,
    gap: PANEL_GAP,
    margin: EDGE_MARGIN,
    snapDistance: SNAP_DISTANCE,
  };

  const powerKw = (panels.length * DEFAULT_PANEL.power) / 1000;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT") return;

      if (e.key === "Escape") {
        setPlacing(false);
        setSelectedId(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected !== null) {
        setManualPanels((prev) => prev.filter((p) => p.id !== selected));
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function changeRoofSize(width: number, length: number) {
    setRoofWidth(width);
    setRoofLength(length);
    const newRules = { ...rules, roofWidth: width, roofLength: length };
    setManualPanels((prev) => prev.filter((p) => isInsideRoof(p, newRules)));
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
    setSelectedId(null);
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
  }

  function deleteSelected() {
    if (selected === null) return;
    setManualPanels((prev) => prev.filter((p) => p.id !== selected));
    setSelectedId(null);
  }

  return (
    <div className="app">
      <h1>MakeSOLAR</h1>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ minWidth: 260 }}>
          <h3>Дах</h3>
          <NumberField label="Ширина" unit="м" value={roofWidth} min={2} max={20} onChange={(v) => changeRoofSize(v, roofLength)} />
          <NumberField label="Довжина схилу" unit="м" value={roofLength} min={2} max={10} onChange={(v) => changeRoofSize(roofWidth, v)} />
          <NumberField label="Нахил" unit="°" value={tilt} min={0} max={90} step={1} onChange={setTilt} />

          <h3>Панелі</h3>
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
          {selected !== null && (
            <p style={{ fontSize: 13 }}>
              Панель вибрано. Delete або Backspace видаляє, Esc знімає вибір.
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

        <div style={{ flex: 1, height: 560 }}>
          <SolarScene
            roof={roof}
            panel={DEFAULT_PANEL}
            panels={panels}
            blocks={blocks}
            blockLength={BLOCK_LENGTH}
            layer={layer}
            placing={placing}
            rules={rules}
            onPlace={placePanel}
            selectedId={selected}
            onSelect={selectPanel}
            onDeselect={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;