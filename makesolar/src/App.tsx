import { useState } from "react";
import SolarScene from "./scene/SolarScene";
import type { RoofParams } from "./types/roof";
import { computePanelLayout } from "./geometry/panelLayout";
import { computeBlockLayout, blockSpansTwoRibs } from "./geometry/blockLayout";
import { DEFAULT_PROFILE, getRibCenters } from "./geometry/roofProfile";
import { DEFAULT_PANEL } from "./types/panel";

const PANEL_WIDTH = DEFAULT_PANEL.width;   // вздовж карниза (X), м
const PANEL_HEIGHT = DEFAULT_PANEL.height;  // вздовж схилу (Z), м
const PANEL_GAP = 0.025;   // проміжок між панелями, м
const EDGE_MARGIN = 0.3;   // відступ від країв даху, м
const BLOCK_LENGTH = 0.3;  // довжина блока, м

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function App() {
  const [tilt, setTilt] = useState(30);

  const roof: RoofParams = { width: 10, length: 6, tilt };

  const layout = computePanelLayout({
    roofWidth: roof.width,
    roofLength: roof.length,
    panelWidth: PANEL_WIDTH,
    panelHeight: PANEL_HEIGHT,
    gap: PANEL_GAP,
    margin: EDGE_MARGIN,
  });

  const ribCenters = getRibCenters(roof.width, DEFAULT_PROFILE);

  const blocks = computeBlockLayout({
    ribCenters,
    layout,
    panelWidth: PANEL_WIDTH,
    panelHeight: PANEL_HEIGHT,
    blockLength: BLOCK_LENGTH,
    endInsetRatio: 0.25,
    edgeOverhang: 0.03,
  });

  const blocksOk = blockSpansTwoRibs(
  BLOCK_LENGTH,
  ribCenters,
  DEFAULT_PROFILE.ribTop
);

  return (
    <div className="app">
      <h1>MakeSOLAR</h1>
      <label>
        Нахил даху (°):{" "}
        <input
          type="number"
          min={0}
          max={90}
          value={tilt}
          onChange={(e) => setTilt(clamp(Number(e.target.value), 0, 90))}
        />
      </label>
      <p>
        Панелей: {layout.total}, блоків: {blocks.length}
      </p>
      
      {!blocksOk && (
  <p style={{ color: "crimson" }}>
    Блок закороткий: він не лягає на 2 хвилі профілю
  </p>
)}

      <div style={{ height: 500 }}>
        <SolarScene
  roof={roof}
  panel={DEFAULT_PANEL}
  panels={layout.placements}
  blocks={blocks}
  blockLength={BLOCK_LENGTH}
/>
      </div>
    </div>
  );
}

export default App;